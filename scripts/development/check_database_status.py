"""
Script para verificar el estado de la base de datos.
Muestra conteos de tablas y datos recientes.
"""
import sys
import os

# Agregar la raíz del proyecto al path (subir 2 niveles desde scripts/development)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from datetime import datetime, timedelta
from src.database.db_manager import get_db_manager
from src.database.models import Post, Comment, CommentSentiment, Topic


def check_database():
    """Verifica el estado de la base de datos"""
    print("=" * 60)
    print("VERIFICACIÓN DE BASE DE DATOS")
    print("=" * 60)
    print()
    
    try:
        db = get_db_manager()
        print("✓ Conexión a base de datos establecida")
        print()
    except Exception as e:
        print(f"✗ Error conectando a la BD: {e}")
        return
    
    session = db.get_session()
    
    try:
        # Verificar tablas
        print("=== CONTEO DE REGISTROS ===")
        
        # Posts
        try:
            post_count = session.query(Post).count()
            print(f"Posts (fb_posts):           {post_count}")
        except Exception as e:
            print(f"Posts: ERROR - {e}")
        
        # Comments
        try:
            comment_count = session.query(Comment).count()
            print(f"Comentarios (fb_comments):  {comment_count}")
        except Exception as e:
            print(f"Comentarios: ERROR - {e}")
        
        # Sentiments
        try:
            sentiment_count = session.query(CommentSentiment).count()
            print(f"Análisis de sentimientos:   {sentiment_count}")
        except Exception as e:
            print(f"Sentimientos: ERROR - {e}")
        
        # Topics
        try:
            topic_count = session.query(Topic).count()
            print(f"Temas (topics):             {topic_count}")
        except Exception as e:
            print(f"Temas: ERROR - {e}")
        
        print()
        
        # Datos recientes (últimos 7 días)
        print("=== DATOS ÚLTIMOS 7 DÍAS ===")
        cutoff = datetime.now() - timedelta(days=7)
        
        try:
            recent_posts = session.query(Post).filter(Post.collected_at >= cutoff).count()
            print(f"Posts recientes:            {recent_posts}")
        except Exception as e:
            print(f"Posts recientes: ERROR - {e}")
        
        try:
            recent_comments = session.query(Comment).filter(Comment.collected_at >= cutoff).count()
            print(f"Comentarios recientes:      {recent_comments}")
        except Exception as e:
            print(f"Comentarios recientes: ERROR - {e}")
        
        print()
        
        # Verificar columna platform si existe
        print("=== VERIFICACIÓN DE COLUMNAS MULTIPLATAFORMA ===")
        from sqlalchemy import inspect
        
        inspector = inspect(db.engine)
        
        # Columnas de fb_posts
        try:
            post_columns = [col['name'] for col in inspector.get_columns('fb_posts')]
            has_platform = 'platform' in post_columns
            print(f"fb_posts tiene 'platform':  {'✓ Sí' if has_platform else '✗ No'}")
        except Exception as e:
            print(f"Error verificando fb_posts: {e}")
        
        # Columnas de fb_comments
        try:
            comment_columns = [col['name'] for col in inspector.get_columns('fb_comments')]
            has_platform = 'platform' in comment_columns
            print(f"fb_comments tiene 'platform': {'✓ Sí' if has_platform else '✗ No'}")
        except Exception as e:
            print(f"Error verificando fb_comments: {e}")
        
        print()
        
        # Muestra de temas
        print("=== TEMAS CONFIGURADOS ===")
        try:
            topics = session.query(Topic).all()
            if topics:
                for topic in topics:
                    print(f"  - {topic.name} (ID: {topic.id}, Activo: {topic.active})")
            else:
                print("  No hay temas configurados")
        except Exception as e:
            print(f"Error obteniendo temas: {e}")
        
        print()
        print("=" * 60)
        print("VERIFICACIÓN COMPLETADA")
        print("=" * 60)
        
    finally:
        session.close()
        db.close()


if __name__ == "__main__":
    check_database()
