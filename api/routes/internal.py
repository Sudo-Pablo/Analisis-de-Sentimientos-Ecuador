"""
Endpoints internos (cron / operaciones). No exponer sin CRON_SECRET.
"""
from __future__ import annotations

import logging
import os
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Query
from pydantic import BaseModel, Field

from api.services.scheduled_collection import DEFAULT_CATEGORIES, run_scheduled_collection

logger = logging.getLogger(__name__)
router = APIRouter()


class ScheduledCollectionRequest(BaseModel):
    platforms: Optional[List[str]] = Field(
        default=None,
        description="Plataformas a recolectar: facebook, tiktok",
    )
    categories: Optional[List[str]] = Field(
        default=None,
        description=f"Categorías. Default: {', '.join(DEFAULT_CATEGORIES)}",
    )
    max_posts: Optional[int] = Field(default=None, ge=1, le=20)
    max_comments: Optional[int] = Field(default=None, ge=1, le=50)
    keywords_per_category: Optional[int] = Field(default=None, ge=1, le=5)
    facebook_method: Optional[str] = Field(default=None, description="ppr | apify")
    facebook_dual_search: Optional[bool] = None


def _assert_cron_secret(x_cron_secret: Optional[str]) -> None:
    expected = os.getenv("CRON_SECRET", "").strip()
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="CRON_SECRET no configurado en el servidor. Define la variable de entorno.",
        )
    if not x_cron_secret or x_cron_secret.strip() != expected:
        raise HTTPException(status_code=401, detail="No autorizado")


def _run_job(body: ScheduledCollectionRequest) -> dict:
    return run_scheduled_collection(
        platforms=body.platforms,
        categories=body.categories,
        max_posts=body.max_posts,
        max_comments=body.max_comments,
        keywords_per_category=body.keywords_per_category,
        facebook_method=body.facebook_method,
        facebook_dual_search=body.facebook_dual_search,
    )


@router.post("/scheduled-collection")
async def trigger_scheduled_collection(
    background_tasks: BackgroundTasks,
    body: ScheduledCollectionRequest = ScheduledCollectionRequest(),
    x_cron_secret: Optional[str] = Header(default=None, alias="X-Cron-Secret"),
    async_mode: bool = Query(
        default=True,
        description="Si true, responde 202 y corre en background (recomendado para cron HTTP).",
    ),
):
    """
    Dispara la recolección automática (6 categorías × plataformas).

    Autenticación: header `X-Cron-Secret` = valor de la env `CRON_SECRET`.
    """
    _assert_cron_secret(x_cron_secret)

    if async_mode:
        background_tasks.add_task(_run_job, body)
        logger.info("Recolección programada encolada (async_mode=true)")
        return {
            "status": "accepted",
            "message": "Recolección encolada en background",
            "async_mode": True,
            "categories": body.categories or DEFAULT_CATEGORIES,
            "platforms": body.platforms,
        }

    try:
        summary = _run_job(body)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Error en recolección programada: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "status": "completed",
        "async_mode": False,
        "summary": summary,
    }


@router.get("/scheduled-collection/preview")
async def preview_scheduled_collection(
    x_cron_secret: Optional[str] = Header(default=None, alias="X-Cron-Secret"),
):
    """Vista previa de keywords que se usarían en la próxima corrida (sin ejecutar Apify)."""
    from api.services.scheduled_collection import (
        load_scheduled_config,
        pick_keywords,
        rotation_index,
    )

    _assert_cron_secret(x_cron_secret)
    config = load_scheduled_config()
    seed = rotation_index()
    kws = int(config["defaults"].get("keywords_per_category", 1))
    plan = {
        cat: pick_keywords(words, kws, seed)
        for cat, words in config["categories"].items()
    }
    return {
        "rotation_seed": seed,
        "defaults": config["defaults"],
        "keywords_this_run": plan,
    }
