"""
Analizador de sentimientos mejorado usando modelos de Hugging Face.
Integrado al sistema principal con soporte para robertuito-sentiment-analysis.
"""
import os
import torch
from typing import Dict, List, Optional, Any
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
import warnings
warnings.filterwarnings('ignore')

from src.utils.logger import setup_logger

logger = setup_logger(__name__)


class HuggingFaceSentimentAnalyzer:
    """
    Analizador de sentimientos usando modelos de Hugging Face optimizados para español.
    """
    
    def __init__(self, model_name: str = 'pysentimiento/robertuito-sentiment-analysis'):
        """
        Inicializa el analizador de sentimientos.
        
        Args:
            model_name: Nombre del modelo en Hugging Face Hub
                       - 'pysentimiento/robertuito-sentiment-analysis' (recomendado para redes sociales)
                       - 'finiteautomata/beto-sentiment-analysis' (alternativa)
        """
        self.model_name = model_name
        self.device = 0 if torch.cuda.is_available() else -1
        self.pipeline = None
        self.tokenizer = None
        self.model = None
        
        self._load_model()
    
    def _load_model(self):
        """Carga el modelo de análisis de sentimientos."""
        try:
            logger.info(f"Cargando modelo de Hugging Face: {self.model_name}")
            logger.info(f"Dispositivo: {'GPU' if self.device == 0 else 'CPU'}")
            
            # Usar pipeline para simplicidad y optimización automática
            self.pipeline = pipeline(
                "sentiment-analysis",
                model=self.model_name,
                tokenizer=self.model_name,
                device=self.device,
                return_all_scores=True  # Obtener todas las probabilidades
            )
            
            logger.info(f"Modelo {self.model_name} cargado correctamente")
            
        except Exception as e:
            logger.error(f"Error al cargar modelo {self.model_name}: {e}")
            logger.info("Intentando cargar modelo alternativo...")
            
            # Fallback a beto-sentiment-analysis
            try:
                fallback_model = "finiteautomata/beto-sentiment-analysis"
                self.pipeline = pipeline(
                    "sentiment-analysis",
                    model=fallback_model,
                    tokenizer=fallback_model,
                    device=self.device,
                    return_all_scores=True
                )
                self.model_name = fallback_model
                logger.info(f"Modelo alternativo {fallback_model} cargado exitosamente")
                
            except Exception as e2:
                logger.error(f"No se pudo cargar ningún modelo de Hugging Face: {e2}")
                raise Exception(f"Error crítico: No se pueden cargar modelos de sentimientos: {e2}")
    
    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Analiza el sentimiento de un texto.
        
        Args:
            text: Texto a analizar
            
        Returns:
            Dict con análisis de sentimiento:
            {
                'sentiment': str,      # 'positive', 'negative', 'neutral'
                'confidence': float,   # Confianza de la predicción principal
                'scores': Dict,        # Todas las probabilidades
                'model_used': str      # Modelo utilizado
            }
        """
        if not text or len(text.strip()) == 0:
            return self._default_result()
        
        try:
            # Preprocesar texto
            cleaned_text = self._preprocess_text(text)
            
            # Realizar análisis
            results = self.pipeline(cleaned_text)[0]  # [0] porque devuelve lista
            
            # Procesar resultados
            sentiment_mapping = {}
            for result in results:
                label = result['label'].upper()
                score = result['score']
                sentiment_mapping[label] = score
            
            # Obtener sentimiento principal
            main_sentiment = max(sentiment_mapping, key=sentiment_mapping.get)
            confidence = sentiment_mapping[main_sentiment]
            
            # Normalizar sentimiento
            normalized_sentiment = self._normalize_sentiment_label(main_sentiment)
            
            return {
                'sentiment': normalized_sentiment,
                'confidence': float(confidence),
                'scores': {
                    'positive': sentiment_mapping.get('POS', sentiment_mapping.get('POSITIVE', 0.0)),
                    'negative': sentiment_mapping.get('NEG', sentiment_mapping.get('NEGATIVE', 0.0)),
                    'neutral': sentiment_mapping.get('NEU', sentiment_mapping.get('NEUTRAL', 0.0))
                },
                'model_used': self.model_name
            }
            
        except Exception as e:
            logger.error(f"Error al analizar texto: {e}")
            return self._default_result()
    
    def analyze_batch(self, texts: List[str], batch_size: int = 16) -> List[Dict[str, Any]]:
        """
        Analiza múltiples textos en lotes para mayor eficiencia.
        
        Args:
            texts: Lista de textos a analizar
            batch_size: Tamaño del lote
            
        Returns:
            Lista de resultados de análisis
        """
        if not texts:
            return []
        
        results = []
        
        # Procesar en lotes
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_results = self._process_batch(batch)
            results.extend(batch_results)
            
            # Log progreso para lotes grandes
            if len(texts) > 100:
                logger.info(f"Procesados {min(i + batch_size, len(texts))}/{len(texts)} textos")
        
        return results
    
    def _process_batch(self, batch: List[str]) -> List[Dict[str, Any]]:
        """Procesa un lote de textos."""
        try:
            # Preprocesar textos
            cleaned_batch = [self._preprocess_text(text) for text in batch]
            
            # Filtrar textos vacíos y recordar índices
            valid_texts = []
            valid_indices = []
            for i, text in enumerate(cleaned_batch):
                if text and text.strip():
                    valid_texts.append(text)
                    valid_indices.append(i)
            
            if not valid_texts:
                return [self._default_result() for _ in batch]
            
            # Analizar textos válidos
            batch_results = self.pipeline(valid_texts)
            
            # Reconstruir resultados completos
            results = []
            valid_result_idx = 0
            
            for i in range(len(batch)):
                if i in valid_indices:
                    # Texto válido - procesar resultado
                    result_data = batch_results[valid_result_idx]
                    
                    # Extraer información de sentimiento
                    sentiment_mapping = {}
                    for result in result_data:
                        label = result['label'].upper()
                        score = result['score']
                        sentiment_mapping[label] = score
                    
                    main_sentiment = max(sentiment_mapping, key=sentiment_mapping.get)
                    confidence = sentiment_mapping[main_sentiment]
                    normalized_sentiment = self._normalize_sentiment_label(main_sentiment)
                    
                    results.append({
                        'sentiment': normalized_sentiment,
                        'confidence': float(confidence),
                        'scores': {
                            'positive': sentiment_mapping.get('POS', sentiment_mapping.get('POSITIVE', 0.0)),
                            'negative': sentiment_mapping.get('NEG', sentiment_mapping.get('NEGATIVE', 0.0)),
                            'neutral': sentiment_mapping.get('NEU', sentiment_mapping.get('NEUTRAL', 0.0))
                        },
                        'model_used': self.model_name
                    })
                    
                    valid_result_idx += 1
                else:
                    # Texto inválido - resultado por defecto
                    results.append(self._default_result())
            
            return results
            
        except Exception as e:
            logger.error(f"Error al procesar lote: {e}")
            # Si falla el lote completo, procesar individualmente
            return [self.analyze_text(text) for text in batch]
    
    def _preprocess_text(self, text: str) -> str:
        """
        Preprocesa el texto para mejorar el análisis.
        
        Args:
            text: Texto original
            
        Returns:
            Texto preprocesado
        """
        if not text:
            return ""
        
        # Limpiar y normalizar
        cleaned = text.strip()
        
        # Truncar si es muy largo (la mayoría de modelos tienen límite ~512 tokens)
        if len(cleaned) > 500:
            cleaned = cleaned[:500].rsplit(' ', 1)[0]  # Cortar en palabra completa
        
        return cleaned
    
    def _normalize_sentiment_label(self, label: str) -> str:
        """
        Normaliza las etiquetas de sentimiento a formato estándar.
        
        Args:
            label: Etiqueta del modelo
            
        Returns:
            'positive', 'negative', o 'neutral'
        """
        label_upper = label.upper()
        
        # Mapeo de etiquetas comunes
        if any(keyword in label_upper for keyword in ['POS', 'POSITIV']):
            return 'positive'
        elif any(keyword in label_upper for keyword in ['NEG', 'NEGATIV']):
            return 'negative'
        elif any(keyword in label_upper for keyword in ['NEU', 'NEUTRAL']):
            return 'neutral'
        else:
            logger.warning(f"Etiqueta de sentimiento no reconocida: {label}")
            return 'neutral'
    
    def _default_result(self) -> Dict[str, Any]:
        """Retorna un resultado por defecto para textos inválidos."""
        return {
            'sentiment': 'neutral',
            'confidence': 0.0,
            'scores': {
                'positive': 0.0,
                'negative': 0.0,
                'neutral': 1.0
            },
            'model_used': self.model_name
        }
    
    def get_model_info(self) -> Dict[str, str]:
        """Retorna información sobre el modelo actual."""
        return {
            'name': self.model_name,
            'device': 'GPU' if self.device == 0 else 'CPU',
            'framework': 'transformers/pytorch'
        }


# Instancia global del analizador (singleton pattern)
_global_analyzer = None


def get_huggingface_analyzer(model_name: str = 'pysentimiento/robertuito-sentiment-analysis') -> HuggingFaceSentimentAnalyzer:
    """
    Obtiene o crea la instancia global del analizador de Hugging Face.
    
    Args:
        model_name: Nombre del modelo a usar
        
    Returns:
        Instancia del analizador
    """
    global _global_analyzer
    
    if _global_analyzer is None or _global_analyzer.model_name != model_name:
        logger.info(f"Inicializando nuevo analizador con modelo: {model_name}")
        _global_analyzer = HuggingFaceSentimentAnalyzer(model_name=model_name)
    
    return _global_analyzer


def analyze_sentiment_hf(text: str, model_name: str = 'pysentimiento/robertuito-sentiment-analysis') -> Dict[str, Any]:
    """
    Función de conveniencia para analizar un texto con Hugging Face.
    
    Args:
        text: Texto a analizar
        model_name: Modelo a usar
        
    Returns:
        Resultado del análisis
    """
    analyzer = get_huggingface_analyzer(model_name)
    return analyzer.analyze_text(text)