"""
Script para ejecutar el servidor FastAPI
"""
import os
import sys
from pathlib import Path

# Agregar el directorio raíz al path
root_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(root_dir))

if __name__ == "__main__":
    import uvicorn

    config = {
        "app": "api.main:app",
        "host": "0.0.0.0",
        "port": 8000,
        "reload": True,
        "log_level": "info",
    }

    print("=" * 60)
    print("Iniciando API de Análisis de Sentimientos")
    print("=" * 60)
    print(f"URL: http://localhost:{config['port']}")
    print(f"Documentación: http://localhost:{config['port']}/docs")
    print(f"Redoc: http://localhost:{config['port']}/redoc")
    print("=" * 60)

    uvicorn.run(**config)
