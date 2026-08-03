"""
Router para búsqueda y análisis en tiempo real de TikTok
Permite buscar videos por keyword, extraer comentarios, analizar sentimientos y guardar en BD
"""
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, NamedTuple
from datetime import datetime
from starlette.concurrency import run_in_threadpool
import os
import sys
import logging
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

from api.config import load_database_config
from src.database.db_manager import DatabaseManager
from api.sentiment_service import get_sentiment_analyzer
from api.utils.timing import SearchTiming
from api.utils.category_classifier import assign_content_category
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


# === SCHEMAS ===

class TikTokSearchRequest(BaseModel):
    """Request para búsqueda en TikTok"""
    keyword: str = Field(..., min_length=2, max_length=100, description="Palabra clave a buscar")
    categoria: Optional[str] = Field(None, description="Categoría para clasificar (Politica, Salud, etc.)")
    max_videos: int = Field(default=5, ge=1, le=50, description="Máximo de videos a obtener")
    max_comments_per_video: int = Field(default=10, ge=1, le=50, description="Máximo comentarios por video")
    search_id: Optional[str] = Field(
        default=None,
        max_length=64,
        description="ID de cancelación enviado por el frontend para detener la búsqueda",
    )


class VideoResult(BaseModel):
    """Resultado de un video encontrado"""
    video_id: str
    url: str
    author: str
    text: str
    topic: str = ""
    hashtags: List[str]
    likes: int
    comments_count: int
    shares: int
    created_at: Optional[datetime]


class CommentResult(BaseModel):
    """Resultado de un comentario analizado"""
    comment_id: str
    text: str
    author: str
    likes: int
    sentiment: str
    confidence: float
    scores: Dict[str, float]
    created_at: Optional[datetime]


class SentimentSummary(BaseModel):
    """Resumen de distribución de sentimientos"""
    positive: int
    negative: int
    neutral: int
    total: int
    positive_pct: float
    negative_pct: float
    neutral_pct: float


class TikTokSearchResponse(BaseModel):
    """Respuesta completa de búsqueda"""
    keyword: str
    categoria: Optional[str]
    videos_found: int
    comments_analyzed: int
    videos: List[VideoResult]
    comments: List[CommentResult]
    sentiment_summary: SentimentSummary
    saved_to_db: bool = False
    db_save_pending: bool = False
    search_time_seconds: float


class BuiltTikTokSearch(NamedTuple):
    response: TikTokSearchResponse
    videos_raw: List[Dict[str, Any]]
    comments_raw: List[Dict[str, Any]]


class TikTokCategoriesResponse(BaseModel):
    """Categorías disponibles para búsqueda"""
    categories: Dict[str, List[str]]


# === ENDPOINTS ===

