"""
Servicio compartido de análisis de sentimientos para la API.
Singleton + warmup opcional (no cargar torch/BETO al importar el módulo).
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from src.analyzers.sentiment_analyzer import SentimentAnalyzer

logger = logging.getLogger(__name__)

_ANALYZER: Optional["SentimentAnalyzer"] = None


def get_sentiment_analyzer() -> "SentimentAnalyzer":
    global _ANALYZER
    if _ANALYZER is None:
        from src.analyzers.sentiment_analyzer import SentimentAnalyzer

        logger.info("Inicializando SentimentAnalyzer (singleton API)...")
        _ANALYZER = SentimentAnalyzer()
    return _ANALYZER


def warmup_sentiment_analyzer() -> None:
    """Precarga el modelo ejecutando una inferencia mínima."""
    try:
        analyzer = get_sentiment_analyzer()
        analyzer.analyze_sentiment("Servicio listo")
        logger.info("Warmup del analizador de sentimientos completado")
    except Exception as exc:
        logger.warning("Warmup del analizador falló (se cargará en la 1ª búsqueda): %s", exc)
