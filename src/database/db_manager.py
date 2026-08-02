"""
Gestor de base de datos
"""
import logging
import json
import os
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from urllib.parse import quote_plus
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker, Session, joinedload
from sqlalchemy.pool import QueuePool
import pandas as pd

from .models import Base, Topic, FacebookPage, Post, Comment, CommentSentiment, WeeklyReport, SearchEvent

logger = logging.getLogger(__name__)


class DatabaseManager:
    """
    Gestor de base de datos para el sistema de análisis de sentimientos
    """
    
    def __init__(self, db_config: Dict):
        """
        Inicializa el gestor de base de datos
        
        Args:
            db_config: Configuración de la base de datos
        """
        self.config = db_config
        self.engine = None
        self.SessionLocal = None
        self._create_engine()
        logger.info("DatabaseManager inicializado")
    
    def _create_engine(self):
        """Crea el motor de base de datos"""
        db_conf = self.config['database']
        conn_conf = db_conf['connection']
        
        # Escapar credenciales para URL
        user = quote_plus(str(conn_conf['user']))
        password = quote_plus(str(conn_conf['password']))
        database = quote_plus(str(conn_conf['database']))
        
        # Construir URL de conexión sin host (se pasa en connect_args)
        db_url = f"postgresql+psycopg2://{user}:{password}@/{database}"
        
        # Host/port en connect_args (compatible Windows y Render)
        host = str(conn_conf.get("host") or "localhost")
        connect_args = {
            "host": host,
            "port": conn_conf["port"],
            "connect_timeout": 10,
        }

        # Render / Postgres en la nube exige SSL
        sslmode = os.getenv("DB_SSLMODE", "").strip()
        if not sslmode:
            if (
                os.getenv("ENVIRONMENT", "").lower() == "production"
                or "render.com" in host
                or host.startswith("dpg-")
            ):
                sslmode = "require"
        if sslmode:
            connect_args["sslmode"] = sslmode
        
        # Crear engine
        self.engine = create_engine(
            db_url,
            poolclass=QueuePool,
            pool_size=db_conf['pool']['min_size'],
            max_overflow=db_conf['pool']['max_size'] - db_conf['pool']['min_size'],
            echo=db_conf['options'].get('echo', False),
            pool_pre_ping=db_conf['options'].get('pool_pre_ping', True),
            connect_args=connect_args
        )
        
        # Crear sesión
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )
        
        logger.info(f"Conexión a base de datos establecida: {conn_conf['database']}")
    
    def create_tables(self):
        """Crea todas las tablas en la base de datos"""
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("Tablas creadas exitosamente")
        except Exception as e:
            logger.error(f"Error al crear tablas: {str(e)}")
            raise
    
    def get_session(self) -> Session:
        """Obtiene una nueva sesión de base de datos"""
        return self.SessionLocal()
    
    # === Métodos para Topics ===
    
    def save_topics(self, topics: List[Dict]):
        """
        Guarda o actualiza temas en la base de datos
        
        Args:
            topics: Lista de temas con sus palabras clave
        """
        session = self.get_session()
        try:
            for topic_data in topics:
                # Verificar si existe
                topic = session.query(Topic).filter_by(name=topic_data['name']).first()
                
                if topic:
                    # Actualizar
                    topic.keywords = json.dumps(topic_data['keywords'])
                    topic.active = topic_data.get('active', True)
                else:
                    # Crear nuevo
                    topic = Topic(
                        name=topic_data['name'],
                        keywords=json.dumps(topic_data['keywords']),
                        active=topic_data.get('active', True)
                    )
                    session.add(topic)
            
            session.commit()
            logger.info(f"Guardados {len(topics)} temas")
        except Exception as e:
            session.rollback()
            logger.error(f"Error al guardar temas: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_active_topics(self) -> List[Topic]:
        """Obtiene todos los temas activos"""
        session = self.get_session()
        try:
            topics = session.query(Topic).filter_by(active=True).all()
            return topics
        finally:
            session.close()
    
    # === Métodos para Posts ===
    
    def save_posts(self, posts_data: List[Dict], topic_name: str) -> int:
        """
        Guarda posts en la base de datos
        
        Args:
            posts_data: Lista de posts
            topic_name: Nombre del tema
            
        Returns:
            Número de posts guardados
        """
        session = self.get_session()
        saved_count = 0
        
        try:
            # Obtener tema (case-insensitive)
            topic = session.query(Topic).filter(
                func.lower(Topic.name) == topic_name.lower()
            ).first()
            if not topic:
                logger.error(f"Tema no encontrado: {topic_name}")
                return 0
            
            for post_data in posts_data:
                # Verificar si ya existe
                existing = session.query(Post).filter_by(
                    post_id=post_data['post_id']
                ).first()
                
                if existing:
                    continue
                
                # Crear nuevo post
                post = Post(
                    post_id=post_data['post_id'],
                    text=post_data.get('text', ''),
                    post_time=post_data.get('time'),
                    likes=post_data.get('likes', 0),
                    comments_count=post_data.get('comments_count', 0),
                    shares=post_data.get('shares', 0),
                    post_url=post_data.get('post_url', ''),
                    topic_id=topic.id,
                    collected_at=post_data.get('collected_at', datetime.now())
                )
                
                session.add(post)
                saved_count += 1
            
            session.commit()
            logger.info(f"Guardados {saved_count} posts para tema {topic_name}")
            return saved_count
            
        except Exception as e:
            session.rollback()
            logger.error(f"Error al guardar posts: {str(e)}")
            raise
        finally:
            session.close()
    
    # === Métodos para Comments ===
    
    def save_comments_with_sentiment(
        self,
        df: pd.DataFrame,
        model_used: str = 'beto'
    ) -> int:
        """
        Guarda comentarios con su análisis de sentimiento
        
        Args:
            df: DataFrame con comentarios y análisis
            model_used: Modelo usado para análisis
            
        Returns:
            Número de comentarios guardados
        """
        session = self.get_session()
        saved_count = 0
        
        try:
            for _, row in df.iterrows():
                # Verificar si ya existe
                existing = session.query(Comment).filter_by(
                    comment_id=row['comment_id']
                ).first()
                
                if existing:
                    continue
                
                # Obtener post
                post = session.query(Post).filter_by(
                    post_id=row['post_id']
                ).first()
                
                if not post:
                    continue
                
                # Crear comentario
                comment = Comment(
                    comment_id=row['comment_id'],
                    original_text=row.get('original_text', ''),
                    cleaned_text=row.get('cleaned_text', ''),
                    language=row.get('language', 'es'),
                    commenter_name=row.get('commenter_name', ''),
                    comment_time=row.get('comment_time'),
                    comment_likes=row.get('comment_likes', 0),
                    post_id=post.id,
                    collected_at=row.get('collected_at', datetime.now())
                )
                
                session.add(comment)
                session.flush()  # Para obtener el ID
                
                # Crear análisis de sentimiento
                sentiment = CommentSentiment(
                    comment_id=comment.id,
                    sentiment=row.get('sentiment', 'neutral'),
                    confidence=row.get('sentiment_confidence', 0.0),
                    score_positive=row.get('score_positivo', 0.0),
                    score_negative=row.get('score_negativo', 0.0),
                    score_neutral=row.get('score_neutral', 0.0),
                    model_used=model_used
                )
                
                session.add(sentiment)
                saved_count += 1
            
            session.commit()
            logger.info(f"Guardados {saved_count} comentarios con análisis")
            return saved_count
            
        except Exception as e:
            session.rollback()
            logger.error(f"Error al guardar comentarios: {str(e)}")
            raise
        finally:
            session.close()
    
    # === Métodos para Reportes ===
    
    def save_weekly_report(self, report_data: Dict) -> int:
        """
        Guarda un reporte semanal
        
        Args:
            report_data: Datos del reporte
            
        Returns:
            ID del reporte guardado
        """
        session = self.get_session()
        
        try:
            topic = session.query(Topic).filter_by(
                name=report_data['topic_name']
            ).first()
            
            report = WeeklyReport(
                week_number=report_data['week_number'],
                year=report_data['year'],
                start_date=report_data['start_date'],
                end_date=report_data['end_date'],
                topic_id=topic.id if topic else None,
                total_posts=report_data.get('total_posts', 0),
                total_comments=report_data.get('total_comments', 0),
                total_positive=report_data.get('total_positive', 0),
                total_negative=report_data.get('total_negative', 0),
                total_neutral=report_data.get('total_neutral', 0),
                avg_sentiment_score=report_data.get('avg_sentiment_score', 0.0),
                report_file_path=report_data.get('report_file_path', '')
            )
            
            session.add(report)
            session.commit()
            
            report_id = report.id
            logger.info(f"Reporte semanal guardado: ID {report_id}")
            return report_id
            
        except Exception as e:
            session.rollback()
            logger.error(f"Error al guardar reporte: {str(e)}")
            raise
        finally:
            session.close()
    
    # === Métodos adicionales para API ===
    
    def get_topic_by_id(self, topic_id: int) -> Optional[Topic]:
        """
        Obtiene un tema por su ID
        
        Args:
            topic_id: ID del tema
            
        Returns:
            Topic o None si no existe
        """
        session = self.get_session()
        try:
            return session.query(Topic).filter_by(id=topic_id).first()
        finally:
            session.close()

    def get_topic_by_name(self, name: str) -> Optional[Topic]:
        """Obtiene un tema activo por nombre (Turismo se resuelve como Social)."""
        if not name:
            return None
        resolved = name.strip()
        if resolved.lower() == "turismo":
            resolved = "Social"
        session = self.get_session()
        try:
            topic = (
                session.query(Topic)
                .filter(func.lower(Topic.name) == resolved.lower(), Topic.active.is_(True))
                .first()
            )
            if topic:
                return topic
            return (
                session.query(Topic)
                .filter(func.lower(Topic.name) == resolved.lower())
                .first()
            )
        finally:
            session.close()
    
    def get_comments_since(self, cutoff_date: datetime) -> List[Comment]:
        """
        Obtiene comentarios desde una fecha específica
        
        Args:
            cutoff_date: Fecha de corte
            
        Returns:
            Lista de comentarios
        """
        session = self.get_session()
        try:
            return session.query(Comment).options(
                joinedload(Comment.sentiment),
                joinedload(Comment.post)
            ).filter(
                Comment.collected_at >= cutoff_date
            ).all()
        finally:
            session.close()
    
    def get_posts_since(self, cutoff_date: datetime) -> List[Post]:
        """
        Obtiene posts desde una fecha específica
        
        Args:
            cutoff_date: Fecha de corte
            
        Returns:
            Lista de posts
        """
        session = self.get_session()
        try:
            return session.query(Post).filter(
                Post.collected_at >= cutoff_date
            ).all()
        finally:
            session.close()

    def get_posts_by_category(
        self,
        category: str,
        *,
        platform: Optional[str] = None,
        limit: int = 8,
        offset: int = 0,
        exclude_post_ids: Optional[List[str]] = None,
    ) -> Tuple[List[Post], int]:
        """
        Obtiene posts históricos filtrados por categoría de contenido.

        Args:
            category: Categoría de contenido (Politica, Economia, etc.)
            platform: Plataforma opcional ('facebook' | 'tiktok')
            limit: Máximo de resultados
            offset: Desplazamiento para paginación
            exclude_post_ids: IDs externos a excluir (p. ej. resultados en vivo)

        Returns:
            Tupla (lista de posts, total sin paginar)
        """
        session = self.get_session()
        try:
            resolved = (category or "").strip()
            if not resolved:
                return [], 0

            query = session.query(Post).filter(
                func.lower(Post.category) == resolved.lower()
            )

            if platform:
                query = query.filter(func.lower(Post.platform) == platform.lower())

            if exclude_post_ids:
                cleaned_ids = [pid.strip() for pid in exclude_post_ids if pid and str(pid).strip()]
                if cleaned_ids:
                    query = query.filter(Post.post_id.notin_(cleaned_ids))

            total = query.count()

            posts = (
                query.order_by(
                    Post.post_time.desc().nullslast(),
                    Post.collected_at.desc(),
                )
                .offset(max(offset, 0))
                .limit(max(limit, 1))
                .all()
            )
            return posts, total
        finally:
            session.close()
    
    def get_comments_by_topic_since(self, topic_id: int, cutoff_date: datetime) -> List[Comment]:
        """
        Obtiene comentarios de un tema específico desde una fecha
        
        Args:
            topic_id: ID del tema
            cutoff_date: Fecha de corte
            
        Returns:
            Lista de comentarios
        """
        session = self.get_session()
        try:
            return session.query(Comment).join(Post).options(
                joinedload(Comment.sentiment),
                joinedload(Comment.post)
            ).filter(
                Post.topic_id == topic_id,
                Comment.collected_at >= cutoff_date
            ).all()
        finally:
            session.close()
    
    def get_comment_by_id(self, comment_id: int) -> Optional[Comment]:
        """
        Obtiene un comentario por su ID
        
        Args:
            comment_id: ID del comentario
            
        Returns:
            Comment o None si no existe
        """
        session = self.get_session()
        try:
            return session.query(Comment).filter_by(id=comment_id).first()
        finally:
            session.close()
    
    def get_weekly_reports_since(self, cutoff_date: datetime) -> List[WeeklyReport]:
        """
        Obtiene reportes semanales desde una fecha
        
        Args:
            cutoff_date: Fecha de corte
            
        Returns:
            Lista de reportes
        """
        session = self.get_session()
        try:
            return session.query(WeeklyReport).filter(
                WeeklyReport.start_date >= cutoff_date
            ).all()
        finally:
            session.close()
    
    def get_weekly_reports_by_topic(self, topic_id: int, cutoff_date: datetime) -> List[WeeklyReport]:
        """
        Obtiene reportes semanales de un tema específico
        
        Args:
            topic_id: ID del tema
            cutoff_date: Fecha de corte
            
        Returns:
            Lista de reportes
        """
        session = self.get_session()
        try:
            return session.query(WeeklyReport).filter(
                WeeklyReport.topic_id == topic_id,
                WeeklyReport.start_date >= cutoff_date
            ).all()
        finally:
            session.close()
    
    def get_latest_report_by_topic(self, topic_id: int) -> Optional[WeeklyReport]:
        """
        Obtiene el reporte más reciente de un tema
        
        Args:
            topic_id: ID del tema
            
        Returns:
            WeeklyReport o None
        """
        session = self.get_session()
        try:
            return session.query(WeeklyReport).filter(
                WeeklyReport.topic_id == topic_id
            ).order_by(WeeklyReport.report_date.desc()).first()
        finally:
            session.close()
    
    def get_weekly_report_by_id(self, report_id: int) -> Optional[WeeklyReport]:
        """
        Obtiene un reporte por su ID
        
        Args:
            report_id: ID del reporte
            
        Returns:
            WeeklyReport o None
        """
        session = self.get_session()
        try:
            return session.query(WeeklyReport).filter_by(id=report_id).first()
        finally:
            session.close()
    
    def close(self):
        """Cierra las conexiones de base de datos"""
        if self.engine:
            self.engine.dispose()
            logger.info("Conexiones de base de datos cerradas")


def get_db_manager() -> DatabaseManager:
    """
    Crea un DatabaseManager con la configuración por defecto.
    Carga automáticamente la configuración desde config/database/database.json
    y resuelve las variables de entorno (incluye DATABASE_URL de Render).
    """
    from api.config import load_database_config

    return DatabaseManager(load_database_config())
