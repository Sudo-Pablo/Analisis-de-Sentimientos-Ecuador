"""
Script principal para recolección de datos de múltiples plataformas (Facebook + TikTok).
Integra ambos sistemas en un flujo unificado.
"""
import os
import sys
import argparse
from datetime import datetime
from typing import Dict, List, Optional, Any

# Agregar src al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from src.collectors.tiktok_collector import TikTokCollector, TikTokStats
from src.analyzers.huggingface_analyzer import get_huggingface_analyzer
from src.database.db_manager import get_db_manager
from src.utils.logger import setup_logger

logger = setup_logger(__name__)


class MultiPlatformCollector:
    """Collector unificado para múltiples plataformas sociales"""
    
    def __init__(self):
        """Inicializa el collector multiplataforma"""
        self.db_manager = get_db_manager()
        
        # Inicializar collectors específicos
        self.facebook_collector = None
        self.tiktok_collector = None
        
        # Configuraciones por default
        self.default_categories = ["Politica", "Economia", "Salud", "Seguridad", "Educacion", "Social"]
    
    def initialize_facebook_collector(self) -> bool:
        """Inicializa el collector de Facebook"""
        try:
            from src.collectors.facebook_collector import FacebookCollector
            self.facebook_collector = FacebookCollector()
            logger.info("Collector de Facebook inicializado correctamente")
            return True
        except Exception as e:
            logger.error(f"Error al inicializar collector de Facebook: {e}")
            return False
    
    def initialize_tiktok_collector(self, apify_token: str = None) -> bool:
        """Inicializa el collector de TikTok"""
        try:
            token = apify_token or os.getenv('APIFY_TOKEN')
            if not token:
                logger.warning("Token de Apify no encontrado. TikTok collector no disponible.")
                return False
            
            self.tiktok_collector = TikTokCollector(token)
            logger.info("Collector de TikTok inicializado correctamente")
            return True
        except Exception as e:
            logger.error(f"Error al inicializar collector de TikTok: {e}")
            return False
    
    def collect_all_platforms(
        self,
        platforms: List[str] = None,
        categories: List[str] = None,
        max_posts_per_platform: int = 5,
        max_comments_per_post: int = 10
    ) -> Dict[str, Dict]:
        """
        Recolecta datos de todas las plataformas especificadas.
        
        Args:
            platforms: Lista de plataformas ['facebook', 'tiktok']. Default: todas disponibles
            categories: Lista de categorías a procesar. Default: todas
            max_posts_per_platform: Máximo posts por plataforma
            max_comments_per_post: Máximo comentarios por post
            
        Returns:
            Dict con estadísticas por plataforma
        """
        if platforms is None:
            platforms = ['facebook', 'tiktok']
        
        if categories is None:
            categories = self.default_categories
        
        results = {}
        
        logger.info(f"Iniciando recolección multiplataforma: {', '.join(platforms)}")
        logger.info(f"Categorías: {', '.join(categories)}")
        
        # Facebook
        if 'facebook' in platforms:
            logger.info("=== Recolección Facebook ===")
            if not self.facebook_collector:
                self.initialize_facebook_collector()
            
            if self.facebook_collector:
                try:
                    fb_results = self._collect_facebook_data(
                        categories, max_posts_per_platform, max_comments_per_post
                    )
                    results['facebook'] = fb_results
                    logger.info(f"Facebook completado: {fb_results}")
                except Exception as e:
                    logger.error(f"Error en recolección de Facebook: {e}")
                    results['facebook'] = {'error': str(e)}
        
        # TikTok
        if 'tiktok' in platforms:
            logger.info("=== Recolección TikTok ===")
            if not self.tiktok_collector:
                self.initialize_tiktok_collector()
            
            if self.tiktok_collector:
                try:
                    tiktok_results = self._collect_tiktok_data(
                        categories, max_posts_per_platform, max_comments_per_post
                    )
                    results['tiktok'] = tiktok_results
                    logger.info(f"TikTok completado: {tiktok_results}")
                except Exception as e:
                    logger.error(f"Error en recolección de TikTok: {e}")
                    results['tiktok'] = {'error': str(e)}
        
        logger.info("=== Recolección multiplataforma completada ===")
        return results
    
    def _collect_facebook_data(
        self, 
        categories: List[str], 
        max_posts: int, 
        max_comments: int
    ) -> Dict:
        """Recolecta datos específicos de Facebook"""
        logger.info("Ejecutando recolección de Facebook...")
        
        # Placeholder - integrar con tu collector existente
        results = {
            'posts_collected': 0,
            'comments_collected': 0,
            'categories_processed': categories,
            'platform': 'facebook'
        }
        
        return results
    
    def _collect_tiktok_data(
        self, 
        categories: List[str], 
        max_posts: int, 
        max_comments: int
    ) -> Dict:
        """Recolecta datos específicos de TikTok"""
        logger.info("Ejecutando recolección de TikTok...")
        
        try:
            # Usar el collector de TikTok por categorías
            categoria_stats = self.tiktok_collector.collect_by_categories(
                categorias=categories,
                max_videos_per_keyword=max_posts,
                max_comments=max_comments
            )
            
            # Consolidar estadísticas
            total_posts = sum(stats.videos_guardados for stats in categoria_stats.values())
            total_comments = sum(stats.comentarios_guardados for stats in categoria_stats.values())
            total_errors = sum(stats.errores for stats in categoria_stats.values())
            
            return {
                'posts_collected': total_posts,
                'comments_collected': total_comments,
                'errors': total_errors,
                'categories_processed': list(categoria_stats.keys()),
                'platform': 'tiktok',
                'category_details': {
                    cat: {
                        'posts': stats.videos_guardados,
                        'comments': stats.comentarios_guardados,
                        'errors': stats.errores
                    } for cat, stats in categoria_stats.items()
                }
            }
            
        except Exception as e:
            logger.error(f"Error en recolección de TikTok: {e}")
            return {
                'posts_collected': 0,
                'comments_collected': 0,
                'errors': 1,
                'platform': 'tiktok',
                'error_message': str(e)
            }
    
    def analyze_collected_data(
        self, 
        platforms: List[str] = None,
        model_name: str = 'pysentimiento/robertuito-sentiment-analysis'
    ) -> Dict[str, Any]:
        """Analiza los datos recolectados usando el analizador de Hugging Face"""
        if platforms is None:
            platforms = ['facebook', 'tiktok']
        
        logger.info(f"Iniciando análisis de sentimientos para: {', '.join(platforms)}")
        
        # Obtener analizador de Hugging Face
        analyzer = get_huggingface_analyzer(model_name)
        
        results = {}
        
        for platform in platforms:
            logger.info(f"Analizando datos de {platform}...")
            
            try:
                # Obtener comentarios pendientes de análisis
                comments = self._get_unanalyzed_comments(platform)
                
                if not comments:
                    logger.info(f"No hay comentarios pendientes para {platform}")
                    results[platform] = {'analyzed': 0, 'skipped': 0}
                    continue
                
                # Extraer textos
                texts = [comment.cleaned_text or comment.original_text for comment in comments]
                
                # Analizar en lotes
                logger.info(f"Analizando {len(texts)} comentarios de {platform}...")
                sentiment_results = analyzer.analyze_batch(texts)
                
                # Guardar resultados
                analyzed_count = self._save_sentiment_results(comments, sentiment_results, model_name)
                
                results[platform] = {
                    'analyzed': analyzed_count,
                    'total_comments': len(comments)
                }
                
                logger.info(f"{platform} - Analizados: {analyzed_count}/{len(comments)} comentarios")
                
            except Exception as e:
                logger.error(f"Error analizando {platform}: {e}")
                results[platform] = {'error': str(e)}
        
        return results
    
    def _get_unanalyzed_comments(self, platform: str) -> List:
        """Obtiene comentarios sin análisis de sentimientos"""
        with self.db_manager.get_session() as session:
            from src.database.models import Comment, CommentSentiment
            
            # Obtener comentarios sin análisis de sentimientos
            comments = session.query(Comment).filter(
                Comment.platform == platform,
                ~Comment.id.in_(
                    session.query(CommentSentiment.comment_id)
                )
            ).limit(1000).all()
            
            return comments
    
    def _save_sentiment_results(self, comments: List, sentiment_results: List[Dict], model_name: str) -> int:
        """Guarda los resultados de análisis de sentimientos"""
        saved_count = 0
        
        with self.db_manager.get_session() as session:
            from src.database.models import CommentSentiment
            
            for comment, result in zip(comments, sentiment_results):
                try:
                    sentiment = CommentSentiment(
                        comment_id=comment.id,
                        sentiment=result['sentiment'],
                        confidence=result['confidence'],
                        score_positive=result['scores']['positive'],
                        score_negative=result['scores']['negative'],
                        score_neutral=result['scores']['neutral'],
                        model_used=model_name,
                        analyzed_at=datetime.now()
                    )
                    
                    session.add(sentiment)
                    saved_count += 1
                    
                except Exception as e:
                    logger.error(f"Error guardando sentimiento para comentario {comment.id}: {e}")
            
            session.commit()
        
        return saved_count
    
    def get_platform_statistics(self) -> Dict[str, Any]:
        """Obtiene estadísticas generales de todas las plataformas"""
        with self.db_manager.get_session() as session:
            from src.database.models import Post, Comment, CommentSentiment
            from sqlalchemy import func
            
            stats = {}
            platforms = ['facebook', 'tiktok']
            
            for platform in platforms:
                # Posts
                post_count = session.query(func.count(Post.id)).filter(
                    Post.platform == platform
                ).scalar() or 0
                
                # Comentarios
                comment_count = session.query(func.count(Comment.id)).filter(
                    Comment.platform == platform
                ).scalar() or 0
                
                # Análisis de sentimientos
                sentiment_count = session.query(func.count(CommentSentiment.id)).join(
                    Comment
                ).filter(
                    Comment.platform == platform
                ).scalar() or 0
                
                # Distribución de sentimientos
                sentiment_dist = session.query(
                    CommentSentiment.sentiment,
                    func.count(CommentSentiment.id)
                ).join(Comment).filter(
                    Comment.platform == platform
                ).group_by(CommentSentiment.sentiment).all()
                
                stats[platform] = {
                    'posts': post_count,
                    'comments': comment_count,
                    'analyzed_comments': sentiment_count,
                    'sentiment_distribution': dict(sentiment_dist)
                }
            
            return stats


