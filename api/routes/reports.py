"""
Router para endpoints de reportes semanales
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
import sys
import logging
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

from api.schemas import WeeklyReportResponse
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


@router.get("/", response_model=List[WeeklyReportResponse])
async def get_reports(
    topic_id: Optional[int] = Query(default=None, description="Filtrar por tema"),
    weeks: int = Query(default=4, ge=1, le=52, description="Número de semanas hacia atrás")
):
    """
    Obtener reportes semanales
    """
    try:
        if not db_config:
            raise HTTPException(status_code=500, detail="Configuración de BD no disponible")
        
        db = DatabaseManager(db_config)
        cutoff_date = datetime.now() - timedelta(weeks=weeks)
        
        # Obtener reportes
        if topic_id:
            reports = db.get_weekly_reports_by_topic(topic_id, cutoff_date)
        else:
            reports = db.get_weekly_reports_since(cutoff_date)
        
        # Ordenar por fecha descendente
        reports = sorted(reports, key=lambda r: r.report_date, reverse=True)
        
        logger.info(f"Retornando {len(reports)} reportes semanales")
        
        return reports
        
    except Exception as e:
        logger.error(f"Error al obtener reportes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest", response_model=WeeklyReportResponse)
async def get_latest_report(topic_id: Optional[int] = Query(default=None)):
    """
    Obtener el reporte semanal más reciente
    """
    try:
        if not db_config:
            raise HTTPException(status_code=500, detail="Configuración de BD no disponible")
        
        db = DatabaseManager(db_config)
        
        if topic_id:
            report = db.get_latest_report_by_topic(topic_id)
        else:
            # Obtener el reporte más reciente en general
            reports = db.get_weekly_reports_since(datetime.now() - timedelta(weeks=1))
            report = max(reports, key=lambda r: r.report_date) if reports else None
        
        if not report:
            raise HTTPException(
                status_code=404, 
                detail=f"No se encontró reporte reciente{' para el tema ' + str(topic_id) if topic_id else ''}"
            )
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener último reporte: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{report_id}", response_model=WeeklyReportResponse)
async def get_report(report_id: int):
    """
    Obtener un reporte específico por ID
    """
    try:
        if not db_config:
            raise HTTPException(status_code=500, detail="Configuración de BD no disponible")
        
        db = DatabaseManager(db_config)
        report = db.get_weekly_report_by_id(report_id)
        
        if not report:
            raise HTTPException(status_code=404, detail=f"Reporte con ID {report_id} no encontrado")
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener reporte {report_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
