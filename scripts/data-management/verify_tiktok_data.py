"""
Script de utilidad para verificar los datos importados de TikTok en la base de datos.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from sqlalchemy import func
from src.database.db_manager import get_db_manager
from src.database.models import Post, Comment, CommentSentiment, Topic


def verificar_datos():
    """Muestra estadísticas de los datos en la base de datos"""
    db = get_db_manager()
    
    with db.get_session() as session:
        print("=" * 60)
        print("ESTADÍSTICAS DE LA BASE DE DATOS - DATOS TIKTOK")
        print("=" * 60)
        
        # Posts por plataforma
        print("\n📊 POSTS POR PLATAFORMA:")
        posts_stats = session.query(
            Post.platform,
            func.count(Post.id)
        ).group_by(Post.platform).all()
        
        for platform, count in posts_stats:
            print(f"  - {platform}: {count} posts")
        
        # Posts TikTok por categoría
        print("\n📁 POSTS TIKTOK POR CATEGORÍA:")
        tiktok_cats = session.query(
            Post.category,
            func.count(Post.id)
        ).filter(
            Post.platform.ilike('%tiktok%')
        ).group_by(Post.category).all()
        
        for cat, count in tiktok_cats:
            print(f"  - {cat or 'Sin categoría'}: {count}")
        
        # Total comentarios
        print("\n💬 COMENTARIOS:")
        total_comments = session.query(func.count(Comment.id)).scalar()
        tiktok_comments = session.query(func.count(Comment.id)).filter(
            Comment.platform.ilike('%tiktok%')
        ).scalar()
        print(f"  - Total: {total_comments}")
        print(f"  - TikTok: {tiktok_comments}")
        
        # Sentimientos analizados
        print("\n🎭 ANÁLISIS DE SENTIMIENTOS:")
        sentiment_stats = session.query(
            CommentSentiment.sentiment,
            func.count(CommentSentiment.id)
        ).group_by(CommentSentiment.sentiment).all()
        
        for sentiment, count in sentiment_stats:
            emoji = {'positivo': '😊', 'negativo': '😞', 'neutral': '😐'}.get(sentiment, '❓')
            print(f"  {emoji} {sentiment}: {count}")
        
        # Topics
        print("\n📌 TOPICS/CATEGORÍAS:")
        topics = session.query(Topic).all()
        for topic in topics:
            post_count = session.query(func.count(Post.id)).filter_by(topic_id=topic.id).scalar()
            print(f"  - {topic.name}: {post_count} posts asociados")
        
        # Muestra algunos posts de ejemplo
        print("\n📝 ÚLTIMOS 5 POSTS DE TIKTOK:")
        recent_posts = session.query(Post).filter(
            Post.platform.ilike('%tiktok%')
        ).order_by(Post.collected_at.desc()).limit(5).all()
        
        for post in recent_posts:
            text_preview = (post.text[:50] + '...') if post.text and len(post.text) > 50 else (post.text or 'Sin texto')
            print(f"  [{post.category}] {text_preview}")
        
        print("\n" + "=" * 60)


if __name__ == "__main__":
    verificar_datos()