def main():
    """Función principal con interfaz de línea de comandos"""
    parser = argparse.ArgumentParser(description='Recolector multiplataforma de redes sociales')
    
    parser.add_argument(
        '--platforms', 
        nargs='+', 
        choices=['facebook', 'tiktok'],
        default=['facebook', 'tiktok'],
        help='Plataformas a procesar'
    )
    
    parser.add_argument(
        '--categories',
        nargs='+',
        default=['Politica', 'Economia', 'Salud', 'Seguridad', 'Educacion', 'Social'],
        help='Categorías a procesar'
    )
    
    parser.add_argument(
        '--max-posts',
        type=int,
        default=5,
        help='Máximo posts/videos por plataforma'
    )
    
    parser.add_argument(
        '--max-comments',
        type=int,
        default=10,
        help='Máximo comentarios por post'
    )
    
    parser.add_argument(
        '--analyze-only',
        action='store_true',
        help='Solo analizar datos existentes, no recolectar'
    )
    
    parser.add_argument(
        '--model',
        default='pysentimiento/robertuito-sentiment-analysis',
        help='Modelo de Hugging Face para análisis de sentimientos'
    )
    
    args = parser.parse_args()
    
    # Configurar logging
    logger.info("=== SISTEMA MULTIPLATAFORMA DE ANÁLISIS DE SENTIMIENTOS ===")
    logger.info(f"Plataformas: {', '.join(args.platforms)}")
    logger.info(f"Categorías: {', '.join(args.categories)}")
    
    # Inicializar collector
    collector = MultiPlatformCollector()
    
    try:
        if not args.analyze_only:
            # Recolección de datos
            logger.info("Iniciando recolección de datos...")
            collection_results = collector.collect_all_platforms(
                platforms=args.platforms,
                categories=args.categories,
                max_posts_per_platform=args.max_posts,
                max_comments_per_post=args.max_comments
            )
            
            logger.info("Resultados de recolección:")
            for platform, stats in collection_results.items():
                logger.info(f"  {platform}: {stats}")
        
        # Análisis de sentimientos
        logger.info("Iniciando análisis de sentimientos...")
        analysis_results = collector.analyze_collected_data(
            platforms=args.platforms,
            model_name=args.model
        )
        
        logger.info("Resultados de análisis:")
        for platform, stats in analysis_results.items():
            logger.info(f"  {platform}: {stats}")
        
        # Estadísticas finales
        logger.info("Estadísticas generales:")
        general_stats = collector.get_platform_statistics()
        for platform, stats in general_stats.items():
            logger.info(f"  {platform}: {stats}")
        
        logger.info("=== PROCESO COMPLETADO EXITOSAMENTE ===")
        
    except Exception as e:
        logger.error(f"Error durante la ejecución: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
