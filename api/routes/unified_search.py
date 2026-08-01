"""
Búsqueda unificada en Facebook (PPR) y TikTok.
Ejecuta ambas redes en paralelo en hilos separados y devuelve el resultado conjunto.
"""
import asyncio
import logging
import time
from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from api.routes.facebook_search import (
    FacebookSearchRequest,
    FacebookSearchResponse,
    execute_facebook_search,
    schedule_facebook_db_save,
)
from api.routes.tiktok_search import (
    TikTokSearchRequest,
    TikTokSearchResponse,
    build_tiktok_search,
    schedule_tiktok_db_save,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class UnifiedSearchRequest(BaseModel):
    keyword: str = Field(..., min_length=2, max_length=120)
    categoria: Optional[str] = None
    max_posts: int = Field(default=5, ge=1, le=30)
    max_videos: int = Field(default=5, ge=1, le=20)
    max_comments_per_post: int = Field(default=10, ge=1, le=50)
    max_comments_per_video: int = Field(default=10, ge=1, le=50)
    facebook_method: Literal["ppr", "apify"] = Field(default="ppr")
    search_type: Literal["global", "pages", "places", "posts"] = Field(default="posts")
    location: str = Field(default="Ecuador")
    dual_search: bool = Field(default=True)


class UnifiedSearchResponse(BaseModel):
    keyword: str
    facebook: Optional[FacebookSearchResponse] = None
    facebook_error: Optional[str] = None
    tiktok: Optional[TikTokSearchResponse] = None
    tiktok_error: Optional[str] = None
    search_time_seconds: float


def _facebook_request(body: UnifiedSearchRequest) -> FacebookSearchRequest:
    return FacebookSearchRequest(
        keyword=body.keyword,
        categoria=body.categoria,
        method=body.facebook_method,
        max_posts=body.max_posts,
        max_comments_per_post=body.max_comments_per_post,
        search_type=body.search_type,
        location=body.location,
        dual_search=body.dual_search,
    )


def _tiktok_request(body: UnifiedSearchRequest) -> TikTokSearchRequest:
    return TikTokSearchRequest(
        keyword=body.keyword,
        categoria=body.categoria,
        max_videos=body.max_videos,
        max_comments_per_video=body.max_comments_per_video,
    )


async def _run_facebook(body: UnifiedSearchRequest) -> Dict[str, Any]:
    try:
        result = await run_in_threadpool(
            lambda: execute_facebook_search(_facebook_request(body), persist=False)
        )
        return {"data": result, "error": None}
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        logger.error("Búsqueda Facebook unificada falló: %s", detail)
        return {"data": None, "error": detail}
    except Exception as exc:
        logger.error("Búsqueda Facebook unificada falló: %s", exc, exc_info=True)
        return {"data": None, "error": str(exc)}


async def _run_tiktok(body: UnifiedSearchRequest) -> Dict[str, Any]:
    try:
        built = await run_in_threadpool(build_tiktok_search, _tiktok_request(body))
        return {"data": built, "error": None}
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        logger.error("Búsqueda TikTok unificada falló: %s", detail)
        return {"data": None, "error": detail}
    except Exception as exc:
        logger.error("Búsqueda TikTok unificada falló: %s", exc, exc_info=True)
        return {"data": None, "error": str(exc)}


@router.post("/unified", response_model=UnifiedSearchResponse)
async def unified_search(body: UnifiedSearchRequest, background_tasks: BackgroundTasks):
    start = time.time()
    logger.info(
        "Facebook unificado: keyword='%s' method=%s search_type=%s location=%s max_posts=%s",
        body.keyword,
        body.facebook_method,
        body.search_type,
        body.location,
        body.max_posts,
    )

    facebook_result = await _run_facebook(body)
    tiktok_result = await _run_tiktok(body)

    facebook_data = facebook_result["data"]
    if facebook_data and facebook_data.posts:
        schedule_facebook_db_save(background_tasks, facebook_data.posts, facebook_data.comments)
        facebook_data = facebook_data.model_copy(update={"db_save_pending": True})

    tiktok_data = None
    tiktok_built = tiktok_result["data"]
    if tiktok_built:
        tiktok_data = tiktok_built.response
        if tiktok_built.videos_raw:
            schedule_tiktok_db_save(
                background_tasks,
                body.keyword,
                body.categoria,
                tiktok_built.videos_raw,
                tiktok_built.comments_raw,
                tiktok_data.comments,
            )
            tiktok_data = tiktok_data.model_copy(update={"db_save_pending": True})

    return UnifiedSearchResponse(
        keyword=body.keyword,
        facebook=facebook_data,
        facebook_error=facebook_result["error"],
        tiktok=tiktok_data,
        tiktok_error=tiktok_result["error"],
        search_time_seconds=round(time.time() - start, 2),
    )