@router.get("/categories", response_model=TikTokCategoriesResponse)
async def get_available_categories():
    """
    Obtener categorías y keywords predefinidas para TikTok
    """
    try:
        from src.collectors.tiktok_collector import TikTokCollector
        
        # Obtener keywords por categoría (sin necesitar token para esto)
        categories = {
            "Politica": [
                "política ecuador", "gobierno ecuador", "presidente ecuador",
                "asamblea nacional ecuador", "elecciones ecuador"
            ],
            "Economia": [
                "economía ecuador", "dólar ecuador", "inflación ecuador",
                "empleo ecuador", "banco central ecuador"
            ],
            "Salud": [
                "salud ecuador", "hospitales ecuador", "medicina ecuador",
                "ministerio de salud ecuador", "msp ecuador"
            ],
            "Seguridad": [
                "seguridad ecuador", "delincuencia ecuador", "policia ecuador",
                "violencia ecuador", "inseguridad ecuador"
            ],
            "Educacion": [
                "educación ecuador", "universidades ecuador", "colegios ecuador"
            ],
            "Social": [
                "sociedad ecuador", "cultura ecuador", "tradiciones ecuador",
                "turismo ecuador", "viajes ecuador", "destinos ecuador",
            ]
        }
        
        return TikTokCategoriesResponse(categories=categories)
        
    except Exception as e:
        logger.error(f"Error obteniendo categorías: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=TikTokSearchResponse)
async def search_tiktok(request: TikTokSearchRequest, background_tasks: BackgroundTasks):
    try:
        built = await run_in_threadpool(build_tiktok_search, request)
    except SearchCancelled:
        raise HTTPException(status_code=409, detail="Búsqueda detenida")
    if is_cancelled(request.search_id):
        raise HTTPException(status_code=409, detail="Búsqueda detenida")
    if built.videos_raw:
        schedule_tiktok_db_save(
            background_tasks,
            request.keyword,
            request.categoria,
            built.videos_raw,
            built.comments_raw,
            built.response.comments,
        )
        return built.response.model_copy(update={"db_save_pending": True})
    return built.response


def execute_tiktok_search(request: TikTokSearchRequest) -> TikTokSearchResponse:
    """Compatibilidad con llamadas directas (p. ej. búsqueda unificada)."""
    return build_tiktok_search(request).response


def build_tiktok_search(request: TikTokSearchRequest) -> BuiltTikTokSearch:
    """
    Buscar en TikTok, analizar sentimientos y guardar en base de datos.
    
    Este proceso puede tardar entre 30-90 segundos dependiendo de la cantidad de videos.
    """
    import time
    start_time = time.time()
    timing = SearchTiming(f"tiktok_search keyword='{request.keyword}'")
    register_search(request.search_id)
    
    # Verificar token de Apify
    apify_token = os.getenv('APIFY_TOKEN')
    if not apify_token:
        unregister_search(request.search_id)
        raise HTTPException(
            status_code=503, 
            detail="Token de Apify no configurado. Configure la variable de entorno APIFY_TOKEN"
        )
    
    try:
        logger.info(f"Iniciando búsqueda TikTok: '{request.keyword}'")
        raise_if_cancelled(request.search_id)
        
        # 1. Buscar videos en TikTok usando Apify
        from apify_client import ApifyClient
        client = ApifyClient(apify_token)
        
        # Buscar videos (más recientes + aproximación geográfica Ecuador)
        # videoSearchSorting=LATEST: ordenar búsqueda de videos por más recientes (filtro de pago en Apify)
        # proxyCountryCode=EC: scrapear como desde Ecuador (filtro de pago / residential proxy)
        # Nota: si Apify marca temporalmente "Search filters blocked", el actor puede ignorar LATEST;
        # proxyCountryCode=EC sigue aplicando de forma independiente.
        proxy_country = os.getenv("TIKTOK_PROXY_COUNTRY", "EC").strip() or "EC"
        video_sort = os.getenv("TIKTOK_VIDEO_SORT", "LATEST").strip() or "LATEST"
        run_input = {
            "searchQueries": [request.keyword],
            "resultsPerPage": request.max_videos,
            "searchSection": "/video",
            "videoSearchSorting": video_sort,
            "proxyCountryCode": proxy_country,
        }
        logger.info(
            "Input TikTok Apify: queries=%s sort=%s proxyCountry=%s",
            run_input["searchQueries"],
            video_sort,
            proxy_country,
        )
        
        with timing.stage("apify_videos"):
            logger.info("Ejecutando búsqueda de videos en Apify...")
            run = run_actor_cancellable(
                client,
                "clockworks/tiktok-scraper",
                run_input,
                search_id=request.search_id,
            )
        
        if not run:
            raise HTTPException(status_code=500, detail="Error ejecutando el actor de TikTok en Apify")

        raise_if_cancelled(request.search_id)
        videos_raw = list(client.dataset(run["defaultDatasetId"]).list_items().items)
        logger.info(f"Videos encontrados: {len(videos_raw)}")
        
        if not videos_raw:
            return BuiltTikTokSearch(
                response=TikTokSearchResponse(
                    keyword=request.keyword,
                    categoria=request.categoria,
                    videos_found=0,
                    comments_analyzed=0,
                    videos=[],
                    comments=[],
                    sentiment_summary=SentimentSummary(
                        positive=0, negative=0, neutral=0, total=0,
                        positive_pct=0, negative_pct=0, neutral_pct=0
                    ),
                    saved_to_db=False,
                    search_time_seconds=time.time() - start_time
                ),
                videos_raw=[],
                comments_raw=[],
            )
        
        # 2. Procesar videos
        video_results = []
        video_urls = []
        
        for video in videos_raw:
            video_id = video.get('id') or video.get('webVideoUrl', '')
            url = video.get('webVideoUrl', '')
            
            hashtags = video.get('hashtags', [])
            hashtags_list = [
                h.get('name', '') if isinstance(h, dict) else str(h)
                for h in hashtags
            ]
            
            created_at = None
            fecha_str = video.get('createTimeISO', '')
            if fecha_str:
                try:
                    created_at = datetime.fromisoformat(fecha_str.replace('Z', '+00:00'))
                except:
                    pass
            
            video_results.append(VideoResult(
                video_id=video_id,
                url=url,
                author=video.get('authorMeta', {}).get('name', 'Desconocido'),
                text=video.get('text', ''),
                topic=assign_content_category(
                    video.get('text', '') or ' '.join(hashtags_list),
                    request.categoria,
                ),
                hashtags=hashtags_list,
                likes=video.get('diggCount', 0),
                comments_count=video.get('commentCount', 0),
                shares=video.get('shareCount', 0),
                created_at=created_at
            ))
            
            if url:
                video_urls.append(url)
        
        comments_raw = []
        with timing.stage("apify_comments"):
            if video_urls:
                raise_if_cancelled(request.search_id)
                logger.info(f"Buscando comentarios de {len(video_urls)} videos...")
                
                comments_input = {
                    "postURLs": video_urls,
                    "commentsPerPost": request.max_comments_per_video
                }
                
                comments_run = run_actor_cancellable(
                    client,
                    "clockworks/tiktok-comments-scraper",
                    comments_input,
                    search_id=request.search_id,
                )
                
                if comments_run:
                    raise_if_cancelled(request.search_id)
                    comments_raw = list(client.dataset(comments_run["defaultDatasetId"]).list_items().items)
                    logger.info(f"Comentarios encontrados: {len(comments_raw)}")
        
        # 4. Analizar sentimientos de los comentarios
        comment_results = []
        sentiment_counts = {"positivo": 0, "negativo": 0, "neutral": 0}
        
        if comments_raw:
            raise_if_cancelled(request.search_id)
            with timing.stage("sentiment"):
                analyzer = get_sentiment_analyzer()
                logger.info("Analizando sentimientos en lote...")

                pending = []
                for comment in comments_raw:
                    texto = (comment.get('text') or '').strip()
                    if not texto or len(texto) < 3:
                        continue

                    created_at = None
                    fecha_str = comment.get('createTimeISO', '')
                    if fecha_str:
                        try:
                            created_at = datetime.fromisoformat(fecha_str.replace('Z', '+00:00'))
                        except Exception:
                            pass

                    pending.append({
                        'texto': texto,
                        'comment_id': comment.get('cid', ''),
                        'author': comment.get('uniqueId', 'Desconocido'),
                        'likes': comment.get('diggCount', 0),
                        'created_at': created_at,
                    })

                raise_if_cancelled(request.search_id)
                sentiment_results = analyzer.analyze_sentiments_list(
                    [p['texto'] for p in pending],
                    batch_size=16,
                )

                for item, sentiment_result in zip(pending, sentiment_results):
                    sentiment = sentiment_result['sentiment']
                    sentiment_counts[sentiment] += 1

                    raw_scores = sentiment_result.get('scores', {})
                    normalized_scores = {
                        'positive': raw_scores.get('positivo', raw_scores.get('positive', 0)),
                        'negative': raw_scores.get('negativo', raw_scores.get('negative', 0)),
                        'neutral': raw_scores.get('neutral', 0),
                    }

                    comment_results.append(CommentResult(
                        comment_id=item['comment_id'],
                        text=item['texto'],
                        author=item['author'],
                        likes=item['likes'],
                        sentiment=sentiment,
                        confidence=sentiment_result['confidence'],
                        scores=normalized_scores,
                        created_at=item['created_at'],
                    ))
        
        # 5. Calcular resumen de sentimientos
        total = len(comment_results)
        sentiment_summary = SentimentSummary(
            positive=sentiment_counts["positivo"],
            negative=sentiment_counts["negativo"],
            neutral=sentiment_counts["neutral"],
            total=total,
            positive_pct=round((sentiment_counts["positivo"] / total * 100) if total > 0 else 0, 2),
            negative_pct=round((sentiment_counts["negativo"] / total * 100) if total > 0 else 0, 2),
            neutral_pct=round((sentiment_counts["neutral"] / total * 100) if total > 0 else 0, 2)
        )
        
        search_time = time.time() - start_time
        timing.log_summary(videos=len(video_results), comments=len(comment_results))
        
        # Log para debugging
        logger.info(f"Sentiment summary: positive={sentiment_summary.positive}, positive_pct={sentiment_summary.positive_pct}")
        logger.info(f"Search time: {search_time}, rounded: {round(search_time, 2)}")
        
        return BuiltTikTokSearch(
            response=TikTokSearchResponse(
                keyword=request.keyword,
                categoria=request.categoria,
                videos_found=len(video_results),
                comments_analyzed=len(comment_results),
                videos=video_results,
                comments=comment_results,
                sentiment_summary=sentiment_summary,
                saved_to_db=False,
                search_time_seconds=round(search_time, 2)
            ),
            videos_raw=videos_raw,
            comments_raw=comments_raw,
        )
        
    except SearchCancelled:
        logger.info("Búsqueda TikTok detenida (search_id=%s)", request.search_id)
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en búsqueda TikTok: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        unregister_search(request.search_id)


def persist_tiktok_results(
    keyword: str,
    categoria: Optional[str],
    videos_raw: List[Dict[str, Any]],
    comments_raw: List[Dict[str, Any]],
    comment_results: List[CommentResult],
) -> bool:
    """Guarda resultados TikTok de forma síncrona (CLI / cron / jobs internos)."""
    if not videos_raw:
        return False
    db_config = load_database_config()
    db = DatabaseManager(db_config)
    return _save_results_to_db(
        db,
        keyword,
        categoria,
        videos_raw,
        comments_raw,
        comment_results,
    )


def schedule_tiktok_db_save(
    background_tasks: BackgroundTasks,
    keyword: str,
    categoria: Optional[str],
    videos_raw: List[Dict[str, Any]],
    comments_raw: List[Dict[str, Any]],
    comment_results: List[CommentResult],
) -> None:
    if videos_raw:
        background_tasks.add_task(
            _background_save_tiktok_results,
            keyword,
            categoria,
            videos_raw,
            comments_raw,
            comment_results,
        )


def _background_save_tiktok_results(
    keyword: str,
    categoria: Optional[str],
    videos_raw: List[Dict[str, Any]],
    comments_raw: List[Dict[str, Any]],
    comment_results: List[CommentResult],
) -> None:
    try:
        saved = persist_tiktok_results(
            keyword,
            categoria,
            videos_raw,
            comments_raw,
            comment_results,
        )
        logger.info("[background] TikTok guardado en BD: %s", saved)
    except Exception as exc:
        logger.error("[background] Error guardando TikTok en BD: %s", exc, exc_info=True)


def _save_results_to_db(
    db: DatabaseManager,
    keyword: str,
    categoria: Optional[str],
    videos_raw: List[Dict],
    comments_raw: List[Dict],
    comment_results: List[CommentResult]
) -> bool:
    """
    Guarda los videos, comentarios y análisis de sentimientos en la base de datos.
    """
    from src.database.models import Post, Comment, CommentSentiment
    from sqlalchemy.exc import IntegrityError
    
    try:
        with db.get_session() as session:
            # Buscar o crear topic basado en categoría
            topic_id = None
            if categoria:
                topic = db.get_topic_by_name(categoria)
                if topic:
                    topic_id = topic.id
            
            # Mapear video URLs a IDs de posts para comentarios
            video_url_to_post_id = {}
            
            # Guardar videos como posts
            for video in videos_raw:
                video_id = video.get('id') or video.get('webVideoUrl', '')
                url = video.get('webVideoUrl', '')
                
                # Verificar si ya existe
                existing = session.query(Post).filter_by(post_id=video_id).first()
                if existing:
                    video_url_to_post_id[url] = existing.id
                    continue
                
                created_at = None
                fecha_str = video.get('createTimeISO', '')
                if fecha_str:
                    try:
                        created_at = datetime.fromisoformat(fecha_str.replace('Z', '+00:00'))
                    except:
                        pass
                
                hashtags = video.get('hashtags', [])
                hashtags_list = [
                    h.get('name', '') if isinstance(h, dict) else str(h)
                    for h in hashtags
                ]
                hashtags_str = ", ".join(hashtags_list)
                video_text = video.get('text', '') or ''
                video_category = assign_content_category(
                    video_text or hashtags_str,
                    categoria,
                )

                video_topic_id = None
                if video_category:
                    topic = db.get_topic_by_name(video_category)
                    if topic:
                        video_topic_id = topic.id
                
                post = Post(
                    post_id=video_id,
                    text=video_text,
                    post_time=created_at or datetime.now(),
                    post_url=url,
                    likes=video.get('diggCount', 0),
                    comments_count=video.get('commentCount', 0),
                    shares=video.get('shareCount', 0),
                    topic_id=video_topic_id if video_topic_id is not None else topic_id,
                    platform='tiktok',
                    category=video_category or categoria,
                    author_name=video.get('authorMeta', {}).get('name', 'Desconocido'),
                    hashtags=hashtags_str,
                    collected_at=datetime.now()
                )
                
                session.add(post)
                session.flush()  # Para obtener el ID
                video_url_to_post_id[url] = post.id
            
            # Crear mapa de comment_id a resultado de sentimiento
            sentiment_map = {cr.comment_id: cr for cr in comment_results}
            
            # Guardar comentarios
            for comment in comments_raw:
                comment_id = comment.get('cid', '')
                if not comment_id:
                    continue
                
                # Verificar si ya existe
                existing = session.query(Comment).filter_by(comment_id=comment_id).first()
                if existing:
                    continue
                
                video_url = comment.get('videoWebUrl', '')
                post_db_id = video_url_to_post_id.get(video_url)
                
                if not post_db_id:
                    # Intentar encontrar el post por URL
                    post = session.query(Post).filter_by(post_url=video_url).first()
                    if post:
                        post_db_id = post.id
                    else:
                        continue  # No podemos guardar comentario sin post
                
                created_at = None
                fecha_str = comment.get('createTimeISO', '')
                if fecha_str:
                    try:
                        created_at = datetime.fromisoformat(fecha_str.replace('Z', '+00:00'))
                    except:
                        pass
                
                db_comment = Comment(
                    comment_id=comment_id,
                    post_id=post_db_id,
                    original_text=comment.get('text', ''),
                    cleaned_text=comment.get('text', ''),
                    commenter_name=comment.get('uniqueId', 'unknown'),
                    comment_likes=comment.get('diggCount', 0),
                    comment_time=created_at,
                    platform='tiktok',
                    category=categoria,
                    collected_at=datetime.now()
                )
                
                session.add(db_comment)
                session.flush()
                
                # Guardar análisis de sentimiento si existe
                sentiment_data = sentiment_map.get(comment_id)
                if sentiment_data:
                    sentiment = CommentSentiment(
                        comment_id=db_comment.id,
                        sentiment=sentiment_data.sentiment,
                        confidence=sentiment_data.confidence,
                        score_positive=sentiment_data.scores.get('positive', 0),
                        score_negative=sentiment_data.scores.get('negative', 0),
                        score_neutral=sentiment_data.scores.get('neutral', 0),
                        model_used='pysentimiento/robertuito-sentiment-analysis',
                        analyzed_at=datetime.now()
                    )
                    session.add(sentiment)
            
            session.commit()
            return True
            
    except IntegrityError as e:
        logger.warning(f"Error de integridad (datos duplicados): {e}")
        return False
    except Exception as e:
        logger.error(f"Error guardando en BD: {e}")
        return False


@router.get("/status")
async def get_tiktok_status():
    """
    Verificar si el servicio de TikTok está disponible
    """
    apify_token = os.getenv('APIFY_TOKEN')
    
    return {
        "available": bool(apify_token),
        "apify_configured": bool(apify_token),
        "message": "TikTok search disponible" if apify_token else "Configure APIFY_TOKEN para habilitar búsqueda en TikTok"
    }
