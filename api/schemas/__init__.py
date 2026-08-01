"""
Schemas Pydantic para validación de datos de la API
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import json


class TopicBase(BaseModel):
    """Schema base para temas"""
    name: str
    keywords: List[str]
    active: bool = True
    
    @field_validator('keywords', mode='before')
    @classmethod
    def parse_keywords(cls, v):
        """Parsear keywords si vienen como string JSON"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [v]
        return v


class TopicResponse(TopicBase):
    """Respuesta de tema con ID"""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class SentimentScore(BaseModel):
    """Scores de confianza por sentimiento"""
    negative: float = Field(..., ge=0.0, le=1.0)
    neutral: float = Field(..., ge=0.0, le=1.0)
    positive: float = Field(..., ge=0.0, le=1.0)


class CommentSentimentResponse(BaseModel):
    """Respuesta de sentimiento de comentario"""
    id: int
    comment_id: int
    sentiment: str  # 'positivo', 'negativo', 'neutral'
    confidence: float
    model_used: str
    scores: Optional[SentimentScore] = None
    analyzed_at: datetime
    
    class Config:
        from_attributes = True


class PostInfo(BaseModel):
    """Información resumida del post para incluir en comentarios"""
    id: int
    post_id: str
    platform: str = 'facebook'
    topic_id: Optional[int] = None
    category: Optional[str] = None
    
    class Config:
        from_attributes = True


class CommentResponse(BaseModel):
    """Respuesta de comentario"""
    id: int
    comment_id: str
    post_id: int | str
    original_text: str
    cleaned_text: Optional[str] = None
    commenter_name: Optional[str] = None
    comment_time: Optional[datetime] = None
    comment_likes: int = 0
    platform: Optional[str] = None
    post: Optional[PostInfo] = None
    sentiment: Optional[CommentSentimentResponse] = None
    collected_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PostResponse(BaseModel):
    """Respuesta de post"""
    id: int
    post_id: str
    page_id: str
    topic_name: Optional[str] = None
    text: str
    url: Optional[str] = None
    date: Optional[datetime] = None
    likes: int = 0
    shares: int = 0
    comments_count: int = 0
    
    class Config:
        from_attributes = True


class HistoricalPostItem(BaseModel):
    """Post histórico desde la base de datos"""
    id: int
    post_id: str
    platform: str = 'facebook'
    category: Optional[str] = None
    text: Optional[str] = None
    author_name: Optional[str] = None
    post_url: Optional[str] = None
    post_time: Optional[datetime] = None
    collected_at: Optional[datetime] = None
    likes: int = 0
    comments_count: int = 0
    shares: int = 0

    class Config:
        from_attributes = True


class PostsByCategoryResponse(BaseModel):
    """Listado paginado de posts por categoría"""
    category: str
    total: int
    limit: int
    offset: int
    posts: List[HistoricalPostItem]


class SentimentDistribution(BaseModel):
    """Distribución de sentimientos"""
    positive: int
    negative: int
    neutral: int
    total: int


class SentimentStats(BaseModel):
    """Estadísticas de sentimientos"""
    topic_id: Optional[int] = None
    topic_name: Optional[str] = None
    distribution: SentimentDistribution
    positive_percentage: float
    negative_percentage: float
    neutral_percentage: float
    date_range: Dict[str, str]  # start_date, end_date


class WeeklyReportResponse(BaseModel):
    """Respuesta de reporte semanal"""
    id: int
    topic_id: int
    topic_name: str
    week_start: datetime
    week_end: datetime
    total_comments: int
    positive_count: int
    negative_count: int
    neutral_count: int
    positive_percentage: float
    negative_percentage: float
    neutral_percentage: float
    created_at: datetime
    
    class Config:
        from_attributes = True


class TimeSeriesPoint(BaseModel):
    """Punto en serie temporal"""
    date: str
    positive: int
    negative: int
    neutral: int
    total: int


class TopicSentimentEvolution(BaseModel):
    """Evolución temporal de sentimientos por tema"""
    topic_id: int
    topic_name: str
    data: List[TimeSeriesPoint]


class SocialNetworkDistribution(BaseModel):
    """Distribución por red social"""
    name: str  # 'Facebook', 'TikTok'
    value: int
    percentage: float


class DashboardSummary(BaseModel):
    """Resumen para dashboard principal"""
    total_comments: int
    total_posts: int
    sentiment_distribution: SentimentDistribution
    topics_breakdown: List[Dict[str, Any]]
    social_networks: List[SocialNetworkDistribution]
    recent_comments: List[CommentResponse]
    date_range: Dict[str, str]
