"""
Script para agregar las columnas de soporte multiplataforma a las tablas existentes.
Ejecutar una sola vez para actualizar el esquema de la base de datos.
"""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from sqlalchemy import text
from src.database.db_manager import get_db_manager


def migrate_database():
    """Agrega columnas para soporte multiplataforma"""
    
    db_manager = get_db_manager()
    
    migrations = [
        # Columnas para fb_posts
        "ALTER TABLE fb_posts ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'facebook';",
        "ALTER TABLE fb_posts ADD COLUMN IF NOT EXISTS category VARCHAR(50);",
        "ALTER TABLE fb_posts ADD COLUMN IF NOT EXISTS author_name VARCHAR(200);",
        "ALTER TABLE fb_posts ADD COLUMN IF NOT EXISTS hashtags TEXT;",
        
        # Columnas para fb_comments
        "ALTER TABLE fb_comments ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'facebook';",
        "ALTER TABLE fb_comments ADD COLUMN IF NOT EXISTS category VARCHAR(50);",
    ]
    
    print("=== MIGRACIÓN DE BASE DE DATOS MULTIPLATAFORMA ===\n")
    
    with db_manager.engine.connect() as conn:
        for i, sql in enumerate(migrations, 1):
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"[{i}/{len(migrations)}] OK: {sql[:60]}...")
            except Exception as e:
                if "already exists" in str(e).lower() or "ya existe" in str(e).lower():
                    print(f"[{i}/{len(migrations)}] SKIP (ya existe): {sql[:60]}...")
                else:
                    print(f"[{i}/{len(migrations)}] ERROR: {e}")
    
    print("\n=== MIGRACIÓN COMPLETADA ===")


if __name__ == "__main__":
    migrate_database()
