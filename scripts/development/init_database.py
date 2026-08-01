"""
Script para inicializar el esquema de la base de datos
"""
import sys
from pathlib import Path

# Agregar la raíz del proyecto al path (subir 2 niveles desde scripts/development)
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from api.config import load_database_config
from src.database.db_manager import DatabaseManager

def init_database():
    """Inicializa el esquema de la base de datos"""
    print("\n" + "="*60)
    print("🔧 Inicializando Esquema de Base de Datos")
    print("="*60 + "\n")
    
    try:
        # Cargar configuración
        print("⏳ Cargando configuración...")
        config = load_database_config()
        db_conn = config['database']['connection']
        
        print(f"📍 Host: {db_conn['host']}")
        print(f"💾 Base de datos: {db_conn['database']}\n")
        
        # Crear gestor de BD
        print("⏳ Conectando a PostgreSQL...")
        db = DatabaseManager(config)
        
        # Crear tablas
        print("⏳ Creando tablas...")
        db.create_tables()
        
        print("\n✅ Tablas creadas exitosamente:")
        print("   - topics")
        print("   - facebook_pages")
        print("   - fb_posts")
        print("   - fb_comments")
        print("   - comment_sentiments")
        print("   - weekly_reports")
        
        print("\n" + "="*60)
        print("✅ Base de Datos Inicializada Correctamente")
        print("="*60 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error al inicializar base de datos: {e}\n")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
