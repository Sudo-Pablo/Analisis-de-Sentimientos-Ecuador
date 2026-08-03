"""
Collector para TikTok usando la API de Apify.
Integrado al sistema principal de análisis de sentimientos.
"""
import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from apify_client import ApifyClient
from src.utils.logger import setup_logger
from src.database.db_manager import get_db_manager

logger = setup_logger(__name__)


@dataclass
class TikTokStats:
    """Estadísticas de recolección de TikTok"""
    videos_guardados: int = 0
    comentarios_guardados: int = 0
    errores: int = 0


class TikTokCollector:
    """Collector para recolectar contenido de TikTok usando Apify"""
    
    def __init__(self, apify_token: str = None):
        """
        Inicializa el collector de TikTok.
        
        Args:
            apify_token: Token de la API de Apify. Si no se proporciona, se busca en variables de entorno.
        """
        # Token de Apify
        self.apify_token = apify_token or os.getenv('APIFY_TOKEN')
        if not self.apify_token:
            raise ValueError("Token de Apify requerido. Configura la variable APIFY_TOKEN o pásalo como parámetro")
        
        self.client = ApifyClient(self.apify_token)
        self.db_manager = get_db_manager()
        
        # Categorías y keywords específicas para TikTok Ecuador
        self.keywords_by_category = {
            "Salud": [
                "salud ecuador", "hospitales ecuador", "medicina ecuador",
                "salud pública ecuador", "ministerio de salud ecuador", "msp ecuador"
            ],
            "Economia": [
                "economía ecuador", "dólar ecuador", "inflación ecuador",
                "empleo ecuador", "economía ecuatoriana", "banco central ecuador"
            ],
            "Politica": [
                "política ecuador", "gobierno ecuador", "presidente ecuador",
                "asamblea nacional ecuador", "elecciones ecuador", "políticos ecuador"
            ],
            "Seguridad": [
                "seguridad ecuador", "delincuencia ecuador", "policia ecuador",
                "violencia ecuador", "crimen ecuador", "inseguridad ecuador"
            ],
            "Educacion": [
                "educación ecuador", "universidades ecuador", "estudiantes ecuador",
                "colegios ecuador", "ministerio educación ecuador"
            ],
            "Social": [
                "sociedad ecuador", "cultura ecuador", "tradiciones ecuador",
                "familias ecuador", "juventud ecuador", "comunidad ecuador",
                "turismo ecuador", "viajes ecuador", "destinos ecuador",
            ]
        }
    
    def collect_by_keyword(
        self,
        keyword: str,
        categoria: str = None,
        max_videos: int = 1,
        max_comments: int = 5
    ) -> TikTokStats:
        """
        Recolecta videos y comentarios de TikTok basado en una palabra clave.
        
        Args:
            keyword: Palabra clave para buscar
            categoria: Categoría del contenido
            max_videos: Número máximo de videos a obtener
            max_comments: Número máximo de comentarios por video
            
        Returns:
            TikTokStats: Estadísticas de la recolección
        """
        categoria_str = f" [{categoria}]" if categoria else ""
        logger.info(f"Iniciando búsqueda en TikTok: '{keyword}'{categoria_str}")
        
        stats = TikTokStats()
        
        try:
            # 1. Buscar Videos
            videos_data = self._search_videos(keyword, max_videos)
            if not videos_data:
                logger.warning("No se encontraron videos para la keyword")
                return stats
            
            # 2. Procesar y guardar videos
            video_urls = []
            for video in videos_data:
                try:
                    saved = self._save_video(video, categoria)
                    if saved:
                        stats.videos_guardados += 1
                        video_url = video.get('webVideoUrl')
                        if video_url:
                            video_urls.append(video_url)
                        logger.info(f"Video guardado: {video.get('authorMeta', {}).get('name', 'Desconocido')}")
                except Exception as e:
                    stats.errores += 1
                    logger.error(f"Error al procesar video: {e}")
            
            # 3. Buscar y guardar comentarios
            if video_urls:
                comments_data = self._search_comments(video_urls, max_comments)
                if comments_data:
                    for comment in comments_data:
                        try:
                            saved = self._save_comment(comment, categoria)
                            if saved:
                                stats.comentarios_guardados += 1
                        except Exception as e:
                            stats.errores += 1
                            logger.error(f"Error al procesar comentario: {e}")
            
            logger.info(f"Recolección completada - Videos: {stats.videos_guardados}, Comentarios: {stats.comentarios_guardados}")
            
        except Exception as e:
            logger.error(f"Error en la recolección de TikTok: {e}")
            stats.errores += 1
        
        return stats
    
    def collect_by_categories(
        self,
        categorias: List[str] = None,
        max_videos_per_keyword: int = 1,
        max_comments: int = 5
    ) -> Dict[str, TikTokStats]:
        """
        Recolecta contenido por categorías usando keywords predefinidas.
        
        Args:
            categorias: Lista de categorías a procesar. Si es None, procesa todas.
            max_videos_per_keyword: Videos por keyword
            max_comments: Comentarios por video
            
        Returns:
            Dict con estadísticas por categoría
        """
        if categorias is None:
            categorias = list(self.keywords_by_category.keys())
        
        stats_totales = {}
        
        logger.info(f"Iniciando recolección por categorías: {', '.join(categorias)}")
        
        for categoria in categorias:
            logger.info(f"Procesando categoría: {categoria}")
            
            keywords = self.keywords_by_category.get(categoria, [])
            if not keywords:
                logger.warning(f"No hay keywords para la categoría: {categoria}")
                continue
            
            categoria_stats = TikTokStats()
            
            for keyword in keywords:
                try:
                    stats = self.collect_by_keyword(
                        keyword=keyword,
                        categoria=categoria,
                        max_videos=max_videos_per_keyword,
                        max_comments=max_comments
                    )
                    
                    categoria_stats.videos_guardados += stats.videos_guardados
                    categoria_stats.comentarios_guardados += stats.comentarios_guardados
                    categoria_stats.errores += stats.errores
                    
                except Exception as e:
                    categoria_stats.errores += 1
                    logger.error(f"Error con keyword '{keyword}': {e}")
            
            stats_totales[categoria] = categoria_stats
            logger.info(f"Categoría {categoria} completada: {categoria_stats.videos_guardados} videos, {categoria_stats.comentarios_guardados} comentarios")
        
        return stats_totales
    
    def _search_videos(self, keyword: str, max_videos: int) -> List[Dict[str, Any]]:
        """Busca videos en TikTok usando Apify"""
        try:
            from api.routes.tiktok_search import build_tiktok_search_run_input

            run_input = build_tiktok_search_run_input(keyword, max_videos)
            logger.info("Input TikTok Apify (collector): %s", run_input)

            run = self.client.actor("clockworks/tiktok-scraper").call(run_input=run_input)
            
            if not run:
                logger.warning("No se pudo ejecutar el actor de TikTok")
                return []
            
            dataset_items = self.client.dataset(run["defaultDatasetId"]).list_items().items
            return list(dataset_items)
            
        except Exception as e:
            logger.error(f"Error al buscar videos: {e}")
            return []
    
    def _search_comments(self, video_urls: List[str], max_comments: int) -> List[Dict[str, Any]]:
        """Busca comentarios de videos específicos usando Apify"""
        try:
            run_input = {
                "postURLs": video_urls,
                "commentsPerPost": max_comments
            }
            
            run = self.client.actor("clockworks/tiktok-comments-scraper").call(run_input=run_input)
            
            if not run:
                logger.warning("No se pudo ejecutar el actor de comentarios de TikTok")
                return []
            
            comments_raw = self.client.dataset(run["defaultDatasetId"]).list_items().items
            return list(comments_raw)
            
        except Exception as e:
            logger.error(f"Error al buscar comentarios: {e}")
            return []
    
    def _save_video(self, video_data: Dict[str, Any], categoria: str = None) -> bool:
        """Guarda un video en la base de datos"""
        try:
            # Extraer datos del video
            video_id = video_data.get('id') or video_data.get('webVideoUrl', '')
            url = video_data.get('webVideoUrl', '')
            autor = video_data.get('authorMeta', {}).get('name', 'Desconocido')
            texto = video_data.get('text', '')
            fecha_str = video_data.get('createTimeISO', '')
            
            # Convertir fecha
            fecha_publicacion = None
            if fecha_str:
                try:
                    fecha_publicacion = datetime.fromisoformat(fecha_str.replace('Z', '+00:00'))
                except:
                    pass
            
            # Hashtags
            hashtags_list = video_data.get('hashtags', [])
            hashtags = ", ".join([
                h.get('name', '') if isinstance(h, dict) else str(h)
                for h in hashtags_list
            ])
            
            # Usar DatabaseManager para guardar
            with self.db_manager.get_session() as session:
                # Verificar si ya existe
                from src.database.models import Post
                existing = session.query(Post).filter_by(post_id=video_id).first()
                
                if existing:
                    logger.debug(f"Video ya existe: {video_id}")
                    return False
                
                # Crear nuevo post
                post = Post(
                    post_id=video_id,
                    text=texto,
                    post_time=fecha_publicacion,
                    likes=video_data.get('diggCount', 0),
                    comments_count=video_data.get('commentCount', 0),
                    shares=video_data.get('shareCount', 0),
                    post_url=url,
                    platform='tiktok',  # Nuevo campo
                    category=categoria,  # Nuevo campo
                    author_name=autor,   # Nuevo campo
                    hashtags=hashtags   # Nuevo campo
                )
                
                session.add(post)
                session.commit()
                
                logger.debug(f"Video TikTok guardado: {video_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error al guardar video: {e}")
            return False
    
    def _save_comment(self, comment_data: Dict[str, Any], categoria: str = None) -> bool:
        """Guarda un comentario en la base de datos"""
        try:
            # Extraer datos del comentario
            comment_id = comment_data.get('cid', '')
            texto = comment_data.get('text', '')
            usuario = comment_data.get('uniqueId', 'Desconocido')
            likes = comment_data.get('diggCount', 0)
            fecha_str = comment_data.get('createTimeISO', '')
            video_url = comment_data.get('videoWebUrl', '')
            
            if not comment_id or not texto:
                return False
            
            # Convertir fecha
            fecha_comentario = None
            if fecha_str:
                try:
                    fecha_comentario = datetime.fromisoformat(fecha_str.replace('Z', '+00:00'))
                except:
                    pass
            
            # Buscar el post origen
            with self.db_manager.get_session() as session:
                from src.database.models import Post, Comment
                
                # Buscar post por URL
                post = session.query(Post).filter_by(post_url=video_url).first()
                if not post:
                    logger.warning(f"Post no encontrado para URL: {video_url}")
                    return False
                
                # Verificar si el comentario ya existe
                existing = session.query(Comment).filter_by(comment_id=comment_id).first()
                if existing:
                    logger.debug(f"Comentario ya existe: {comment_id}")
                    return False
                
                # Crear nuevo comentario
                comment = Comment(
                    comment_id=comment_id,
                    original_text=texto,
                    cleaned_text=texto,  # Se limpiará más tarde si es necesario
                    commenter_name=usuario,
                    comment_time=fecha_comentario,
                    comment_likes=likes,
                    post_id=post.id,
                    platform='tiktok',  # Nuevo campo
                    category=categoria or post.category  # Nuevo campo
                )
                
                session.add(comment)
                session.commit()
                
                logger.debug(f"Comentario TikTok guardado: {comment_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error al guardar comentario: {e}")
            return False


def test_tiktok_collector():
    """Función de prueba para el collector de TikTok"""
    # Asegúrate de tener el token de Apify configurado
    token = os.getenv('APIFY_TOKEN')
    if not token:
        print("ERROR: Se requiere el token APIFY_TOKEN")
        return
    
    collector = TikTokCollector(token)
    
    # Prueba con una keyword
    stats = collector.collect_by_keyword(
        keyword="ecuador",
        categoria="Social",
        max_videos=2,
        max_comments=3
    )
    
    print(f"Resultados - Videos: {stats.videos_guardados}, Comentarios: {stats.comentarios_guardados}")


if __name__ == "__main__":
    test_tiktok_collector()