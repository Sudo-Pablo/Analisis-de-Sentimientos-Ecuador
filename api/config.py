"""
Helper para inicializar DatabaseManager con configuración
"""
import json
import os
from pathlib import Path
from typing import Dict, Optional
from urllib.parse import unquote, urlparse
from dotenv import load_dotenv


def _parse_database_url(url: str) -> Optional[Dict[str, str]]:
    """
    Parsea postgresql://user:pass@host:port/dbname (Internal/External de Render).
    """
    raw = (url or "").strip()
    if not raw:
        return None
    if "://" not in raw:
        return None

    parsed = urlparse(raw)
    if parsed.scheme not in {"postgres", "postgresql", "postgresql+psycopg2"}:
        return None
    if not parsed.hostname:
        return None

    db_name = (parsed.path or "").lstrip("/")
    if not db_name:
        return None

    return {
        "host": parsed.hostname,
        "port": str(parsed.port or 5432),
        "database": unquote(db_name),
        "user": unquote(parsed.username or ""),
        "password": unquote(parsed.password or ""),
    }


def resolve_db_env() -> Dict[str, str]:
    """
    Resuelve credenciales desde:
    1) DATABASE_URL / INTERNAL_DATABASE_URL (URL completa)
    2) DB_HOST si accidentalmente contiene una URL completa
    3) DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD por separado
    """
    for key in ("DATABASE_URL", "INTERNAL_DATABASE_URL", "RENDER_DATABASE_URL"):
        parsed = _parse_database_url(os.getenv(key, ""))
        if parsed:
            return parsed

    host_raw = os.getenv("DB_HOST", "localhost").strip()
    parsed_host = _parse_database_url(host_raw)
    if parsed_host:
        # Si DB_HOST trae URL completa, preferir sus partes; permitir overrides parciales
        return {
            "host": parsed_host["host"],
            "port": os.getenv("DB_PORT") or parsed_host["port"],
            "database": os.getenv("DB_NAME") or parsed_host["database"],
            "user": os.getenv("DB_USER") or parsed_host["user"],
            "password": os.getenv("DB_PASSWORD") or parsed_host["password"],
        }

    # Caso frecuente en Render: pegar "host/dbname" en DB_HOST
    host_only = host_raw or "localhost"
    db_from_host = ""
    if "/" in host_only and "://" not in host_only:
        host_only, db_from_host = host_only.split("/", 1)
        host_only = host_only.strip()
        db_from_host = db_from_host.strip()

    return {
        "host": host_only or "localhost",
        "port": os.getenv("DB_PORT", "5432"),
        "database": os.getenv("DB_NAME") or db_from_host or "sentiment_analysis",
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", ""),
    }


def load_database_config() -> Dict:
    """
    Carga la configuración de base de datos desde archivo JSON
    y variables de entorno
    
    Returns:
        Diccionario con configuración para DatabaseManager
    """
    # Cargar .env
    load_dotenv()
    
    # Buscar config/database/database.json desde el directorio actual
    # Primero intenta desde __file__, luego desde cwd
    file_based_path = Path(__file__).parent.parent / 'config' / 'database' / 'database.json'
    cwd_based_path = Path('config') / 'database' / 'database.json'
    
    # Seleccionar la ruta que exista
    if file_based_path.exists():
        config_path = file_based_path
    elif cwd_based_path.exists():
        config_path = cwd_based_path
    else:
        # Intenta buscar en directorios comunes
        possible_paths = [
            Path(__file__).parent.parent / 'config' / 'database' / 'database.json',
            Path.cwd() / 'config' / 'database' / 'database.json',
            Path.cwd().parent / 'config' / 'database' / 'database.json' if Path.cwd().name == 'TESIS PABLO' else None,
        ]
        config_path = next((p for p in possible_paths if p and p.exists()), None)
        
        if not config_path:
            raise FileNotFoundError(f"No se encontró config/database/database.json en rutas: {[str(p) for p in possible_paths if p]}")
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    env_vars = resolve_db_env()
    
    # Actualizar configuración con variables de entorno
    config['database']['connection']['host'] = env_vars['host']
    config['database']['connection']['port'] = int(env_vars['port'])
    config['database']['connection']['database'] = env_vars['database']
    config['database']['connection']['user'] = env_vars['user']
    config['database']['connection']['password'] = env_vars['password']
    
    return config
