"""
Paquete principal del Sistema de Análisis de Sentimientos.

Este paquete contiene todos los módulos principales:
- analyzers: Analizadores de sentimientos (HuggingFace, etc.)
- cleaners: Limpieza y preprocesamiento de texto
- collectors: Recolectores de datos (Facebook, TikTok)
- database: Gestión de base de datos y modelos
- scraper: Scraper de Facebook con Playwright
- utils: Utilidades (logger, config_loader)
"""

__version__ = "1.0.0"
__author__ = "Equipo de Desarrollo"

# Imports principales para facilitar acceso
from src.database.db_manager import DatabaseManager, get_db_manager
from src.utils.logger import setup_logger
from src.utils.config_loader import load_config, load_env_config
