"""
Analizador de sentimientos para texto en español
"""
import logging
from typing import Dict, List, Tuple
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


def _import_torch():
    import torch
    return torch


def _import_transformers():
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    return AutoTokenizer, AutoModelForSequenceClassification


def _import_textblob():
    """Import diferido: evita fallos de nltk/defusedxml al arrancar la API."""
    from textblob import TextBlob
    return TextBlob


def _import_vader():
    """Import diferido de VADER/NLTK solo si se usa ese modelo."""
    import nltk
    from nltk.sentiment.vader import SentimentIntensityAnalyzer
    return nltk, SentimentIntensityAnalyzer


class SentimentAnalyzer:
    """
    Analizador de sentimientos multimodelo para español
    """
    
    def __init__(self, model_name: str = 'beto'):
        """
        Inicializa el analizador de sentimientos
        
        Args:
            model_name: Modelo a usar ('beto', 'vader', 'textblob')
        """
        self.model_name = model_name
        self.device = None
        
        # Inicializar modelo según configuración
        if model_name == 'beto':
            self._init_beto_model()
        elif model_name == 'vader':
            self._init_vader()
        else:
            logger.info("Usando TextBlob como modelo predeterminado")
        
        logger.info(f"SentimentAnalyzer inicializado con modelo: {model_name}")
    
    def _init_beto_model(self):
        """Inicializa el modelo BETO para español"""
        try:
            torch = _import_torch()
            AutoTokenizer, AutoModelForSequenceClassification = _import_transformers()
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

            # Modelo BETO fine-tuned para análisis de sentimientos
            #model_path = "finiteautomata/beto-sentiment-analysis"
            model_path = "pysentimiento/robertuito-sentiment-analysis"
            
            logger.info(f"Cargando modelo BETO desde {model_path}")
            self.tokenizer = AutoTokenizer.from_pretrained(model_path)
            self.model = AutoModelForSequenceClassification.from_pretrained(
                model_path,
                low_cpu_mem_usage=True,
            )
            self.model.to(self.device)
            self.model.eval()
            
            # Mapeo de labels
            self.label_mapping = {0: 'negativo', 1: 'neutral', 2: 'positivo'}
            
            logger.info("Modelo BETO cargado exitosamente")
        except Exception as e:
            logger.error(f"Error al cargar BETO: {str(e)}")
            logger.info("Cambiando a modelo alternativo...")
            self.model_name = 'textblob'
    
    def _init_vader(self):
        """Inicializa VADER para análisis de sentimientos"""
        try:
            nltk, SentimentIntensityAnalyzer = _import_vader()
            nltk.download('vader_lexicon', quiet=True)
            self.vader = SentimentIntensityAnalyzer()
            logger.info("VADER inicializado")
        except Exception as e:
            logger.error(f"Error al inicializar VADER: {str(e)}")
            self.model_name = 'textblob'
    
    def analyze_with_beto(self, text: str) -> Dict:
        """
        Analiza sentimiento usando BETO
        
        Args:
            text: Texto a analizar
            
        Returns:
            Diccionario con sentimiento y confianza
        """
        try:
            torch = _import_torch()
            # Tokenizar
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Predicción
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probabilities = torch.softmax(logits, dim=1)
                predicted_class = torch.argmax(probabilities, dim=1).item()
                confidence = probabilities[0][predicted_class].item()
            
            sentiment = self.label_mapping[predicted_class]
            
            return {
                'sentiment': sentiment,
                'confidence': confidence,
                'scores': {
                    'negativo': probabilities[0][0].item(),
                    'neutral': probabilities[0][1].item(),
                    'positivo': probabilities[0][2].item()
                }
            }
        except Exception as e:
            logger.error(f"Error en análisis BETO: {str(e)}")
            return {'sentiment': 'neutral', 'confidence': 0.0, 'scores': {}}
    
    def analyze_with_vader(self, text: str) -> Dict:
        """
        Analiza sentimiento usando VADER
        
        Args:
            text: Texto a analizar
            
        Returns:
            Diccionario con sentimiento y confianza
        """
        try:
            scores = self.vader.polarity_scores(text)
            compound = scores['compound']
            
            # Clasificar según compound score
            if compound >= 0.05:
                sentiment = 'positivo'
                confidence = scores['pos']
            elif compound <= -0.05:
                sentiment = 'negativo'
                confidence = scores['neg']
            else:
                sentiment = 'neutral'
                confidence = scores['neu']
            
            return {
                'sentiment': sentiment,
                'confidence': confidence,
                'scores': {
                    'negativo': scores['neg'],
                    'neutral': scores['neu'],
                    'positivo': scores['pos'],
                    'compound': compound
                }
            }
        except Exception as e:
            logger.error(f"Error en análisis VADER: {str(e)}")
            return {'sentiment': 'neutral', 'confidence': 0.0, 'scores': {}}
    
    def analyze_with_textblob(self, text: str) -> Dict:
        """
        Analiza sentimiento usando TextBlob
        
        Args:
            text: Texto a analizar
            
        Returns:
            Diccionario con sentimiento y confianza
        """
        try:
            TextBlob = _import_textblob()
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity
            
            # Clasificar según polaridad
            if polarity > 0.1:
                sentiment = 'positivo'
            elif polarity < -0.1:
                sentiment = 'negativo'
            else:
                sentiment = 'neutral'
            
            confidence = abs(polarity)
            
            return {
                'sentiment': sentiment,
                'confidence': confidence,
                'scores': {
                    'polarity': polarity,
                    'subjectivity': blob.sentiment.subjectivity
                }
            }
        except Exception as e:
            logger.error(f"Error en análisis TextBlob: {str(e)}")
            return {'sentiment': 'neutral', 'confidence': 0.0, 'scores': {}}
    
    def analyze_sentiment(self, text: str) -> Dict:
        """
        Analiza el sentimiento de un texto usando el modelo configurado
        
        Args:
            text: Texto a analizar
            
        Returns:
            Diccionario con sentimiento, confianza y scores
        """
        if not text or not isinstance(text, str):
            return {'sentiment': 'neutral', 'confidence': 0.0, 'scores': {}}
        
        # Seleccionar método según modelo
        if self.model_name == 'beto':
            return self.analyze_with_beto(text)
        elif self.model_name == 'vader':
            return self.analyze_with_vader(text)
        else:
            return self.analyze_with_textblob(text)

    def _default_sentiment_result(self) -> Dict:
        return {'sentiment': 'neutral', 'confidence': 0.0, 'scores': {}}

    def _analyze_beto_batch(self, texts: List[str]) -> List[Dict]:
        """Inferencia BETO en lote (un forward pass por sub-lote)."""
        results = [self._default_sentiment_result() for _ in texts]
        valid_texts: List[str] = []
        valid_indices: List[int] = []

        for idx, text in enumerate(texts):
            if text and isinstance(text, str) and text.strip():
                valid_texts.append(text.strip())
                valid_indices.append(idx)

        if not valid_texts:
            return results

        try:
            torch = _import_torch()
            inputs = self.tokenizer(
                valid_texts,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True,
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = self.model(**inputs)
                probabilities = torch.softmax(outputs.logits, dim=1)
                predicted = torch.argmax(probabilities, dim=1)

            for j, orig_idx in enumerate(valid_indices):
                pred_class = predicted[j].item()
                results[orig_idx] = {
                    'sentiment': self.label_mapping[pred_class],
                    'confidence': probabilities[j][pred_class].item(),
                    'scores': {
                        'negativo': probabilities[j][0].item(),
                        'neutral': probabilities[j][1].item(),
                        'positivo': probabilities[j][2].item(),
                    },
                }
        except Exception as e:
            logger.error(f"Error en lote BETO, fallback secuencial: {str(e)}")
            for idx, text in enumerate(texts):
                results[idx] = self.analyze_sentiment(text)

        return results

    def analyze_sentiments_list(
        self,
        texts: List[str],
        batch_size: int = 16,
    ) -> List[Dict]:
        """
        Analiza una lista de textos y devuelve resultados en el mismo orden.
        Usa inferencia por lotes cuando el modelo es BETO.
        """
        if not texts:
            return []

        all_results: List[Dict] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            if self.model_name == 'beto' and hasattr(self, 'model'):
                all_results.extend(self._analyze_beto_batch(batch))
            else:
                all_results.extend(self.analyze_sentiment(t) for t in batch)

        return all_results
    
    def analyze_batch(
        self, 
        texts: List[str],
        batch_size: int = 32,
        show_progress: bool = True
    ) -> pd.DataFrame:
        """
        Analiza un lote de textos
        
        Args:
            texts: Lista de textos a analizar
            batch_size: Tamaño del lote para procesamiento
            show_progress: Mostrar progreso
            
        Returns:
            DataFrame con resultados del análisis
        """
        logger.info(f"Analizando {len(texts)} textos en lotes de {batch_size}")
        
        results = []
        
        # Procesar en lotes (inferencia real en BETO)
        list_results = self.analyze_sentiments_list(texts, batch_size=batch_size)
        results = list_results
        
        # Crear DataFrame
        df = pd.DataFrame(results)
        
        # Estadísticas
        sentiment_counts = df['sentiment'].value_counts()
        logger.info("Distribución de sentimientos:")
        for sentiment, count in sentiment_counts.items():
            percentage = (count / len(df)) * 100
            logger.info(f"  {sentiment}: {count} ({percentage:.2f}%)")
        
        return df
    
    def analyze_dataframe(
        self, 
        df: pd.DataFrame,
        text_column: str = 'cleaned_text'
    ) -> pd.DataFrame:
        """
        Analiza sentimientos en un DataFrame
        
        Args:
            df: DataFrame con comentarios
            text_column: Nombre de la columna con texto
            
        Returns:
            DataFrame con columnas de análisis agregadas
        """
        logger.info(f"Analizando DataFrame con {len(df)} registros")
        
        # Analizar textos
        results = self.analyze_batch(df[text_column].tolist())
        
        # Agregar resultados al DataFrame original
        df_result = df.copy()
        df_result['sentiment'] = results['sentiment']
        df_result['sentiment_confidence'] = results['confidence']
        
        # Agregar scores como columnas separadas
        if 'scores' in results.columns:
            scores_df = pd.json_normalize(results['scores'])
            for col in scores_df.columns:
                df_result[f'score_{col}'] = scores_df[col]
        
        logger.info("Análisis completado")
        
        return df_result
