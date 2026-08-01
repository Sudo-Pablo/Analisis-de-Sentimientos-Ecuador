"""
Modelos de base de datos usando SQLAlchemy
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import hashlib

Base = declarative_base()


class Topic(Base):
    """Modelo para temas de análisis"""
    __tablename__ = 'topics'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    keywords = Column(Text)  # JSON string con palabras clave
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relaciones
    posts = relationship("Post", back_populates="topic")
    
    def __repr__(self):
        return f"<Topic(id={self.id}, name='{self.name}')>"


class FacebookPage(Base):
    """Modelo para páginas de Facebook monitoreadas"""
    __tablename__ = 'facebook_pages'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    page_id = Column(String(100), unique=True, nullable=False)
    url = Column(String(500))
    category = Column(String(50))
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relaciones
    posts = relationship("Post", back_populates="facebook_page")
    
    def __repr__(self):
        return f"<FacebookPage(id={self.id}, name='{self.name}')>"


class Post(Base):
    """Modelo para posts de múltiples plataformas (Facebook, TikTok)"""
    __tablename__ = 'fb_posts'
    
    id = Column(Integer, primary_key=True)
    post_id = Column(String(100), unique=True, nullable=False)
    text = Column(Text)
    post_time = Column(DateTime)
    likes = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    post_url = Column(String(500))
    
    # Nuevos campos para múltiples plataformas
    platform = Column(String(20), default='facebook')  # 'facebook', 'tiktok'
    category = Column(String(50))  # Categoría del contenido
    author_name = Column(String(200))  # Nombre del autor
    hashtags = Column(Text)  # Hashtags del post
    
    # Relaciones (opcionales para TikTok)
    page_id = Column(Integer, ForeignKey('facebook_pages.id'), nullable=True)
    topic_id = Column(Integer, ForeignKey('topics.id'), nullable=True)
    
    facebook_page = relationship("FacebookPage", back_populates="posts")
    topic = relationship("Topic", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    
    collected_at = Column(DateTime, default=datetime.now)
    
    def __repr__(self):
        return f"<Post(id={self.id}, post_id='{self.post_id}')>"


class Comment(Base):
    """Modelo para comentarios de múltiples plataformas (Facebook, TikTok)"""
    __tablename__ = 'fb_comments'
    
    id = Column(Integer, primary_key=True)
    comment_id = Column(String(100), unique=True, nullable=False)
    original_text = Column(Text)
    cleaned_text = Column(Text)
    language = Column(String(10))
    
    commenter_name = Column(String(200))
    commenter_id = Column(String(100))
    comment_time = Column(DateTime)
    comment_likes = Column(Integer, default=0)
    replies_count = Column(Integer, default=0)
    
    # Nuevos campos para múltiples plataformas
    platform = Column(String(20), default='facebook')  # 'facebook', 'tiktok'
    category = Column(String(50))  # Categoría del contenido
    
    # Relación con post
    post_id = Column(Integer, ForeignKey('fb_posts.id'))
    post = relationship("Post", back_populates="comments")
    
    # Relación con análisis de sentimiento
    sentiment = relationship("CommentSentiment", back_populates="comment", uselist=False)
    
    collected_at = Column(DateTime, default=datetime.now)
    
    @staticmethod
    def create_user_hash(user_identifier: str) -> str:
        """
        Crea un hash anónimo para un identificador de usuario.
        
        Args:
            user_identifier: Identificador original del usuario (nombre, ID, etc.)
            
        Returns:
            Hash SHA256 del identificador para anonimización
        """
        return hashlib.sha256(user_identifier.encode('utf-8')).hexdigest()[:16]
    
    def __repr__(self):
        return f"<Comment(id={self.id}, comment_id='{self.comment_id}')>"


class CommentSentiment(Base):
    """Modelo para análisis de sentimientos de comentarios"""
    __tablename__ = 'comment_sentiments'
    
    id = Column(Integer, primary_key=True)
    comment_id = Column(Integer, ForeignKey('fb_comments.id'), unique=True)
    
    sentiment = Column(String(20))  # positivo, negativo, neutral
    confidence = Column(Float)
    
    # Scores detallados
    score_positive = Column(Float)
    score_negative = Column(Float)
    score_neutral = Column(Float)
    
    model_used = Column(String(50))  # beto, vader, textblob
    analyzed_at = Column(DateTime, default=datetime.now)
    
    # Relación
    comment = relationship("Comment", back_populates="sentiment")
    
    def __repr__(self):
        return f"<CommentSentiment(id={self.id}, sentiment='{self.sentiment}', confidence={self.confidence:.2f})>"


class WeeklyReport(Base):
    """Modelo para reportes semanales"""
    __tablename__ = 'weekly_reports'
    
    id = Column(Integer, primary_key=True)
    week_number = Column(Integer)
    year = Column(Integer)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    
    topic_id = Column(Integer, ForeignKey('topics.id'))
    topic = relationship("Topic")
    
    # Estadísticas
    total_posts = Column(Integer, default=0)
    total_comments = Column(Integer, default=0)
    total_positive = Column(Integer, default=0)
    total_negative = Column(Integer, default=0)
    total_neutral = Column(Integer, default=0)
    
    avg_sentiment_score = Column(Float)
    
    # Metadata del reporte
    report_file_path = Column(String(500))
    created_at = Column(DateTime, default=datetime.now)
    
    def __repr__(self):
        return f"<WeeklyReport(id={self.id}, week={self.week_number}, year={self.year})>"


class SearchEvent(Base):
    """Registro de búsquedas realizadas en la plataforma (tendencias / hot topics)."""
    __tablename__ = 'search_events'

    id = Column(Integer, primary_key=True)
    keyword = Column(String(200), nullable=False)
    keyword_norm = Column(String(200), nullable=False, index=True)
    category = Column(String(50), index=True)
    source = Column(String(30), default='unified')  # unified | facebook | tiktok
    created_at = Column(DateTime, default=datetime.now, index=True)

    def __repr__(self):
        return f"<SearchEvent(id={self.id}, keyword='{self.keyword}', category='{self.category}')>"


class SearchSnapshot(Base):
    """Resultado completo de una búsqueda (cache para búsquedas populares)."""
    __tablename__ = 'search_snapshots'

    id = Column(Integer, primary_key=True)
    keyword = Column(String(200), nullable=False)
    keyword_norm = Column(String(200), nullable=False, unique=True, index=True)
    source = Column(String(30), default='unified')
    payload = Column(Text, nullable=False)  # JSON: facebook, tiktok, errores
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    def __repr__(self):
        return f"<SearchSnapshot(id={self.id}, keyword='{self.keyword}')>"
