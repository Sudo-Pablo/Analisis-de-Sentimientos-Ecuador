"""
Recolector de publicaciones y comentarios de Facebook
Actualizado para soportar el sistema multiplataforma con TikTok
"""
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from facebook_scraper import get_posts, get_page_info
import time

from src.database.db_manager import get_db_manager
from src.database.models import Post, Comment, FacebookPage
from src.utils.logger import setup_logger

logger = setup_logger(__name__)


class FacebookCollector:
    """
    Clase actualizada para recolectar posts y comentarios de páginas de Facebook.
    Compatible con el sistema multiplataforma (Facebook + TikTok).
    """
    
    def __init__(self, config: Dict = None):
        """
        Inicializa el recolector de Facebook
        
        Args:
            config: Configuración con páginas a monitorear (opcional)
        """
        self.db_manager = get_db_manager()
        self.config = config or {}
        self.facebook_pages = self.config.get('facebook_pages', [])
        self.collection_settings = self.config.get('collection_settings', {})
        logger.info(f"FacebookCollector inicializado con {len(self.facebook_pages)} páginas")
    
    def collect_posts_from_page(
        self, 
        page_id: str, 
        category: str = None,
        days: int = 7, 
        max_posts: int = 50
    ) -> List[Dict]:
        """
        Recolecta posts de una página específica y los guarda en la base de datos
        
        Args:
            page_id: ID de la página de Facebook
            category: Categoría temática del contenido
            days: Número de días hacia atrás para buscar
            max_posts: Número máximo de posts a recolectar
            
        Returns:
            Lista de posts con sus metadatos
        """
        logger.info(f"Recolectando posts de {page_id} (últimos {days} días, categoría: {category})")
        posts_data = []
        posts_saved = 0
        
        try:
            # Recolectar posts
            posts = get_posts(
                page_id,
                pages=max_posts // 10,  # Aproximadamente 10 posts por página
                timeout=30,
                options={"comments": True, "reactors": False}
            )
            
            cutoff_date = datetime.now() - timedelta(days=days)
            
            with self.db_manager.get_session() as session:
                for post in posts:
                    if len(posts_data) >= max_posts:
                        break
                    
                    # Verificar fecha del post
                    post_time = post.get('time')
                    if post_time and post_time < cutoff_date:
                        continue
                    
                    # Extraer información relevante
                    post_id = post.get('post_id')
                    if not post_id:
                        continue
                    
                    # Verificar si ya existe
                    existing_post = session.query(Post).filter_by(post_id=post_id).first()
                    if existing_post:
                        logger.debug(f"Post ya existe: {post_id}")
                        continue
                    
                    # Crear nuevo post con los nuevos campos
                    post_data = {
                        'post_id': post_id,
                        'text': post.get('text', ''),
                        'post_time': post_time,
                        'likes': post.get('likes', 0),
                        'comments_count': post.get('comments', 0),
                        'shares': post.get('shares', 0),
                        'post_url': post.get('post_url', ''),
                        'platform': 'facebook',  # Nuevo campo
                        'category': category,     # Nuevo campo
                        'author_name': page_id,   # Nuevo campo
                        'hashtags': '',           # Nuevo campo (Facebook no usa hashtags como TikTok)
                        'collected_at': datetime.now()
                    }
                    
                    # Guardar en base de datos
                    try:
                        new_post = Post(
                            post_id=post_data['post_id'],
                            text=post_data['text'],
                            post_time=post_data['post_time'],
                            likes=post_data['likes'],
                            comments_count=post_data['comments_count'],
                            shares=post_data['shares'],
                            post_url=post_data['post_url'],
                            platform=post_data['platform'],
                            category=post_data['category'],
                            author_name=post_data['author_name'],
                            hashtags=post_data['hashtags'],
                            collected_at=post_data['collected_at']
                        )
                        
                        session.add(new_post)
                        posts_saved += 1
                        posts_data.append(post_data)
                        logger.debug(f"Post Facebook guardado: {post_id}")
                        
                    except Exception as e:
                        logger.error(f"Error guardando post {post_id}: {e}")
                    
                    # Pequeña pausa para evitar sobrecarga
                    time.sleep(1)
                
                # Commit de todos los posts
                session.commit()
            
            logger.info(f"Recolectados y guardados {posts_saved} posts de {page_id}")
            return posts_data
            
        except Exception as e:
            logger.error(f"Error al recolectar posts de {page_id}: {str(e)}")
            return []
    
    def collect_comments_from_post(
        self, 
        post_id: str,
        category: str = None,
        max_comments: int = 500
    ) -> List[Dict]:
        """
        Recolecta comentarios de un post específico y los guarda en la base de datos
        
        Args:
            post_id: ID del post
            category: Categoría temática del contenido
            max_comments: Número máximo de comentarios a recolectar
            
        Returns:
            Lista de comentarios con sus metadatos
        """
        logger.info(f"Recolectando comentarios del post {post_id}")
        comments_data = []
        comments_saved = 0
        
        try:
            with self.db_manager.get_session() as session:
                # Buscar el post en la base de datos
                post_record = session.query(Post).filter_by(post_id=post_id).first()
                if not post_record:
                    logger.error(f"Post {post_id} no encontrado en la base de datos")
                    return []
                
                # Obtener el post con comentarios
                posts = get_posts(
                    post_urls=[f"https://www.facebook.com/{post_id}"],
                    options={"comments": max_comments}
                )
                
                for post in posts:
                    comments = post.get('comments_full', [])
                    
                    for comment in comments[:max_comments]:
                        comment_id = comment.get('comment_id')
                        if not comment_id:
                            continue
                        
                        # Verificar si ya existe
                        existing_comment = session.query(Comment).filter_by(comment_id=comment_id).first()
                        if existing_comment:
                            logger.debug(f"Comentario ya existe: {comment_id}")
                            continue
                        
                        comment_text = comment.get('comment_text', '')
                        if not comment_text:
                            continue
                        
                        comment_data = {
                            'comment_id': comment_id,
                            'original_text': comment_text,
                            'cleaned_text': comment_text,  # Se limpiará después si es necesario
                            'commenter_name': comment.get('commenter_name', ''),
                            'commenter_id': comment.get('commenter_id', ''),
                            'comment_time': comment.get('comment_time'),
                            'comment_likes': comment.get('comment_likes', 0),
                            'replies_count': len(comment.get('replies', [])),
                            'post_id': post_record.id,  # FK hacia el post
                            'platform': 'facebook',     # Nuevo campo
                            'category': category or post_record.category,  # Nuevo campo
                            'collected_at': datetime.now()
                        }
                        
                        # Guardar en base de datos
                        try:
                            new_comment = Comment(
                                comment_id=comment_data['comment_id'],
                                original_text=comment_data['original_text'],
                                cleaned_text=comment_data['cleaned_text'],
                                commenter_name=comment_data['commenter_name'],
                                commenter_id=comment_data['commenter_id'],
                                comment_time=comment_data['comment_time'],
                                comment_likes=comment_data['comment_likes'],
                                replies_count=comment_data['replies_count'],
                                post_id=comment_data['post_id'],
                                platform=comment_data['platform'],
                                category=comment_data['category'],
                                collected_at=comment_data['collected_at']
                            )
                            
                            session.add(new_comment)
                            comments_saved += 1
                            comments_data.append(comment_data)
                            
                        except Exception as e:
                            logger.error(f"Error guardando comentario {comment_id}: {e}")
                    
                    break  # Solo procesar el primer (y único) post
                
                # Commit de todos los comentarios
                session.commit()
            
            logger.info(f"Recolectados y guardados {comments_saved} comentarios del post {post_id}")
            return comments_data
            
        except Exception as e:
            logger.error(f"Error al recolectar comentarios del post {post_id}: {str(e)}")
            return []
    
    def collect_weekly_data(self, topics_keywords: Dict) -> Dict:
        """
        Recolecta datos semanales de todas las páginas configuradas
        
        Args:
            topics_keywords: Diccionario con temas y sus palabras clave
            
        Returns:
            Diccionario con posts y comentarios por tema
        """
        logger.info("Iniciando recolección semanal de datos")
        collected_data = {
            'metadata': {
                'collection_date': datetime.now(),
                'date_range_days': self.collection_settings.get('date_range_days', 7)
            },
            'topics': {}
        }
        
        # Inicializar estructura para cada tema
        for topic in topics_keywords:
            collected_data['topics'][topic['name']] = {
                'posts': [],
                'comments': []
            }
        
        # Recolectar de cada página activa
        for page in self.facebook_pages:
            if not page.get('active', True):
                continue
            
            page_id = page['page_id']
            logger.info(f"Procesando página: {page['name']}")
            
            # Recolectar posts
            posts = self.collect_posts_from_page(
                page_id,
                days=self.collection_settings.get('date_range_days', 7),
                max_posts=self.collection_settings.get('max_posts_per_page', 50)
            )
            
            # Clasificar posts por tema y recolectar comentarios
            for post in posts:
                post_text = post['text'].lower()
                
                for topic in topics_keywords:
                    # Verificar si el post contiene palabras clave del tema
                    if any(keyword.lower() in post_text for keyword in topic['keywords']):
                        collected_data['topics'][topic['name']]['posts'].append(post)
                        
                        # Recolectar comentarios si hay suficientes
                        if post['comments_count'] >= self.collection_settings.get('min_comments_required', 5):
                            comments = self.collect_comments_from_post(
                                post['post_id'],
                                max_comments=self.collection_settings.get('max_comments_per_post', 500)
                            )
                            collected_data['topics'][topic['name']]['comments'].extend(comments)
                        
                        time.sleep(2)  # Pausa entre recolecciones
                        break  # Solo asignar a un tema
            
            time.sleep(3)  # Pausa entre páginas
        
        # Resumen de recolección
        logger.info("=" * 50)
        logger.info("Resumen de recolección semanal:")
        for topic_name, data in collected_data['topics'].items():
            logger.info(f"  {topic_name}:")
            logger.info(f"    - Posts: {len(data['posts'])}")
            logger.info(f"    - Comentarios: {len(data['comments'])}")
        logger.info("=" * 50)
        
        return collected_data
