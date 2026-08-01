"""
Router para búsqueda y análisis en tiempo real de Facebook.
Incluye dos métodos de extracción:
1) ppr: Facebook Search PPR vía Apify (recomendado / predeterminado)
2) apify: extracción vía actores Apify clásicos (respaldo)
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal, Tuple
from datetime import datetime
from starlette.concurrency import run_in_threadpool
from apify_client import ApifyClient
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
import hashlib
import os
import sys
import re
import time
import logging
import unicodedata
from pathlib import Path

from sqlalchemy import func

sys.path.append(str(Path(__file__).parent.parent.parent))

from api.config import load_database_config
from src.database.db_manager import DatabaseManager
from src.database.models import Topic, Post, Comment, CommentSentiment
from src.analyzers.sentiment_analyzer import SentimentAnalyzer
from api.sentiment_service import get_sentiment_analyzer
from api.utils.timing import SearchTiming
from api.utils.category_classifier import (
    CONTENT_CATEGORIES as FACEBOOK_CATEGORIES,
    assign_content_category as _assign_post_category,
)
from api.utils.search_cancel import (
    SearchCancelled,
    is_cancelled,
    register_search,
    raise_if_cancelled,
    run_actor_cancellable,
    unregister_search,
)

logger = logging.getLogger(__name__)
router = APIRouter()

_SENTIMENT_ANALYZER: Optional[SentimentAnalyzer] = None

# Páginas públicas usadas por el respaldo Apify (facebook-posts-scraper)
_FACEBOOK_PAGES: List[Dict[str, str]] = [
    {"name": "Teleamazonas", "url": "https://www.facebook.com/teleamazonasecuador"},
    {"name": "El Comercio", "url": "https://www.facebook.com/elcomerciocom"},
    {"name": "Ecuavisa", "url": "https://www.facebook.com/ecuavisa"},
    {"name": "La Voz del Tomebamba", "url": "https://www.facebook.com/rtomebamba"},
    {"name": "El Telégrafo", "url": "https://www.facebook.com/eltelegrafo.ec"},
]


class FacebookSearchRequest(BaseModel):
    keyword: str = Field(..., min_length=2, max_length=120, description="Palabra clave a buscar")
    categoria: Optional[str] = Field(None, description="Categoría para clasificar (Politica, Salud, etc.)")
    method: Literal["ppr", "apify"] = Field(default="ppr", description="Método de scraping")
    max_posts: int = Field(default=5, ge=1, le=50, description="Máximo de posts a obtener")
    max_comments_per_post: int = Field(default=10, ge=1, le=50, description="Máximo de comentarios por post")
    search_type: Literal["global", "pages", "places", "posts"] = Field(
        default="posts",
        description="Tipo de búsqueda para Facebook Search PPR",
    )
    location: str = Field(default="Ecuador", description="Ubicación geográfica de la búsqueda PPR")
    dual_search: bool = Field(
        default=True,
        description="Si es True y method=ppr, ejecuta posts+global, fusiona y deduplica antes de analizar",
    )
    search_id: Optional[str] = Field(
        default=None,
        max_length=64,
        description="ID de cancelación enviado por el frontend para detener la búsqueda",
    )


class FacebookPostResult(BaseModel):
    post_id: str
    url: str
    page_name: str
    author: str
    text: str
    topic: str
    likes: int
    comments_count: int
    shares: int
    created_at: Optional[datetime]


class FacebookCommentResult(BaseModel):
    comment_id: str
    post_id: str
    text: str
    author: str
    likes: int
    sentiment: str
    confidence: float
    scores: Dict[str, float]
    category: str
    created_at: Optional[datetime]


class SentimentSummary(BaseModel):
    positive: int
    negative: int
    neutral: int
    total: int
    positive_pct: float
    negative_pct: float
    neutral_pct: float


class FacebookSearchResponse(BaseModel):
    keyword: str
    categoria: Optional[str]
    method: str
    recommended_method: str
    posts_found: int
    comments_analyzed: int
    posts: List[FacebookPostResult]
    comments: List[FacebookCommentResult]
    sentiment_summary: SentimentSummary
    saved_to_db: bool = False
    db_save_pending: bool = False
    search_time_seconds: float


class FacebookCategoriesResponse(BaseModel):
    categories: Dict[str, List[str]]


def _normalize_text(value: str) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch)).lower().strip()


def _build_sentiment_summary(counts: Dict[str, int], total: int) -> SentimentSummary:
    return SentimentSummary(
        positive=counts["positivo"],
        negative=counts["negativo"],
        neutral=counts["neutral"],
        total=total,
        positive_pct=round((counts["positivo"] / total * 100) if total > 0 else 0, 2),
        negative_pct=round((counts["negativo"] / total * 100) if total > 0 else 0, 2),
        neutral_pct=round((counts["neutral"] / total * 100) if total > 0 else 0, 2),
    )


def _get_sentiment_analyzer() -> SentimentAnalyzer:
    return get_sentiment_analyzer()


def _apply_post_categories(
    posts: List[FacebookPostResult],
    request_categoria: Optional[str],
) -> List[FacebookPostResult]:
    return [
        post.model_copy(update={"topic": _assign_post_category(post.text, request_categoria)})
        for post in posts
    ]


def _post_category_map(posts: List[FacebookPostResult]) -> Dict[str, str]:
    return {post.post_id: post.topic for post in posts}


def _keyword_matches(text: str, keyword: str) -> bool:
    """Matching flexible para búsquedas compuestas.
    - Si coincide la frase completa, acepta.
    - Si no, acepta si al menos un token relevante (>=4 chars) está presente.
    """
    text_norm = _normalize_text(text)
    keyword_norm = _normalize_text(keyword)

    if not keyword_norm:
        return True

    if keyword_norm in text_norm:
        return True

    tokens = [tok for tok in keyword_norm.split() if len(tok) >= 4]
    if not tokens:
        return keyword_norm in text_norm

    return any(tok in text_norm for tok in tokens)


def _parse_ppr_timestamp(item: Dict[str, Any]) -> Optional[datetime]:
    timestamp = item.get("timestamp")
    if timestamp is None:
        return None
    try:
        if isinstance(timestamp, (int, float)):
            return datetime.fromtimestamp(timestamp)
        if isinstance(timestamp, str):
            return datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except (ValueError, OSError, TypeError):
        pass
    return None


def _extract_ppr_author(item: Dict[str, Any]) -> str:
    author = item.get("author")
    if isinstance(author, dict):
        return str(author.get("name") or author.get("id") or "Facebook")
    if isinstance(author, str) and author.strip():
        return author.strip()
    return str(item.get("pageName") or item.get("userName") or "Facebook")


def _extract_ppr_text(item: Dict[str, Any]) -> str:
    for key in ("message", "description", "text"):
        value = item.get(key)
        if value and str(value).strip():
            return str(value).strip()
    return ""


def _normalize_facebook_url(url: str) -> str:
    """Normaliza URL de Facebook para comparar duplicados entre search_type distintos."""
    if not url or not isinstance(url, str):
        return ""
    raw = url.strip()
    if not raw:
        return ""

    parsed = urlparse(raw)
    host = (parsed.netloc or "").lower().replace("www.", "").replace("m.", "").replace("web.", "")
    path = (parsed.path or "").rstrip("/")

    # Conservar solo query params que identifican el post
    keep_keys = {"story_fbid", "fbid", "id", "v", "multi_permalinks"}
    query = parse_qs(parsed.query, keep_blank_values=False)
    filtered = {k: v[0] for k, v in query.items() if k in keep_keys and v}
    query_str = urlencode(sorted(filtered.items())) if filtered else ""

    return urlunparse(("", host, path, "", query_str, "")).lower()


def _stable_ppr_post_id(item: Dict[str, Any], idx: int, post_url: str) -> str:
    """ID estable: prioriza id nativo; si no, hash de URL (evita ppr_fb_{idx} colisionando entre runs)."""
    raw_id = item.get("post_id") or item.get("postId") or item.get("id")
    if raw_id is not None and str(raw_id).strip():
        candidate = str(raw_id).strip()
        # Evitar IDs sintéticos previos o índices débiles
        if not candidate.startswith("ppr_fb_"):
            return candidate

    norm_url = _normalize_facebook_url(post_url)
    if norm_url:
        digest = hashlib.sha1(norm_url.encode("utf-8")).hexdigest()[:20]
        return f"fb_url_{digest}"

    return f"ppr_fb_{idx}"


def _post_richness(post: FacebookPostResult) -> tuple:
    return (len(post.text or ""), post.comments_count or 0, post.likes or 0)


def _merge_dedupe_posts(
    primary: List[FacebookPostResult],
    secondary: List[FacebookPostResult],
    max_posts: int,
) -> List[FacebookPostResult]:
    """Fusiona dos listas priorizando primary; elimina duplicados por id y/o URL."""
    merged: List[FacebookPostResult] = []
    by_id: Dict[str, int] = {}
    by_url: Dict[str, int] = {}

    def _register(post: FacebookPostResult, index: int) -> None:
        if post.post_id and not str(post.post_id).startswith("ppr_fb_"):
            by_id[str(post.post_id)] = index
        norm_url = _normalize_facebook_url(post.url)
        if norm_url:
            by_url[norm_url] = index

    def _find_index(post: FacebookPostResult) -> Optional[int]:
        if post.post_id and not str(post.post_id).startswith("ppr_fb_"):
            if str(post.post_id) in by_id:
                return by_id[str(post.post_id)]
        norm_url = _normalize_facebook_url(post.url)
        if norm_url and norm_url in by_url:
            return by_url[norm_url]
        return None

    for post in primary + secondary:
        existing_idx = _find_index(post)
        if existing_idx is not None:
            if _post_richness(post) > _post_richness(merged[existing_idx]):
                merged[existing_idx] = post
                _register(post, existing_idx)
            continue

        _register(post, len(merged))
        merged.append(post)

    return merged[:max_posts]


def _should_dual_ppr(request: FacebookSearchRequest) -> bool:
    """Con dual_search activo en PPR siempre se buscan posts + global y se deduplican."""
    return request.method == "ppr" and bool(request.dual_search)


def _map_ppr_item_to_post(item: Dict[str, Any], idx: int) -> Optional[FacebookPostResult]:
    text = _extract_ppr_text(item)
    post_url = item.get("url") or item.get("postUrl") or item.get("link") or ""
    post_id = _stable_ppr_post_id(item, idx, post_url)

    if not post_id and not post_url:
        return None
    if not post_url and str(post_id).startswith("ppr_fb_"):
        return None

    author = _extract_ppr_author(item)

    try:
        reactions = int(item.get("reactions_count", item.get("likes", 0)) or 0)
    except (TypeError, ValueError):
        reactions = 0

    try:
        comments_count = int(item.get("comments_count", item.get("comments", 0)) or 0)
    except (TypeError, ValueError):
        comments_count = 0

    try:
        shares = int(item.get("shares", item.get("sharesCount", 0)) or 0)
    except (TypeError, ValueError):
        shares = 0

    return FacebookPostResult(
        post_id=str(post_id),
        url=post_url,
        page_name=author,
        author=author,
        text=text,
        topic="",
        likes=reactions,
        comments_count=comments_count,
        shares=shares,
        created_at=_parse_ppr_timestamp(item),
    )


def _fetch_ppr_posts_for_type(
    client: ApifyClient,
    request: FacebookSearchRequest,
    search_type: str,
) -> List[FacebookPostResult]:
    """Ejecuta un run PPR para un search_type y mapea posts (sin comentarios)."""
    selected_posts: List[FacebookPostResult] = []
    run_input = {
        "query": request.keyword,
        "search_type": search_type,
        "max_posts": int(request.max_posts),
        "recent_posts": True,
        "location": request.location,
    }

    logger.info("Ejecutando Facebook Search PPR (%s): %s", search_type, run_input)
    run = run_actor_cancellable(
        client,
        "danek/facebook-search-ppr",
        run_input,
        search_id=getattr(request, "search_id", None),
    )
    if not run:
        return selected_posts

    dataset_id = run.get("defaultDatasetId")
    if not dataset_id:
        return selected_posts

    raw_items = list(client.dataset(dataset_id).iterate_items())
    logger.info(
        "PPR (%s) retornó %s items para keyword '%s'",
        search_type,
        len(raw_items),
        request.keyword,
    )

    for idx, item in enumerate(raw_items):
        mapped = _map_ppr_item_to_post(item, idx)
        if mapped:
            selected_posts.append(mapped)
        if len(selected_posts) >= request.max_posts:
            break

    return selected_posts


def _search_with_apify_ppr(request: FacebookSearchRequest):
    selected_posts: List[FacebookPostResult] = []
    analyzed_comments: List[FacebookCommentResult] = []
    sentiment_counts = {"positivo": 0, "negativo": 0, "neutral": 0}

    client = ApifyClient(os.getenv("APIFY_TOKEN"))

    if _should_dual_ppr(request):
        posts_by_type: Dict[str, List[FacebookPostResult]] = {"posts": [], "global": []}

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = {
                executor.submit(_fetch_ppr_posts_for_type, client, request, st): st
                for st in ("posts", "global")
            }
            for future in as_completed(futures):
                search_type = futures[future]
                try:
                    posts_by_type[search_type] = future.result()
                except Exception as exc:
                    logger.error(
                        "Error en PPR dual search_type=%s: %s",
                        search_type,
                        exc,
                        exc_info=True,
                    )
                    posts_by_type[search_type] = []

        selected_posts = _merge_dedupe_posts(
            posts_by_type["posts"],
            posts_by_type["global"],
            request.max_posts,
        )
        logger.info(
            "Dual PPR keyword='%s': posts=%s global=%s merged_unique=%s (max=%s)",
            request.keyword,
            len(posts_by_type["posts"]),
            len(posts_by_type["global"]),
            len(selected_posts),
            request.max_posts,
        )
    else:
        selected_posts = _fetch_ppr_posts_for_type(client, request, request.search_type)

    raise_if_cancelled(request.search_id)

    if not selected_posts:
        return selected_posts, analyzed_comments, sentiment_counts

    selected_posts = _apply_post_categories(selected_posts, request.categoria)
    categories_by_post = _post_category_map(selected_posts)
    analyzed_comments, sentiment_counts = _fetch_and_analyze_apify_comments(
        client, selected_posts, request, categories_by_post
    )

    return selected_posts, analyzed_comments, sentiment_counts


def _fetch_and_analyze_apify_comments(
    client: ApifyClient,
    selected_posts: List[FacebookPostResult],
    request: FacebookSearchRequest,
    categories_by_post: Dict[str, str],
) -> Tuple[List[FacebookCommentResult], Dict[str, int]]:
    analyzed_comments: List[FacebookCommentResult] = []
    sentiment_counts = {"positivo": 0, "negativo": 0, "neutral": 0}

    post_urls = [post.url for post in selected_posts if post.url]
    if not post_urls:
        return analyzed_comments, sentiment_counts

    logger.info("Buscando comentarios de %s posts en Apify...", len(post_urls))
    comments_input = {
        "startUrls": [{"url": url} for url in post_urls],
        "resultsLimit": request.max_comments_per_post,
        "includeNestedComments": False,
    }
    raise_if_cancelled(request.search_id)
    comments_run = run_actor_cancellable(
        client,
        "apify/facebook-comments-scraper",
        comments_input,
        search_id=request.search_id,
    )
    if not comments_run:
        return analyzed_comments, sentiment_counts

    raise_if_cancelled(request.search_id)
    comments_raw = list(client.dataset(comments_run["defaultDatasetId"]).list_items().items)
    logger.info("Comentarios encontrados: %s", len(comments_raw))

    url_to_post_id = {post.url: post.post_id for post in selected_posts if post.url}
    if not comments_raw:
        return analyzed_comments, sentiment_counts

    pending: List[Dict[str, Any]] = []
    for comment in comments_raw:
        texto = (comment.get("text") or "").strip()
        if not texto or len(texto) < 3:
            continue

        input_url = comment.get("inputUrl") or comment.get("facebookUrl") or ""
        post_id = url_to_post_id.get(input_url, "")
        if not post_id:
            for url, pid in url_to_post_id.items():
                if url in input_url or input_url in url:
                    post_id = pid
                    break
        if not post_id:
            continue

        created_at = None
        fecha_str = comment.get("date", "")
        if fecha_str:
            try:
                created_at = datetime.fromisoformat(fecha_str.replace("Z", "+00:00"))
            except Exception:
                pass

        likes_raw = comment.get("likesCount", 0)
        try:
            likes = int(likes_raw) if likes_raw else 0
        except (TypeError, ValueError):
            likes = 0

        pending.append({
            "texto": texto,
            "post_id": post_id,
            "comment_id": str(
                comment.get("id")
                or comment.get("feedbackId")
                or f"apify_fb_{len(pending)}"
            ),
            "author": comment.get("profileName") or "facebook_user",
            "likes": likes,
            "created_at": created_at,
        })

    if not pending:
        return analyzed_comments, sentiment_counts

    analyzer = _get_sentiment_analyzer()
    texts = [item["texto"] for item in pending]
    sentiment_results = analyzer.analyze_sentiments_list(texts, batch_size=16)

    for item, sentiment_result in zip(pending, sentiment_results):
        sentiment = sentiment_result["sentiment"]
        sentiment_counts[sentiment] += 1

        raw_scores = sentiment_result.get("scores", {})
        normalized_scores = {
            "positive": raw_scores.get("positivo", raw_scores.get("positive", 0)),
            "negative": raw_scores.get("negativo", raw_scores.get("negative", 0)),
            "neutral": raw_scores.get("neutral", 0),
        }

        analyzed_comments.append(
            FacebookCommentResult(
                comment_id=item["comment_id"],
                post_id=item["post_id"],
                text=item["texto"],
                author=item["author"],
                likes=item["likes"],
                sentiment=sentiment,
                confidence=sentiment_result["confidence"],
                scores=normalized_scores,
                category=categories_by_post.get(item["post_id"], "Social"),
                created_at=item["created_at"],
            )
        )

    return analyzed_comments, sentiment_counts


def _search_with_apify_legacy(request: FacebookSearchRequest):
    if re.search(r"\becuador\b", request.keyword, re.IGNORECASE):
        logger.info("Usando Apify Finder para keyword '%s'", request.keyword)
        return _search_with_apify_finder(request)
    logger.info("Usando Apify estándar para keyword '%s'", request.keyword)
    return _search_with_apify(request)


@router.get("/categories", response_model=FacebookCategoriesResponse)
async def get_available_categories():
    return FacebookCategoriesResponse(categories=FACEBOOK_CATEGORIES)


@router.get("/status")
async def get_facebook_status():
    apify_token = os.getenv("APIFY_TOKEN")

    return {
        "available": bool(apify_token),
        "recommended_method": "ppr",
        "methods": {
            "ppr": {
                "available": bool(apify_token),
                "recommended": True,
                "message": "Búsqueda global vía Facebook Search PPR (requiere APIFY_TOKEN).",
            },
            "apify": {
                "available": bool(apify_token),
                "recommended": False,
                "message": "Método Apify clásico de respaldo. Disponible con APIFY_TOKEN configurado.",
            },
        },
    }


@router.post("/search", response_model=FacebookSearchResponse)
async def search_facebook(request: FacebookSearchRequest, background_tasks: BackgroundTasks):
    try:
        result = await run_in_threadpool(lambda: execute_facebook_search(request, persist=False))
    except SearchCancelled:
        raise HTTPException(status_code=409, detail="Búsqueda detenida")
    if is_cancelled(request.search_id):
        raise HTTPException(status_code=409, detail="Búsqueda detenida")
    if result.posts:
        schedule_facebook_db_save(background_tasks, result.posts, result.comments)
        result = result.model_copy(update={"db_save_pending": True})
    return result


def execute_facebook_search(
    request: FacebookSearchRequest,
    *,
    persist: bool = True,
) -> FacebookSearchResponse:
    start_time = time.time()
    register_search(request.search_id)

    if not os.getenv("APIFY_TOKEN"):
        unregister_search(request.search_id)
        raise HTTPException(
            status_code=503,
            detail="Método no disponible. Configure APIFY_TOKEN.",
        )

    try:
        used_method = request.method
        timing = SearchTiming(f"facebook_search keyword='{request.keyword}'")
        raise_if_cancelled(request.search_id)

        with timing.stage("scrape"):
            if request.method == "ppr":
                posts, comments, sentiment_counts = _search_with_apify_ppr(request)
                if _should_dual_ppr(request):
                    used_method = "ppr_dual"
                raise_if_cancelled(request.search_id)
                if len(posts) == 0:
                    logger.warning(
                        "PPR no devolvió posts para keyword '%s'. Ejecutando fallback con método 'apify'.",
                        request.keyword,
                    )
                    posts, comments, sentiment_counts = _search_with_apify_legacy(request)
                    used_method = "ppr_fallback_apify"
            else:
                posts, comments, sentiment_counts = _search_with_apify_legacy(request)

        raise_if_cancelled(request.search_id)
        sentiment_summary = _build_sentiment_summary(sentiment_counts, len(comments))

        saved_to_db = False
        if persist:
            with timing.stage("db"):
                saved_to_db = _save_results_to_db(posts, comments)

        timing.log_summary(method=used_method, comments=len(comments), posts=len(posts))

        return FacebookSearchResponse(
            keyword=request.keyword,
            categoria=request.categoria,
            method=used_method,
            recommended_method="ppr",
            posts_found=len(posts),
            comments_analyzed=len(comments),
            posts=posts,
            comments=comments,
            sentiment_summary=sentiment_summary,
            saved_to_db=saved_to_db,
            search_time_seconds=round(time.time() - start_time, 2),
        )

    except SearchCancelled:
        logger.info("Búsqueda Facebook detenida (search_id=%s)", request.search_id)
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en búsqueda Facebook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        unregister_search(request.search_id)


def _search_with_apify_finder(request: FacebookSearchRequest):
    selected_posts: List[FacebookPostResult] = []
    analyzed_comments: List[FacebookCommentResult] = []
    sentiment_counts = {"positivo": 0, "negativo": 0, "neutral": 0}

    client = ApifyClient(os.getenv("APIFY_TOKEN"))

    run_input = {
        "categories": [request.keyword],
        "resultsLimit": int(request.max_posts),
    }

    run = client.actor("apify/facebook-search-scraper").call(run_input=run_input)
    if not run:
        return selected_posts, analyzed_comments, sentiment_counts

    dataset_id = run.get("defaultDatasetId")
    if not dataset_id:
        return selected_posts, analyzed_comments, sentiment_counts

    raw_items = list(client.dataset(dataset_id).iterate_items())
    if not raw_items:
        return selected_posts, analyzed_comments, sentiment_counts

    for idx, item in enumerate(raw_items):
        text = (item.get("text") or item.get("message") or "").strip()
        if not _keyword_matches(text, request.keyword):
            continue

        post_url = item.get("url") or item.get("postUrl") or item.get("link") or ""
        page_name = item.get("pageName") or item.get("userName") or item.get("author") or "Facebook"

        selected_posts.append(
            FacebookPostResult(
                post_id=str(item.get("postId") or item.get("id") or f"apify_fb_finder_{idx}"),
                url=post_url,
                page_name=page_name,
                author=page_name,
                text=text,
                topic=request.categoria or "",
                likes=int(item.get("likes", 0) or 0),
                comments_count=int(item.get("comments", item.get("commentsCount", 0)) or 0),
                shares=int(item.get("shares", 0) or 0),
                created_at=None,
            )
        )

        if len(selected_posts) >= request.max_posts:
            break

    selected_posts = _apply_post_categories(selected_posts, request.categoria)
    categories_by_post = _post_category_map(selected_posts)
    analyzed_comments, sentiment_counts = _fetch_and_analyze_apify_comments(
        client, selected_posts, request, categories_by_post
    )

    return selected_posts, analyzed_comments, sentiment_counts

def _search_with_apify_finder2(request: FacebookSearchRequest):
    from apify_client import ApifyClient
    #importar json.dumps para imprimir el input de apify
    import json


  
    selected_posts: List[FacebookPostResult] = []
    analyzed_comments: List[FacebookCommentResult] = []
    sentiment_counts = {"positivo": 0, "negativo": 0, "neutral": 0}

    client = ApifyClient(os.getenv("APIFY_TOKEN"))
    print("Ejecutando búsqueda con Apify Finder (búsqueda directa por palabra clave)...")
    #agergar time de espera de 3s
    
    time.sleep(3)
    # --- NUEVA ESTRATEGIA: BÚSQUEDA DIRECTA POR PALABRA CLAVE ---
    run_input = {
       
        
        "searchTerms": [request.keyword],       
        "resultsLimit": int(request.max_posts), 
    }
    print("INPUT ENVIADO A APIFY:")
    print(json.dumps(run_input, indent=2))
    # Llamamos al actor de tu captura de pantalla
    run = client.actor("apify/facebook-search-scraper").call(run_input=run_input)
    if not run:
        raise HTTPException(status_code=500, detail="No se pudo ejecutar el buscador de Apify para Facebook")

    raw_items = list(client.dataset(run["defaultDatasetId"]).list_items().items)
    print("TOTAL ITEMS:", len(raw_items))

    for i, item in enumerate(raw_items[:3]):
        print(f"ITEM {i}")
        print(json.dumps(item, indent=2, ensure_ascii=False))
    logger.info(
        "Apify retornó %s items usando la keyword directa '%s'",
        len(raw_items),
        request.keyword,
    )

    # El resto de tu código para procesar 'raw_items' y buscar comentarios sigue igual...
def _search_with_apify(request: FacebookSearchRequest):
    from apify_client import ApifyClient
    print("Ejecutando búsqueda con normal (búsqueda directa por palabra clave)...")
    #agergar time de espera de 3s
    
    time.sleep(3)
    selected_posts: List[FacebookPostResult] = []
    analyzed_comments: List[FacebookCommentResult] = []
    sentiment_counts = {"positivo": 0, "negativo": 0, "neutral": 0}

    client = ApifyClient(os.getenv("APIFY_TOKEN"))

    # Evitar endpoint de búsqueda de Facebook, que suele ser bloqueado.
    # En su lugar, leemos posts desde páginas conocidas y filtramos por keyword.
    run_input = {
        "startUrls": [{"url": page_cfg["url"]} for page_cfg in _FACEBOOK_PAGES],
        "resultsLimit": max(request.max_posts * 8, 20),
    }

    run = client.actor("apify/facebook-posts-scraper").call(run_input=run_input)
    if not run:
        raise HTTPException(status_code=500, detail="No se pudo ejecutar actor de Apify para Facebook")

    raw_items = list(client.dataset(run["defaultDatasetId"]).list_items().items)

    logger.info(
        "Apify retornó %s items para keyword '%s'",
        len(raw_items),
        request.keyword,
    )

    for idx, item in enumerate(raw_items):
        text = (item.get("text") or item.get("message") or "").strip()
        if not _keyword_matches(text, request.keyword):
            continue

        post_url = item.get("url") or item.get("postUrl") or item.get("link") or ""
        page_name = item.get("pageName") or item.get("userName") or item.get("author") or "Facebook"

        selected_posts.append(
            FacebookPostResult(
                post_id=str(item.get("postId") or item.get("id") or f"apify_fb_{idx}"),
                url=post_url,
                page_name=page_name,
                author=page_name,
                text=text,
                topic=request.categoria or "",
                likes=int(item.get("likes", 0) or 0),
                comments_count=int(item.get("comments", item.get("commentsCount", 0)) or 0),
                shares=int(item.get("shares", 0) or 0),
                created_at=None,
            )
        )

        if len(selected_posts) >= request.max_posts:
            break

    selected_posts = _apply_post_categories(selected_posts, request.categoria)
    categories_by_post = _post_category_map(selected_posts)
    analyzed_comments, sentiment_counts = _fetch_and_analyze_apify_comments(
        client, selected_posts, request, categories_by_post
    )

    return selected_posts, analyzed_comments, sentiment_counts


def schedule_facebook_db_save(
    background_tasks: BackgroundTasks,
    posts: List[FacebookPostResult],
    comments: List[FacebookCommentResult],
) -> None:
    if posts:
        background_tasks.add_task(_background_save_facebook_results, posts, comments)


def _background_save_facebook_results(
    posts: List[FacebookPostResult],
    comments: List[FacebookCommentResult],
) -> None:
    try:
        saved = _save_results_to_db(posts, comments)
        logger.info("[background] Facebook guardado en BD: %s", saved)
    except Exception as exc:
        logger.error("[background] Error guardando Facebook en BD: %s", exc, exc_info=True)


def _save_results_to_db(
    posts: List[FacebookPostResult],
    comments: List[FacebookCommentResult],
) -> bool:
    if not posts:
        return False

    try:
        db_config = load_database_config()
        db = DatabaseManager(db_config)

        with db.get_session() as session:
            saved_posts_by_id: Dict[str, int] = {}

            for post in posts:
                existing = session.query(Post).filter_by(post_id=post.post_id).first()

                # Defensa extra: mismo post_url con otro post_id
                if not existing and post.url:
                    existing = (
                        session.query(Post)
                        .filter(Post.platform == "facebook", Post.post_url == post.url)
                        .first()
                    )

                if existing:
                    saved_posts_by_id[post.post_id] = existing.id
                    continue

                topic = session.query(Topic).filter(
                    func.lower(Topic.name) == post.topic.lower()
                ).first()
                post_topic_id = topic.id if topic else None

                db_post = Post(
                    post_id=post.post_id,
                    text=post.text,
                    post_time=post.created_at or datetime.now(),
                    likes=post.likes,
                    comments_count=post.comments_count,
                    shares=post.shares,
                    post_url=post.url,
                    topic_id=post_topic_id,
                    platform="facebook",
                    category=post.topic,
                    author_name=post.author,
                    collected_at=datetime.now(),
                )
                session.add(db_post)
                session.flush()
                saved_posts_by_id[post.post_id] = db_post.id

            for comment in comments:
                existing_comment = session.query(Comment).filter_by(comment_id=comment.comment_id).first()
                if existing_comment:
                    continue

                post_db_id = saved_posts_by_id.get(comment.post_id)
                if not post_db_id:
                    continue

                db_comment = Comment(
                    comment_id=comment.comment_id,
                    post_id=post_db_id,
                    original_text=comment.text,
                    cleaned_text=comment.text,
                    commenter_name=comment.author,
                    comment_likes=comment.likes,
                    comment_time=comment.created_at,
                    platform="facebook",
                    category=comment.category,
                    collected_at=datetime.now(),
                )
                session.add(db_comment)
                session.flush()

                session.add(
                    CommentSentiment(
                        comment_id=db_comment.id,
                        sentiment=comment.sentiment,
                        confidence=comment.confidence,
                        score_positive=comment.scores.get("positive", 0),
                        score_negative=comment.scores.get("negative", 0),
                        score_neutral=comment.scores.get("neutral", 0),
                        model_used="pysentimiento/robertuito-sentiment-analysis",
                        analyzed_at=datetime.now(),
                    )
                )

            session.commit()
            return True

    except Exception as e:
        logger.error(f"Error guardando resultados de Facebook en BD: {e}", exc_info=True)
        return False
