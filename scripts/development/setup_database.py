"""
Script para verificar y crear la base de datos PostgreSQL
"""
import sys
from pathlib import Path
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv
import os

# Cargar variables de entorno
load_dotenv()

DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'sentiment_analysis')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')

def check_and_create_database():
    """Verifica si la BD existe, si no la crea"""
    print("\n" + "="*60)
    print("🔍 Verificando Base de Datos PostgreSQL")
    print("="*60 + "\n")
    
    print(f"📍 Host: {DB_HOST}")
    print(f"🔌 Puerto: {DB_PORT}")
    print(f"👤 Usuario: {DB_USER}")
    print(f"💾 Base de datos: {DB_NAME}\n")
    
    try:
        # Conectar a la base de datos postgres (por defecto)
        print("⏳ Conectando a PostgreSQL...")
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database='postgres',
            user=DB_USER,
            password=DB_PASSWORD
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Verificar si la BD existe
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (DB_NAME,)
        )
        exists = cursor.fetchone()
        
        if exists:
            print(f"✅ La base de datos '{DB_NAME}' ya existe\n")
        else:
            print(f"⚠️  La base de datos '{DB_NAME}' no existe")
            print(f"📝 Creando base de datos '{DB_NAME}'...")
            cursor.execute(f'CREATE DATABASE {DB_NAME}')
            print(f"✅ Base de datos '{DB_NAME}' creada exitosamente\n")
        
        cursor.close()
        conn.close()
        
        # Ahora probar conexión a la BD específica
        print(f"⏳ Probando conexión a '{DB_NAME}'...")
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        print(f"✅ Conexión exitosa a '{DB_NAME}'\n")
        
        # Verificar si las tablas existen
        cursor = conn.cursor()
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        if tables:
            print("📋 Tablas existentes:")
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print("⚠️  No hay tablas creadas")
            print("💡 Ejecuta el script de inicialización de la BD")
        
        cursor.close()
        conn.close()
        
        print("\n" + "="*60)
        print("✅ Configuración de Base de Datos OK")
        print("="*60 + "\n")
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Error de PostgreSQL: {e}\n")
        print("💡 Verifica que:")
        print("   1. PostgreSQL esté ejecutándose")
        print("   2. Las credenciales en .env sean correctas")
        print("   3. El usuario tenga permisos suficientes\n")
        return False
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}\n")
        return False

if __name__ == "__main__":
    success = check_and_create_database()
    sys.exit(0 if success else 1)
