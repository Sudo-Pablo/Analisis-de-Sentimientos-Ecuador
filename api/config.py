"""
Helper para inicializar DatabaseManager con configuración
"""
import json
import os
from pathlib import Path
from typing import Dict
from dotenv import load_dotenv


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
    
    # Reemplazar variables de entorno
    env_vars = {
        'DB_HOST': os.getenv('DB_HOST', 'localhost'),
        'DB_PORT': os.getenv('DB_PORT', '5432'),
        'DB_NAME': os.getenv('DB_NAME', 'sentiment_analysis'),
        'DB_USER': os.getenv('DB_USER', 'postgres'),
        'DB_PASSWORD': os.getenv('DB_PASSWORD', ''),
    }
    
    # Actualizar configuración con variables de entorno
    config['database']['connection']['host'] = env_vars['DB_HOST']
    config['database']['connection']['port'] = int(env_vars['DB_PORT'])
    config['database']['connection']['database'] = env_vars['DB_NAME']
    config['database']['connection']['user'] = env_vars['DB_USER']
    config['database']['connection']['password'] = env_vars['DB_PASSWORD']
    
    return config
