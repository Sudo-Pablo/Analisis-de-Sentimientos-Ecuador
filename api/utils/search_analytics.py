"""
Registro y consulta de búsquedas populares / hot topics / snapshots cacheados.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import func

from api.config import load_database_config
from api.utils.category_classifier import classify_with_dictionary, normalize_category_name
from src.database.db_manager import DatabaseManager
from src.database.models import SearchEvent, SearchSnapshot

logger = logging.getLogger(__name__)

_TABLE_READY = False


def _get_db() -> DatabaseManager:
    return DatabaseManager(load_database_config())


def ensure_search_events_table(db: Optional[DatabaseManager] = None) -> None:
    global _TABLE_READY
    if _TABLE_READY:
        return
    manager = db or _get_db()
    try:
        SearchEvent.__table__.create(bind=manager.engine, checkfirst=True)
        SearchSnapshot.__table__.create(bind=manager.engine, checkfirst=True)
        _TABLE_READY = True
    except Exception as exc:
        logger.error("No se pudo asegurar tablas de búsqueda: %s", exc, exc_info=True)
        raise


def normalize_keyword(keyword: str) -> str:
    return " ".join((keyword or "").strip().lower().split())


def record_search_event(
    keyword: str,
    *,
    source: str = "unified",
    category: Optional[str] = None,
) -> bool:
    """Persiste un evento de búsqueda. Falla en silencio para no bloquear el flujo principal."""
    cleaned = (keyword or "").strip()
    if len(cleaned) < 2:
        return False

    try:
        db = _get_db()
        ensure_search_events_table(db)
        keyword_norm = normalize_keyword(cleaned)
        resolved_category = normalize_category_name(
            category or classify_with_dictionary(cleaned) or "Social"
        )

        with db.get_session() as session:
            session.add(
                SearchEvent(
                    keyword=cleaned[:200],
                    keyword_norm=keyword_norm[:200],
                    category=(resolved_category or None),
                    source=(source or "unified")[:30],
                    created_at=datetime.now(),
                )
            )
            session.commit()
        return True
    except Exception as exc:
        logger.error("Error registrando search_event: %s", exc, exc_info=True)
        return False


def save_search_snapshot(
    keyword: str,
    payload: Dict[str, Any],
    *,
    source: str = "unified",
) -> bool:
    """Guarda o actualiza el snapshot de resultados para una keyword."""
    cleaned = (keyword or "").strip()
    if len(cleaned) < 2 or not isinstance(payload, dict):
        return False

    try:
        db = _get_db()
        ensure_search_events_table(db)
        keyword_norm = normalize_keyword(cleaned)
        payload_json = json.dumps(payload, ensure_ascii=False, default=str)

        with db.get_session() as session:
            existing = (
                session.query(SearchSnapshot)
                .filter_by(keyword_norm=keyword_norm[:200])
                .first()
            )
            now = datetime.now()
            if existing:
                existing.keyword = cleaned[:200]
                existing.source = (source or "unified")[:30]
                existing.payload = payload_json
                existing.updated_at = now
            else:
                session.add(
                    SearchSnapshot(
                        keyword=cleaned[:200],
                        keyword_norm=keyword_norm[:200],
                        source=(source or "unified")[:30],
                        payload=payload_json,
                        created_at=now,
                        updated_at=now,
                    )
                )
            session.commit()
        return True
    except Exception as exc:
        logger.error("Error guardando search_snapshot: %s", exc, exc_info=True)
        return False


def get_search_snapshot(keyword: str) -> Optional[Dict[str, Any]]:
    """Recupera el snapshot cacheado para una keyword, o None."""
    cleaned = (keyword or "").strip()
    if len(cleaned) < 2:
        return None

    try:
        db = _get_db()
        ensure_search_events_table(db)
        keyword_norm = normalize_keyword(cleaned)

        with db.get_session() as session:
            row = (
                session.query(SearchSnapshot)
                .filter_by(keyword_norm=keyword_norm[:200])
                .first()
            )
            if not row:
                return None

            try:
                payload = json.loads(row.payload or "{}")
            except json.JSONDecodeError:
                logger.error("Snapshot corrupto para keyword_norm=%s", keyword_norm)
                return None

            if not isinstance(payload, dict):
                return None

            return {
                "keyword": row.keyword,
                "source": row.source,
                "from_cache": True,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "facebook": payload.get("facebook"),
                "tiktok": payload.get("tiktok"),
                "facebook_error": payload.get("facebook_error"),
                "tiktok_error": payload.get("tiktok_error"),
            }
    except Exception as exc:
        logger.error("Error leyendo search_snapshot: %s", exc, exc_info=True)
        return None


def get_popular_searches(days: Optional[int] = None, limit: int = 8) -> List[Dict]:
    """Búsquedas más frecuentes. days=None o <=0 → histórico completo."""
    db = _get_db()
    ensure_search_events_table(db)

    with db.get_session() as session:
        query = session.query(
            SearchEvent.keyword_norm,
            func.count(SearchEvent.id).label("count"),
            func.max(SearchEvent.keyword).label("keyword"),
            func.max(SearchEvent.created_at).label("last_searched_at"),
        )
        if days is not None and days > 0:
            cutoff = datetime.now() - timedelta(days=days)
            query = query.filter(SearchEvent.created_at >= cutoff)

        rows = (
            query.group_by(SearchEvent.keyword_norm)
            .order_by(func.count(SearchEvent.id).desc(), func.max(SearchEvent.created_at).desc())
            .limit(max(1, min(limit, 30)))
            .all()
        )

        norms = [row.keyword_norm for row in rows]
        snapshot_norms = set()
        if norms:
            snapshot_norms = {
                n
                for (n,) in session.query(SearchSnapshot.keyword_norm)
                .filter(SearchSnapshot.keyword_norm.in_(norms))
                .all()
            }

    return [
        {
            "keyword": row.keyword,
            "count": int(row.count),
            "last_searched_at": row.last_searched_at.isoformat() if row.last_searched_at else None,
            "has_snapshot": row.keyword_norm in snapshot_norms,
        }
        for row in rows
    ]


def get_hot_topics(days: Optional[int] = None, limit: int = 6) -> List[Dict]:
    """
    Ranking de categorías por comentarios analizados en la BD (mismo criterio que «Por tema»).
    days se ignora para este ranking histórico total; se mantiene por compatibilidad de API.
    """
    from src.database.models import Topic, Post, Comment

    db = _get_db()
    ensure_search_events_table(db)

    with db.get_session() as session:
        rows = (
            session.query(
                Topic.id,
                Topic.name,
                func.count(Comment.id).label("count"),
            )
            .join(Post, Post.topic_id == Topic.id)
            .join(Comment, Comment.post_id == Post.id)
            .group_by(Topic.id, Topic.name)
            .having(func.count(Comment.id) > 0)
            .order_by(func.count(Comment.id).desc(), Topic.name.asc())
            .limit(max(1, min(limit, 20)))
            .all()
        )

    total = sum(int(row.count) for row in rows) or 1

    return [
        {
            "category": row.name,
            "count": int(row.count),
            "share_pct": round((int(row.count) / total) * 100, 1),
            "topic_id": row.id,
            "rank": index + 1,
        }
        for index, row in enumerate(rows)
    ]
