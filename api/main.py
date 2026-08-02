"""
API REST FastAPI para Sistema de Análisis de Sentimientos
Expone endpoints para consumir datos desde el frontend React
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime, timedelta
import os
import sys
import logging
from pathlib import Path

# Agregar src al path
sys.path.append(str(Path(__file__).parent.parent))

from api.routes import (
    sentiments,
    topics,
    reports,
    comments,
    posts,
    tiktok_search,
    facebook_search,
    unified_search,
    search_trends,
    internal,
)
from api.sentiment_service import warmup_sentiment_analyzer

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Arranque API: precalentando modelo de sentimientos...")
    warmup_sentiment_analyzer()
    yield
    logger.info("API detenida")


# Crear app FastAPI
app = FastAPI(
    title="Sentiment Analysis API",
    description="API para análisis de sentimientos en redes sociales",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: en producción define ALLOWED_ORIGINS en .env (URLs separadas por coma)
_default_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]
_env_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_env_origins or _default_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(sentiments.router, prefix="/api/sentiments", tags=["Sentiments"])
app.include_router(topics.router, prefix="/api/topics", tags=["Topics"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(comments.router, prefix="/api/comments", tags=["Comments"])
app.include_router(posts.router, prefix="/api/posts", tags=["Posts"])
app.include_router(tiktok_search.router, prefix="/api/tiktok", tags=["TikTok"])
app.include_router(facebook_search.router, prefix="/api/facebook", tags=["Facebook"])
app.include_router(unified_search.router, prefix="/api/search", tags=["Unified Search"])
app.include_router(search_trends.router, prefix="/api/search", tags=["Search Trends"])
app.include_router(internal.router, prefix="/api/internal", tags=["Internal / Cron"])

@app.get("/")
async def root():
    """
    Health check endpoint
    """
    return {
        "status": "ok",
        "service": "Sentiment Analysis API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/health")
async def health_check():
    """
    Verificar estado de la API y base de datos
    """
    from src.database.db_manager import DatabaseManager
    
    try:
        db = DatabaseManager()
        # Intentar obtener temas para verificar conexión
        topics = db.get_active_topics()
        db_status = "connected"
        topics_count = len(topics)
    except Exception as e:
        logger.error(f"Error en health check: {e}")
        db_status = "error"
        topics_count = 0
    
    return {
        "status": "healthy",
        "database": db_status,
        "topics_available": topics_count,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
