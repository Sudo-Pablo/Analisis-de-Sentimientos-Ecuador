"""
Recolección automática por categorías (Facebook + TikTok) con persistencia en BD.

Usado por:
- POST /api/internal/scheduled-collection (Render Cron / disparo manual)
- scripts/scrapers/run_scheduled_realtime_collection.py (CLI local o Cron Job)
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
CONFIG_PATH = PROJECT_ROOT / "config" / "scheduled_collection.json"

DEFAULT_CATEGORIES = [
    "Politica",
    "Economia",
    "Salud",
    "Seguridad",
    "Educacion",
    "Social",
]


def _ensure_env_loaded() -> None:
    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()


def load_scheduled_config() -> Dict[str, Any]:
    """Carga config/scheduled_collection.json con defaults seguros."""
    defaults: Dict[str, Any] = {
        "platforms": ["facebook", "tiktok"],
        "max_posts": 5,
        "max_comments": 5,
        "keywords_per_category": 1,
        "facebook_method": "ppr",
        "facebook_dual_search": False,
    }
    categories = {name: [f"{name.lower()} ecuador"] for name in DEFAULT_CATEGORIES}

    if not CONFIG_PATH.exists():
        logger.warning("No se encontró %s; usando defaults embebidos", CONFIG_PATH)
        return {"defaults": defaults, "categories": categories}

    with CONFIG_PATH.open(encoding="utf-8") as fh:
        data = json.load(fh)

    merged_defaults = {**defaults, **(data.get("defaults") or {})}
    file_categories = data.get("categories") or {}
    merged_categories = {
        name: list(file_categories.get(name) or categories.get(name) or [f"{name.lower()} ecuador"])
        for name in DEFAULT_CATEGORIES
    }
    return {"defaults": merged_defaults, "categories": merged_categories}


def rotation_index() -> int:
    """Índice estable por ventana de 3 horas (rota keywords entre corridas)."""
    now = datetime.now()
    return (now.timetuple().tm_yday * 8) + (now.hour // 3)


def pick_keywords(keywords: List[str], count: int, seed: int) -> List[str]:
    if not keywords or count <= 0:
        return []
    start = seed % len(keywords)
    selected: List[str] = []
    for offset in range(min(count, len(keywords))):
        selected.append(keywords[(start + offset) % len(keywords)])
    return selected


def _run_facebook(
    keyword: str,
    categoria: str,
    *,
    max_posts: int,
    max_comments: int,
    method: str,
    dual_search: bool,
) -> Dict[str, Any]:
    from api.routes.facebook_search import FacebookSearchRequest, execute_facebook_search

    req = FacebookSearchRequest(
        keyword=keyword,
        categoria=categoria,
        method=method if method in ("ppr", "apify") else "ppr",
        max_posts=max_posts,
        max_comments_per_post=max_comments,
        dual_search=dual_search,
        search_id=None,
    )
    resp = execute_facebook_search(req, persist=True)
    return {
        "platform": "facebook",
        "categoria": categoria,
        "keyword": keyword,
        "method": resp.method,
        "posts": resp.posts_found,
        "comments": resp.comments_analyzed,
        "saved_to_db": resp.saved_to_db,
        "seconds": resp.search_time_seconds,
        "ok": True,
    }


def _run_tiktok(
    keyword: str,
    categoria: str,
    *,
    max_posts: int,
    max_comments: int,
) -> Dict[str, Any]:
    from api.routes.tiktok_search import TikTokSearchRequest, build_tiktok_search, persist_tiktok_results

    req = TikTokSearchRequest(
        keyword=keyword,
        categoria=categoria,
        max_videos=max_posts,
        max_comments_per_video=max_comments,
        search_id=None,
    )
    built = build_tiktok_search(req)
    saved = False
    if built.videos_raw:
        saved = persist_tiktok_results(
            keyword,
            categoria,
            built.videos_raw,
            built.comments_raw,
            built.response.comments,
        )

    return {
        "platform": "tiktok",
        "categoria": categoria,
        "keyword": keyword,
        "posts": built.response.videos_found,
        "comments": built.response.comments_analyzed,
        "saved_to_db": saved,
        "seconds": built.response.search_time_seconds,
        "ok": True,
    }


def run_scheduled_collection(
    *,
    platforms: Optional[List[str]] = None,
    categories: Optional[List[str]] = None,
    max_posts: Optional[int] = None,
    max_comments: Optional[int] = None,
    keywords_per_category: Optional[int] = None,
    facebook_method: Optional[str] = None,
    facebook_dual_search: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    Ejecuta búsquedas automáticas por categoría y persiste resultados.

    Returns:
        Resumen con totales y detalle por búsqueda.
    """
    _ensure_env_loaded()

    if not os.getenv("APIFY_TOKEN"):
        raise RuntimeError("APIFY_TOKEN no configurado. Define la variable de entorno antes de correr el job.")

    config = load_scheduled_config()
    defaults = config["defaults"]
    category_keywords: Dict[str, List[str]] = config["categories"]

    platforms = [p.lower() for p in (platforms or defaults["platforms"])]
    categories = categories or list(DEFAULT_CATEGORIES)
    max_posts = int(max_posts if max_posts is not None else defaults["max_posts"])
    max_comments = int(max_comments if max_comments is not None else defaults["max_comments"])
    keywords_per_category = int(
        keywords_per_category if keywords_per_category is not None else defaults["keywords_per_category"]
    )
    facebook_method = facebook_method or defaults.get("facebook_method", "ppr")
    if facebook_dual_search is None:
        facebook_dual_search = bool(defaults.get("facebook_dual_search", False))

    seed = rotation_index()
    started = datetime.now()
    results: List[Dict[str, Any]] = []
    errors = 0

    logger.info(
        "Inicio recolección programada platforms=%s categories=%s max_posts=%s max_comments=%s kws=%s seed=%s",
        platforms,
        categories,
        max_posts,
        max_comments,
        keywords_per_category,
        seed,
    )

    for categoria in categories:
        if categoria not in category_keywords:
            logger.warning("Categoría desconocida omitida: %s", categoria)
            continue

        keywords = pick_keywords(category_keywords[categoria], keywords_per_category, seed)
        for keyword in keywords:
            if "tiktok" in platforms:
                try:
                    logger.info("[TikTok] %s → '%s'", categoria, keyword)
                    results.append(
                        _run_tiktok(
                            keyword,
                            categoria,
                            max_posts=max_posts,
                            max_comments=max_comments,
                        )
                    )
                except Exception as exc:
                    errors += 1
                    logger.error("[TikTok] Error %s/'%s': %s", categoria, keyword, exc, exc_info=True)
                    results.append(
                        {
                            "platform": "tiktok",
                            "categoria": categoria,
                            "keyword": keyword,
                            "ok": False,
                            "error": str(exc),
                        }
                    )

            if "facebook" in platforms:
                try:
                    logger.info("[Facebook] %s → '%s'", categoria, keyword)
                    results.append(
                        _run_facebook(
                            keyword,
                            categoria,
                            max_posts=max_posts,
                            max_comments=max_comments,
                            method=facebook_method,
                            dual_search=facebook_dual_search,
                        )
                    )
                except Exception as exc:
                    errors += 1
                    logger.error("[Facebook] Error %s/'%s': %s", categoria, keyword, exc, exc_info=True)
                    results.append(
                        {
                            "platform": "facebook",
                            "categoria": categoria,
                            "keyword": keyword,
                            "ok": False,
                            "error": str(exc),
                        }
                    )

    elapsed = (datetime.now() - started).total_seconds()
    totals = {
        "facebook_posts": sum(r.get("posts", 0) for r in results if r.get("platform") == "facebook" and r.get("ok")),
        "facebook_comments": sum(
            r.get("comments", 0) for r in results if r.get("platform") == "facebook" and r.get("ok")
        ),
        "tiktok_videos": sum(r.get("posts", 0) for r in results if r.get("platform") == "tiktok" and r.get("ok")),
        "tiktok_comments": sum(
            r.get("comments", 0) for r in results if r.get("platform") == "tiktok" and r.get("ok")
        ),
        "saved_ok": sum(1 for r in results if r.get("saved_to_db")),
        "errors": errors,
        "searches": len(results),
    }

    summary = {
        "started_at": started.isoformat(),
        "finished_at": datetime.now().isoformat(),
        "elapsed_seconds": round(elapsed, 2),
        "rotation_seed": seed,
        "platforms": platforms,
        "categories": categories,
        "limits": {
            "max_posts": max_posts,
            "max_comments": max_comments,
            "keywords_per_category": keywords_per_category,
            "facebook_method": facebook_method,
            "facebook_dual_search": facebook_dual_search,
        },
        "totals": totals,
        "results": results,
    }
    logger.info("Fin recolección programada: %s", totals)
    return summary
