"""
Endpoints de tendencias: registrar búsquedas, populares, hot topics y snapshots cacheados.
"""
from typing import Any, List, Literal, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel, Field

from api.utils.search_analytics import (
    get_hot_topics,
    get_popular_searches,
    get_search_snapshot,
    record_search_event,
    save_search_snapshot,
)
from api.utils.search_cancel import cancel_search

router = APIRouter()


class CancelSearchRequest(BaseModel):
    search_id: str = Field(..., min_length=8, max_length=64)


class SearchEventRequest(BaseModel):
    keyword: str = Field(..., min_length=2, max_length=200)
    source: Literal["unified", "facebook", "tiktok"] = "unified"
    category: Optional[str] = None


class SearchSnapshotRequest(BaseModel):
    keyword: str = Field(..., min_length=2, max_length=200)
    source: Literal["unified", "facebook", "tiktok"] = "unified"
    facebook: Optional[Any] = None
    tiktok: Optional[Any] = None
    facebook_error: Optional[str] = None
    tiktok_error: Optional[str] = None


class PopularSearchItem(BaseModel):
    keyword: str
    count: int
    last_searched_at: Optional[str] = None
    has_snapshot: bool = False


class HotTopicItem(BaseModel):
    category: str
    count: int
    share_pct: float
    topic_id: Optional[int] = None
    rank: Optional[int] = None


class PopularSearchesResponse(BaseModel):
    days: int
    items: List[PopularSearchItem]


class HotTopicsResponse(BaseModel):
    days: int
    items: List[HotTopicItem]


class SearchTrendsResponse(BaseModel):
    popular: List[PopularSearchItem]
    hot_topics: List[HotTopicItem]
    popular_days: int
    hot_topics_days: int


class SearchSnapshotResponse(BaseModel):
    keyword: str
    source: str
    from_cache: bool = True
    updated_at: Optional[str] = None
    created_at: Optional[str] = None
    facebook: Optional[Any] = None
    tiktok: Optional[Any] = None
    facebook_error: Optional[str] = None
    tiktok_error: Optional[str] = None


@router.post("/cancel")
async def cancel_running_search(body: CancelSearchRequest):
    """Detiene una búsqueda en curso y aborta runs Apify asociados."""
    return cancel_search(body.search_id)


@router.post("/events")
async def create_search_event(body: SearchEventRequest, background_tasks: BackgroundTasks):
    """Registra una búsqueda para estadísticas de tendencias (no bloquea)."""
    background_tasks.add_task(
        record_search_event,
        body.keyword,
        source=body.source,
        category=body.category,
    )
    return {"ok": True}


@router.post("/snapshot")
async def upsert_search_snapshot(body: SearchSnapshotRequest, background_tasks: BackgroundTasks):
    """Persiste el resultado completo de una búsqueda para reutilizarlo sin scrapear."""
    payload = {
        "facebook": body.facebook,
        "tiktok": body.tiktok,
        "facebook_error": body.facebook_error,
        "tiktok_error": body.tiktok_error,
    }
    has_data = bool(body.facebook) or bool(body.tiktok)
    if not has_data:
        return {"ok": False, "reason": "empty_payload"}

    background_tasks.add_task(
        save_search_snapshot,
        body.keyword,
        payload,
        source=body.source,
    )
    return {"ok": True}


@router.get("/snapshot", response_model=SearchSnapshotResponse)
async def read_search_snapshot(keyword: str = Query(..., min_length=2, max_length=200)):
    """Devuelve el snapshot cacheado de una keyword, si existe."""
    snapshot = get_search_snapshot(keyword)
    if not snapshot:
        raise HTTPException(status_code=404, detail="No hay resultados guardados para esta búsqueda")
    return SearchSnapshotResponse(**snapshot)


@router.get("/popular", response_model=PopularSearchesResponse)
async def popular_searches(days: int = 0, limit: int = 8):
    """days=0 → histórico completo de búsquedas."""
    try:
        scope = None if days <= 0 else days
        items = get_popular_searches(days=scope, limit=limit)
        return PopularSearchesResponse(days=days if days > 0 else 0, items=items)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/hot-topics", response_model=HotTopicsResponse)
async def hot_topics(days: int = 0, limit: int = 6):
    """days=0 → histórico completo de categorías buscadas."""
    try:
        scope = None if days <= 0 else days
        items = get_hot_topics(days=scope, limit=limit)
        return HotTopicsResponse(days=days if days > 0 else 0, items=items)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/trends", response_model=SearchTrendsResponse)
async def search_trends(
    popular_days: int = 0,
    hot_days: int = 0,
    popular_limit: int = 5,
    hot_limit: int = 6,
):
    """Endpoint combinado para el dock del hero (histórico completo por defecto)."""
    try:
        popular_scope = None if popular_days <= 0 else popular_days
        hot_scope = None if hot_days <= 0 else hot_days
        popular = get_popular_searches(days=popular_scope, limit=max(popular_limit, 5))
        topics = get_hot_topics(days=hot_scope, limit=max(hot_limit, 5))
        return SearchTrendsResponse(
            popular=popular,
            hot_topics=topics,
            popular_days=popular_days if popular_days > 0 else 0,
            hot_topics_days=hot_days if hot_days > 0 else 0,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
