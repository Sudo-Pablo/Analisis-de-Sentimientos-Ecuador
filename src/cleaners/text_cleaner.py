"""
Limpiador de texto para comentarios de redes sociales
"""
import re
import logging
from typing import List, Dict
import pandas as pd
from langdetect import detect, LangDetectException

logger = logging.getLogger(__name__)


class TextCleaner:
    """
    Clase para limpiar y normalizar texto de comentarios
    """
    
    def __init__(self):
        """Inicializa el limpiador de texto"""
        # Palabras comunes a eliminar (spam, muy cortas)
        self.spam_patterns = [
            r'\b(jaja|jeje|jiji|jojo)+\b',  # Risas repetidas
            r'\b(wow|ok|si|no)\b$',  # Palabras muy cortas solas
        ]
        
        # Emojis y caracteres especiales
        self.emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # símbolos y pictogramas
            "\U0001F680-\U0001F6FF"  # transporte y símbolos
            "\U0001F1E0-\U0001F1FF"  # banderas
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "]+",
            flags=re.UNICODE
        )
        
        logger.info("TextCleaner inicializado")
    
    def clean_text(self, text: str) -> str:
        """
        Limpia un texto individual
        
        Args:
            text: Texto a limpiar
            
        Returns:
            Texto limpio
        """
        if not text or not isinstance(text, str):
            return ""
        
        # Convertir a minúsculas
        text = text.lower()
        
        # Eliminar URLs
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        
        # Eliminar menciones (@usuario)
        text = re.sub(r'@\w+', '', text)
        
        # Eliminar hashtags pero mantener el texto
        text = re.sub(r'#(\w+)', r'\1', text)
        
        # Eliminar emojis
        text = self.emoji_pattern.sub(r'', text)
        
        # Eliminar caracteres especiales excepto puntuación básica
        text = re.sub(r'[^a-záéíóúñü\s.,!?¿¡]', '', text)
        
        # Eliminar números
        text = re.sub(r'\d+', '', text)
        
        # Eliminar espacios múltiples
        text = re.sub(r'\s+', ' ', text)
        
        # Eliminar espacios al inicio y final
        text = text.strip()
        
        return text
    
    def remove_spam(self, text: str) -> str:
        """
        Elimina patrones de spam
        
        Args:
            text: Texto a verificar
            
        Returns:
            Texto sin spam o vacío si es spam
        """
        for pattern in self.spam_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        return text.strip()
    
    def is_valid_comment(self, text: str, min_length: int = 10) -> bool:
        """
        Verifica si un comentario es válido
        
        Args:
            text: Texto a validar
            min_length: Longitud mínima requerida
            
        Returns:
            True si el comentario es válido
        """
        if not text or len(text) < min_length:
            return False
        
        # Verificar que tenga al menos 3 palabras
        words = text.split()
        if len(words) < 3:
            return False
        
        # Verificar que no sea solo puntuación
        if re.match(r'^[.,!?¿¡\s]+$', text):
            return False
        
        return True
    
    def detect_language(self, text: str) -> str:
        """
        Detecta el idioma del texto
        
        Args:
            text: Texto a analizar
            
        Returns:
            Código del idioma (es, en, etc.) o 'unknown'
        """
        try:
            return detect(text)
        except LangDetectException:
            return 'unknown'
    
    def clean_comments_batch(
        self, 
        comments: List[Dict],
        filter_language: str = 'es',
        min_length: int = 10
    ) -> pd.DataFrame:
        """
        Limpia un lote de comentarios
        
        Args:
            comments: Lista de diccionarios con comentarios
            filter_language: Filtrar por idioma (es para español)
            min_length: Longitud mínima del comentario
            
        Returns:
            DataFrame con comentarios limpios
        """
        logger.info(f"Limpiando {len(comments)} comentarios")
        
        cleaned_data = []
        
        for comment in comments:
            original_text = comment.get('text', '')
            
            # Limpiar texto
            cleaned_text = self.clean_text(original_text)
            cleaned_text = self.remove_spam(cleaned_text)
            
            # Validar comentario
            if not self.is_valid_comment(cleaned_text, min_length):
                continue
            
            # Detectar idioma
            language = self.detect_language(cleaned_text)
            
            # Filtrar por idioma si se especifica
            if filter_language and language != filter_language:
                continue
            
            # Agregar a datos limpios
            cleaned_comment = {
                'comment_id': comment.get('comment_id'),
                'post_id': comment.get('post_id'),
                'original_text': original_text,
                'cleaned_text': cleaned_text,
                'language': language,
                'commenter_name': comment.get('commenter_name', ''),
                'comment_time': comment.get('comment_time'),
                'comment_likes': comment.get('comment_likes', 0),
                'collected_at': comment.get('collected_at')
            }
            
            cleaned_data.append(cleaned_comment)
        
        df = pd.DataFrame(cleaned_data)
        
        logger.info(f"Comentarios válidos después de limpieza: {len(df)}")
        logger.info(f"Comentarios descartados: {len(comments) - len(df)}")
        
        return df
    
    def clean_dataset(self, df: pd.DataFrame, text_column: str = 'text') -> pd.DataFrame:
        """
        Limpia un DataFrame completo
        
        Args:
            df: DataFrame con comentarios
            text_column: Nombre de la columna con texto
            
        Returns:
            DataFrame limpio
        """
        logger.info(f"Limpiando dataset con {len(df)} registros")
        
        # Crear copia
        df_clean = df.copy()
        
        # Limpiar textos
        df_clean['cleaned_text'] = df_clean[text_column].apply(self.clean_text)
        df_clean['cleaned_text'] = df_clean['cleaned_text'].apply(self.remove_spam)
        
        # Detectar idioma
        df_clean['language'] = df_clean['cleaned_text'].apply(self.detect_language)
        
        # Filtrar comentarios válidos
        df_clean = df_clean[df_clean['cleaned_text'].apply(
            lambda x: self.is_valid_comment(x)
        )]
        
        # Filtrar español
        df_clean = df_clean[df_clean['language'] == 'es']
        
        # Eliminar duplicados
        initial_count = len(df_clean)
        df_clean = df_clean.drop_duplicates(subset=['cleaned_text'])
        logger.info(f"Duplicados eliminados: {initial_count - len(df_clean)}")
        
        logger.info(f"Dataset final: {len(df_clean)} registros válidos")
        
        return df_clean.reset_index(drop=True)
