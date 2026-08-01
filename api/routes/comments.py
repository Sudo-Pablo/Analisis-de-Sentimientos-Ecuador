"""
Router para endpoints de comentarios
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
import sys
import logging
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

from api.schemas import CommentResponse
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


@router.get("/", response_model=List[CommentResponse])
async def get_comments(
    topic_id: Optional[int] = Query(default=None, description="Filtrar por tema"),
    sentiment: Optional[str] = Query(default=None, description="Filtrar por sentimiento (positivo, negativo, neutral)"),
    days: int = Query(default=7, ge=0, le=3650, description="Días hacia atrás (0 = todo el historial)"),
    limit: int = Query(default=100, ge=1, le=1000, description="Límite de resultados"),
    offset: int = Query(default=0, ge=0, description="Offset para paginación"),
    start_date: Optional[datetime] = Query(default=None, description="Fecha inicio (ISO, YYYY-MM-DD o datetime)"),
    end_date: Optional[datetime] = Query(default=None, description="Fecha fin (ISO, YYYY-MM-DD o datetime)"),
):
    """
    Obtener comentarios con filtros opcionales
    """
    try:
        if not db_config:
            raise HTTPException(status_code=500, detail="Configuración de BD no disponible")
        
        db = DatabaseManager(db_config)

        effective_start = start_date
        effective_end = end_date

        if effective_end is not None:
            effective_end = effective_end.replace(hour=23, minute=59, second=59, microsecond=999999)

        if effective_start is None:
            effective_start = datetime(1970, 1, 1) if days == 0 else datetime.now() - timedelta(days=days)

        if effective_end is None:
            effective_end = datetime.now()
        
        # Obtener comentarios según filtros (por collected_at desde el inicio del rango)
        if topic_id:
            comments = db.get_comments_by_topic_since(topic_id, effective_start)
        else:
            comments = db.get_comments_since(effective_start)

        def _in_range(dt):
            if dt is None:
                return False
            return effective_start <= dt <= effective_end

        comments = [c for c in comments if _in_range(c.collected_at)]
        
        # Filtrar por sentimiento si se especifica
        if sentiment:
            comments = [c for c in comments if c.sentiment and c.sentiment.sentiment == sentiment.lower()]
        
        # Ordenar por fecha de recolección descendente
        comments = sorted(
            comments,
            key=lambda c: c.collected_at or c.comment_time or datetime.min,
            reverse=True,
        )
        
        # Aplicar paginación
        total = len(comments)
        comments = comments[offset:offset + limit]
        
        logger.info(f"Retornando {len(comments)} de {total} comentarios")
        
        return comments
        
    except Exception as e:
        logger.error(f"Error al obtener comentarios: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{comment_id}", response_model=CommentResponse)
async def get_comment(comment_id: int):
    """
    Obtener un comentario específico por ID
    """
    try:
        if not db_config:
            raise HTTPException(status_code=500, detail="Configuración de BD no disponible")
        
        db = DatabaseManager(db_config)
        comment = db.get_comment_by_id(comment_id)
        
        if not comment:
            raise HTTPException(status_code=404, detail=f"Comentario con ID {comment_id} no encontrado")
        
        return comment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener comentario {comment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
