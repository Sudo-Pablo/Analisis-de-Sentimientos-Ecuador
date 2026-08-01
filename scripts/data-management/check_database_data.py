"""
Script para verificar los datos en la base de datos
"""
import sys
from pathlib import Path

# Agregar la raíz del proyecto al path (subir 2 niveles desde scripts/data-management)
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from api.config import load_database_config
from src.database.db_manager import DatabaseManager

def check_database_data():
    """Verifica los datos en la base de datos"""
    print("\n" + "="*60)
    print("📊 Verificando Datos en Base de Datos")
    print("="*60 + "\n")
    
    config = load_database_config()
    db = DatabaseManager(config)
    session = db.get_session()
    
    try:
        from src.database.models import Topic, FacebookPage, Post, Comment, CommentSentiment
        
        # Contar registros
        topics_count = session.query(Topic).count()
        pages_count = session.query(FacebookPage).count()
        posts_count = session.query(Post).count()
        comments_count = session.query(Comment).count()
        sentiments_count = session.query(CommentSentiment).count()
        
        print(f"📝 Topics: {topics_count}")
        print(f"📄 Facebook Pages: {pages_count}")
        print(f"📋 Posts: {posts_count}")
        print(f"💬 Comments: {comments_count}")
        print(f"😊 Sentiments: {sentiments_count}")
        
        if topics_count > 0:
            print(f"\n📝 Listado de Topics:")
            topics = session.query(Topic).all()
            for topic in topics:
                print(f"   - {topic.id}: {topic.name}")
        
        if posts_count > 0:
            print(f"\n📋 Muestra de Posts:")
            posts = session.query(Post).limit(3).all()
            for post in posts:
                print(f"   - ID: {post.id}, Post_ID: {post.post_id}, Topic_ID: {post.topic_id}")
        
        if comments_count > 0:
            print(f"\n💬 Muestra de Comments:")
            comments = session.query(Comment).limit(3).all()
            for comment in comments:
                print(f"   - ID: {comment.id}, Comment_ID: {comment.comment_id}, Post_ID: {comment.post_id}")
        
        if sentiments_count > 0:
            print(f"\n😊 Muestra de Sentiments:")
            sentiments = session.query(CommentSentiment).limit(3).all()
            for sentiment in sentiments:
                print(f"   - Comment_ID: {sentiment.comment_id}, Sentiment: {sentiment.sentiment}")
        
        print(f"\n" + "="*60)
        print(f"✅ Verificación Completada")
        print(f"="*60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    check_database_data()