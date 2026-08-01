"""
Router para endpoints de temas
"""
from fastapi import APIRouter, HTTPException
from typing import List
import sys
import logging
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

from api.schemas import TopicResponse
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


@router.get("/", response_model=List[TopicResponse])
async def get_all_topics(active_only: bool = True):
    """
    Obtener todos los temas
    """
    try:
        if not db_config:
            raise HTTPException(status_code=500, detail="Configuración de BD no disponible")
        
        db = DatabaseManager(db_config)
        
        if active_only:
            topics = db.get_active_topics()
        else:
            # Implementar get_all_topics si se necesita
            topics = db.get_active_topics()
        
        return topics
        
    except Exception as e:
        logger.error(f"Error al obtener temas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{topic_id}", response_model=TopicResponse)
async def get_topic(topic_id: int):
    """
    Obtener un tema específico por ID
    """
    try:
        if not db_config:
            raise HTTPException(status_code=500, detail="Configuración de BD no disponible")
        
        db = DatabaseManager(db_config)
        topic = db.get_topic_by_id(topic_id)
        
        if not topic:
            raise HTTPException(status_code=404, detail=f"Tema con ID {topic_id} no encontrado")
        
        return topic
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener tema {topic_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
