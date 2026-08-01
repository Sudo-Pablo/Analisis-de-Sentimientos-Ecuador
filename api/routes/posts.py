"""
Router para consulta de posts históricos en la base de datos.
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

sys.path.append(str(Path(__file__).parent.parent.parent))

from api.config import load_database_config
from api.schemas import HistoricalPostItem, PostsByCategoryResponse
from api.utils.category_classifier import CATEGORY_LABELS
from src.database.db_manager import DatabaseManager

logger = logging.getLogger(__name__)
router = APIRouter()

try:
    db_config = load_database_config()
except Exception as exc:
    logger.error("Error al cargar configuración de BD: %s", exc)
    db_config = None


def _serialize_post(post) -> HistoricalPostItem:
    return HistoricalPostItem(
        id=post.id,
        post_id=post.post_id,
        platform=post.platform or "facebook",
        category=post.category,
        text=post.text,
        author_name=post.author_name,
        post_url=post.post_url,
        post_time=post.post_time,
        collected_at=post.collected_at,
        likes=post.likes or 0,
        comments_count=post.comments_count or 0,
        shares=post.shares or 0,
    )


@router.get("/by-category", response_model=PostsByCategoryResponse)
async def get_posts_by_category(
    category: str = Query(..., description="Categoría de contenido (Politica, Economia, etc.)"),
    platform: Optional[str] = Query(None, description="Filtrar por plataforma: facebook | tiktok"),
    limit: int = Query(8, ge=1, le=50),
    offset: int = Query(0, ge=0),
    exclude_post_ids: Optional[str] = Query(
        None,
        description="IDs de posts a excluir, separados por coma",
    ),
):
    """
    Obtener posts guardados previamente que coincidan con una categoría.
    """
    try:
        if not db_config:
            raise HTTPException(status_code=500, detail="Configuración de BD no disponible")

        resolved = (category or "").strip()
        if not resolved:
            raise HTTPException(status_code=400, detail="La categoría es requerida")

        if resolved not in CATEGORY_LABELS:
            raise HTTPException(
                status_code=400,
                detail=f"Categoría inválida. Valores permitidos: {', '.join(CATEGORY_LABELS)}",
            )

        if platform and platform.lower() not in {"facebook", "tiktok"}:
            raise HTTPException(status_code=400, detail="Plataforma inválida. Use facebook o tiktok")

        excluded: List[str] = []
        if exclude_post_ids:
            excluded = [item.strip() for item in exclude_post_ids.split(",") if item.strip()]

        db = DatabaseManager(db_config)
        posts, total = db.get_posts_by_category(
            resolved,
            platform=platform,
            limit=limit,
            offset=offset,
            exclude_post_ids=excluded or None,
        )

        return PostsByCategoryResponse(
            category=resolved,
            total=total,
            limit=limit,
            offset=offset,
            posts=[_serialize_post(post) for post in posts],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error al obtener posts por categoría: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
