"""
Cargador de archivos de configuración
"""
import json
import os
from pathlib import Path
from typing import Dict
from dotenv import load_dotenv


def load_config(config_file: str) -> Dict:
    """
    Carga un archivo de configuración JSON
    
    Args:
        config_file: Ruta al archivo de configuración
        
    Returns:
        Diccionario con la configuración
    """
    config_path = Path(config_file)
    
    if not config_path.exists():
        raise FileNotFoundError(f"Archivo de configuración no encontrado: {config_file}")
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    return config


def load_env_config() -> Dict:
    """
    Carga variables de entorno desde .env
    
    Returns:
        Diccionario con variables de entorno
    """
    load_dotenv()
    
    return {
        'facebook_token': os.getenv('FACEBOOK_ACCESS_TOKEN', ''),
        'db_host': os.getenv('DB_HOST', 'localhost'),
        'db_port': int(os.getenv('DB_PORT', 5432)),
        'db_name': os.getenv('DB_NAME', 'sentiment_analysis'),
        'db_user': os.getenv('DB_USER', 'postgres'),
        'db_password': os.getenv('DB_PASSWORD', ''),
        'log_level': os.getenv('LOG_LEVEL', 'INFO'),
        'data_dir': os.getenv('DATA_DIR', './data'),
        'environment': os.getenv('ENVIRONMENT', 'development'),
    }


def load_all_configs() -> Dict:
    """
    Carga todas las configuraciones necesarias
    
    Returns:
        Diccionario con todas las configuraciones
    """
    # Cargar variables de entorno
    env_config = load_env_config()
    
    # Cargar configuraciones
    topics = load_config('config/topics.json')
    facebook_pages = load_config('config/facebook_pages.json')
    database_config = load_config('config/database.json')
    
    # Reemplazar variables de entorno en configuración de BD
    db_conn = database_config['database']['connection']
    db_conn['host'] = env_config['db_host']
    db_conn['port'] = env_config['db_port']
    db_conn['database'] = env_config['db_name']
    db_conn['user'] = env_config['db_user']
    db_conn['password'] = env_config['db_password']
    
    return {
        'env': env_config,
        'topics': topics['topics'],
        'facebook_pages': facebook_pages,
        'database': database_config
    }
