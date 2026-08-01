"""
Router para endpoints de sentimientos
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
import sys
import logging
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

from api.schemas import (
    SentimentStats,
    SentimentDistribution,
    DashboardSummary,
    TopicSentimentEvolution,
    TimeSeriesPoint,
    SocialNetworkDistribution,
    CommentResponse,
    CommentSentimentResponse,
    PostInfo
)
from api.config import load_database_config
from src.database.db_manager import DatabaseManager

logger = logging.getLogger(__name__)
router = APIRouter()

# Cargar configuración una sola vez
try:
    db_config = load_database_config()
except Exception as e:
    logger.error(f"Error al cargar configuración de BD: {e}")
    db_config = None


@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard_summary(
    days: int = Query(default=30, ge=0, le=3650, description="Días hacia atrás (0 = todo el historial)"),
    platform: Optional[str] = Query(default=None, description="Filtrar por plataforma (facebook, tiktok)"),
    topic_id: Optional[int] = Query(default=None, description="Filtrar por tema"),
    start_date: Optional[datetime] = Query(default=None, description="Fecha inicio (ISO, YYYY-MM-DD o datetime)"),
    end_date: Optional[datetime] = Query(default=None, description="Fecha fin (ISO, YYYY-MM-DD o datetime)"),
):
    """
    Obtener resumen para dashboard principal
    """
    try:
        if not db_config:
            raise HTTPException(status_code=500, detail="Configuración de BD no disponible")
        
        db = DatabaseManager(db_config)

        # Soportar rango exacto de fechas (start_date/end_date) si se envía desde la UI.
        effective_start = start_date
        effective_end = end_date

        if effective_end is not None:
            # Inclusivo: hasta el final del día.
            effective_end = effective_end.replace(hour=23, minute=59, second=59, microsecond=999999)

        if effective_start is None:
            effective_start = datetime(1970, 1, 1) if days == 0 else datetime.now() - timedelta(days=days)

        if effective_end is None:
            effective_end = datetime.now()

        # Obtener datos desde el inicio del rango.
        # El filtro de fechas usa collected_at (cuándo se analizó/guardó),
        # no comment_time (fecha original en la red social).
        comments = db.get_comments_since(effective_start)
        posts = db.get_posts_since(effective_start)

        def _in_range(dt):
            if dt is None:
                return False
            return effective_start <= dt <= effective_end

        comments = [c for c in comments if _in_range(c.collected_at)]
        posts = [p for p in posts if _in_range(p.collected_at)]
        
        # Filtrar por plataforma si se especifica
        if platform:
            platform_lower = platform.lower()
            comments = [c for c in comments if (getattr(c.post, 'platform', '') or '').lower() == platform_lower]
            posts = [p for p in posts if (p.platform or '').lower() == platform_lower]
        
        # Filtrar por topic si se especifica
        if topic_id:
            comments = [c for c in comments if c.post and c.post.topic_id == topic_id]
            posts = [p for p in posts if p.topic_id == topic_id]
        
        # Calcular distribución de sentimientos
        sentiment_counts = {"positivo": 0, "negativo": 0, "neutral": 0}
        for comment in comments:
            if comment.sentiment:
                label = (comment.sentiment.sentiment or "").strip().lower()
                if label in sentiment_counts:
                    sentiment_counts[label] += 1

        # El total mostrado debe coincidir con la suma de etiquetados
        # (positivos + negativos + neutrales), no con comentarios sin análisis.
        total_comments = (
            sentiment_counts["positivo"]
            + sentiment_counts["negativo"]
            + sentiment_counts["neutral"]
        )
        comments_in_range = len(comments)
        
        # Breakdown por temas
        topics = db.get_active_topics()
        topics_breakdown = []
        
        for topic in topics:
            topic_comments = [c for c in comments if c.post.topic_id == topic.id]
            topic_sentiment_counts = {"positivo": 0, "negativo": 0, "neutral": 0}
            
            for comment in topic_comments:
                if comment.sentiment:
                    topic_sentiment_counts[comment.sentiment.sentiment] += 1
            
            topics_breakdown.append({
                "topic_id": topic.id,
                "topic_name": topic.name,
                "total": len(topic_comments),
                "positive": topic_sentiment_counts["positivo"],
                "negative": topic_sentiment_counts["negativo"],
                "neutral": topic_sentiment_counts["neutral"]
            })
        
        # Distribución por red social - calculada dinámicamente desde platform
        platform_counts = {}
        for comment in comments:
            # La plataforma está en el post relacionado
            platform = getattr(comment.post, 'platform', 'facebook') or 'facebook'
            platform = platform.lower()
            platform_counts[platform] = platform_counts.get(platform, 0) + 1
        
        # Mapeo de nombres para la UI
        platform_names = {
            'facebook': 'Facebook',
            'tiktok': 'TikTok',
            'twitter': 'Twitter',
            'instagram': 'Instagram'
        }
        
        social_networks = []
        for platform, count in platform_counts.items():
            percentage = (count / comments_in_range * 100) if comments_in_range > 0 else 0
            social_networks.append(
                SocialNetworkDistribution(
                    name=platform_names.get(platform, platform.capitalize()),
                    value=count,
                    percentage=percentage
                )
            )
        
        # Si no hay datos, agregar valor por defecto
        if not social_networks:
            social_networks = [
                SocialNetworkDistribution(name="Sin datos", value=0, percentage=0)
            ]
        
        # Comentarios recientes — serializar con info del post
        sorted_comments = sorted(
            comments,
            key=lambda c: c.comment_time or c.collected_at or datetime.min,
            reverse=True,
        )[:40]
        
        recent_comments = []
        for comment in sorted_comments:
            # Preparar info del post
            post_info = None
            if comment.post:
                post_info = PostInfo(
                    id=comment.post.id,
                    post_id=comment.post.post_id,
                    platform=comment.post.platform or 'facebook',
                    topic_id=comment.post.topic_id,
                    category=comment.post.category
                )
            
            # Preparar info de sentimiento
            sentiment_info = None
            if comment.sentiment:
                sentiment_info = CommentSentimentResponse(
                    id=comment.sentiment.id,
                    comment_id=comment.sentiment.comment_id,
                    sentiment=comment.sentiment.sentiment,
                    confidence=comment.sentiment.confidence,
                    model_used=comment.sentiment.model_used or 'unknown',
                    analyzed_at=comment.sentiment.analyzed_at or datetime.now()
                )
            
            recent_comments.append(CommentResponse(
                id=comment.id,
                comment_id=comment.comment_id,
                post_id=comment.post_id,
                original_text=comment.original_text or '',
                cleaned_text=comment.cleaned_text,
                commenter_name=comment.commenter_name,
                comment_time=comment.comment_time,
                comment_likes=comment.comment_likes or 0,
                platform=comment.platform,
                post=post_info,
                sentiment=sentiment_info,
                collected_at=comment.collected_at
            ))
        
        return DashboardSummary(
            total_comments=total_comments,
            total_posts=len(posts),
            sentiment_distribution=SentimentDistribution(
                positive=sentiment_counts["positivo"],
                negative=sentiment_counts["negativo"],
                neutral=sentiment_counts["neutral"],
                total=total_comments
            ),
            topics_breakdown=topics_breakdown,
            social_networks=social_networks,
            recent_comments=recent_comments,
            date_range={
                "start_date": effective_start.isoformat(),
                "end_date": effective_end.isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error al obtener dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=SentimentStats)
async def get_sentiment_stats(
    topic_id: Optional[int] = Query(default=None, description="ID del tema (opcional)"),
    days: int = Query(default=7, ge=1, le=90, description="Días hacia atrás")
):
    """
    Obtener estadísticas de sentimientos
    Puede filtrar por tema específico
    """
    try:
        if not db_config:
            raise HTTPException(status_code=500, detail="Configuración de BD no disponible")
        
        db = DatabaseManager(db_config)
        cutoff_date = datetime(1970, 1, 1) if days == 0 else datetime.now() - timedelta(days=days)
        
        # Obtener comentarios
        if topic_id:
            comments = db.get_comments_by_topic_since(topic_id, cutoff_date)
            topic = db.get_topic_by_id(topic_id)
            topic_name = topic.name if topic else None
        else:
            comments = db.get_comments_since(cutoff_date)
            topic_name = "Todos los temas"
        
        # Contar sentimientos
        sentiment_counts = {"positivo": 0, "negativo": 0, "neutral": 0}
        for comment in comments:
            if comment.sentiment:
                sentiment_counts[comment.sentiment.sentiment] += 1
        
        total = len(comments)
        
        return SentimentStats(
            topic_id=topic_id,
            topic_name=topic_name,
            distribution=SentimentDistribution(
                positive=sentiment_counts["positivo"],
                negative=sentiment_counts["negativo"],
                neutral=sentiment_counts["neutral"],
                total=total
            ),
            positive_percentage=(sentiment_counts["positivo"] / total * 100) if total > 0 else 0.0,
            negative_percentage=(sentiment_counts["negativo"] / total * 100) if total > 0 else 0.0,
            neutral_percentage=(sentiment_counts["neutral"] / total * 100) if total > 0 else 0.0,
            date_range={
                "start_date": cutoff_date.isoformat(),
                "end_date": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error al obtener estadísticas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/evolution", response_model=List[TopicSentimentEvolution])
async def get_sentiment_evolution(
    days: int = Query(default=30, ge=0, le=3650, description="Días hacia atrás (0 = todo el historial)")
):
    """
    Obtener evolución temporal de sentimientos por tema
    """
    try:
        if not db_config:
            raise HTTPException(status_code=500, detail="Configuración de BD no disponible")
        
        db = DatabaseManager(db_config)
        cutoff_date = datetime(1970, 1, 1) if days == 0 else datetime.now() - timedelta(days=days)
        
        topics = db.get_active_topics()
        evolution_data = []
        
        for topic in topics:
            comments = db.get_comments_by_topic_since(topic.id, cutoff_date)
            
            # Agrupar por día
            daily_data = {}
            for comment in comments:
                if not comment.comment_time or not comment.sentiment:
                    continue
                
                date_key = comment.comment_time.date().isoformat()
                
                if date_key not in daily_data:
                    daily_data[date_key] = {"positivo": 0, "negativo": 0, "neutral": 0}
                
                daily_data[date_key][comment.sentiment.sentiment] += 1
            
            # Convertir a lista de TimeSeriesPoint
            time_series = []
            for date_str in sorted(daily_data.keys()):
                counts = daily_data[date_str]
                time_series.append(
                    TimeSeriesPoint(
                        date=date_str,
                        positive=counts["positivo"],
                        negative=counts["negativo"],
                        neutral=counts["neutral"],
                        total=sum(counts.values())
                    )
                )
            
            evolution_data.append(
                TopicSentimentEvolution(
                    topic_id=topic.id,
                    topic_name=topic.name,
                    data=time_series
                )
            )
        
        return evolution_data
        
    except Exception as e:
        logger.error(f"Error al obtener evolución: {e}")
        raise HTTPException(status_code=500, detail=str(e))
