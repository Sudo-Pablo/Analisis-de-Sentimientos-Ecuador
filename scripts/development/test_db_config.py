"""
Script para verificar la configuración de base de datos que está cargando el API
"""
import sys
from pathlib import Path

# Agregar la raíz del proyecto al path (subir 2 niveles desde scripts/development)
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from api.config import load_database_config

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🔍 Configuración de Base de Datos Actual")
    print("="*60 + "\n")
    
    try:
        config = load_database_config()
        db_conn = config['database']['connection']
        
        print(f"📍 Host:     {db_conn['host']}")
        print(f"🔌 Puerto:   {db_conn['port']}")
        print(f"💾 Base:     {db_conn['database']}")
        print(f"👤 Usuario:  {db_conn['user']}")
        print(f"🔐 Password: {'*' * len(db_conn['password']) if db_conn['password'] else '(vacía)'}")
        
        print("\n" + "="*60)
        print("✅ Configuración cargada exitosamente")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error al cargar configuración: {e}\n")
        sys.exit(1)
