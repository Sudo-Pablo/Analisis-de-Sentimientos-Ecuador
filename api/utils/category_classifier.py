"""Clasificación de categorías para posts/videos (Facebook y TikTok)."""
from __future__ import annotations

import logging
import unicodedata
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_ZERO_SHOT_CLASSIFIER: Optional[Any] = None

CONTENT_CATEGORIES: Dict[str, List[str]] = {
    "Politica": [
        "gobierno ecuador", "asamblea ecuador", "presidente ecuador",
        "elecciones ecuador", "politica nacional", "gobierno", "asamblea",
        "presidente", "elecciones", "decreto", "ley", "ministro",
    ],
    "Economia": [
        "economia ecuador", "inflacion ecuador", "empleo ecuador",
        "dolar ecuador", "precio combustible", "economia", "inflacion",
        "empleo", "presupuesto", "impuestos", "dolar",
    ],
    "Salud": [
        "salud publica", "hospitales ecuador", "iess ecuador",
        "medicina ecuador", "ministerio de salud", "salud", "hospital",
        "medico", "enfermedad", "vacuna", "msp",
    ],
    "Seguridad": [
        "seguridad ecuador", "delincuencia ecuador", "policia ecuador",
        "violencia ecuador", "estado de excepcion", "seguridad", "delincuencia",
        "policia", "violencia", "robo", "inseguridad",
    ],
    "Educacion": [
        "educacion ecuador", "universidad ecuador", "escuelas ecuador",
        "educacion", "universidad", "colegio", "estudiante", "profesor",
    ],
    "Social": [
        "sociedad ecuador", "cultura ecuador", "comunidad ecuador",
        "sociedad", "cultura", "comunidad", "tradicion", "familia",
        "turismo ecuador", "turismo", "destinos", "viajes ecuador",
        "hoteles ecuador", "lugares turisticos",
        # Deporte y entretenimiento social
        "deporte", "deportes", "futbol", "fútbol", "torneo", "campeonato",
        "partido", "liga", "equipo", "clasificado", "goleador", "jugador",
        "estadio", "seleccion", "selección", "basquet", "basquetbol",
        "tenis", "ciclismo", "atletismo", "olimpico", "olímpico",
        "copa", "mundial", "infanto juvenil", "escuela de futbol",
        "escuela de fútbol",
    ],
}

CATEGORY_LABELS = list(CONTENT_CATEGORIES.keys())

# Señales fuertes de contenido deportivo → Social (evita falsos positivos como "Salud" en nombres de equipos)
SPORTS_SIGNAL_KEYWORDS = [
    "deporte", "deportes", "futbol", "torneo", "campeonato", "partido",
    "liga", "goleador", "jugador", "estadio", "seleccion", "basquet",
    "tenis", "ciclismo", "atletismo", "olimpico", "copa", "mundial",
    "infanto juvenil", "escuela de futbol", "equipo clasificado",
]

# Alias históricos → categoría vigente
CATEGORY_ALIASES = {
    "turismo": "Social",
}


def normalize_category_name(name: Optional[str]) -> Optional[str]:
    if not name:
        return None
    cleaned = name.strip()
    if not cleaned:
        return None
    return CATEGORY_ALIASES.get(cleaned.lower(), cleaned)


def normalize_text(value: str) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch)).lower().strip()


def _count_keyword_hits(text_norm: str, keywords: List[str]) -> int:
    return sum(1 for keyword in keywords if normalize_text(keyword) in text_norm)


def detect_sports_content(text: str) -> bool:
    """True si el texto parece principalmente deportivo/recreativo."""
    text_norm = normalize_text(text)
    if not text_norm:
        return False
    hits = _count_keyword_hits(text_norm, SPORTS_SIGNAL_KEYWORDS)
    # También capturar variantes comunes sin acento ya normalizadas
    soft_hits = sum(
        1
        for token in ("futbol", "deporte", "torneo", "campeonato", "partido", "liga", "copa")
        if token in text_norm
    )
    return hits >= 1 or soft_hits >= 2


def _get_zero_shot_classifier():
    global _ZERO_SHOT_CLASSIFIER
    if _ZERO_SHOT_CLASSIFIER is None:
        from transformers import pipeline
        logger.info("Cargando clasificador zero-shot para categorías de contenido...")
        _ZERO_SHOT_CLASSIFIER = pipeline(
            "zero-shot-classification",
            model="recognai/bert-base-spanish-wwm-cased-xnli",
        )
    return _ZERO_SHOT_CLASSIFIER


def classify_with_dictionary(text: str) -> Optional[str]:
    text_norm = normalize_text(text)
    if not text_norm:
        return None

    # Deporte / torneos / fútbol → Social (antes que Salud/Educación por palabras sueltas)
    if detect_sports_content(text):
        return "Social"

    best_category = None
    best_score = 0
    for category, keywords in CONTENT_CATEGORIES.items():
        score = _count_keyword_hits(text_norm, keywords)
        if score > best_score:
            best_score = score
            best_category = category

    return best_category if best_score > 0 else None


def classify_with_ai(text: str) -> str:
    sample = (text or "").strip()
    if len(sample) > 512:
        sample = sample[:512]
    if len(sample) < 3:
        return "Social"

    # Priorizar Social si hay señales deportivas claras
    if detect_sports_content(sample):
        return "Social"

    try:
        classifier = _get_zero_shot_classifier()
        result = classifier(sample, CATEGORY_LABELS)
        category = result["labels"][0]
        score = result["scores"][0]
        logger.info("Categoría IA asignada: %s (score=%.3f)", category, score)
        return category
    except Exception as e:
        logger.error("Error en clasificación IA de categoría: %s", e, exc_info=True)
        return "Politica"


def assign_content_category(text: str, request_categoria: Optional[str] = None) -> str:
    """Asigna categoría: override del request, diccionario, o IA."""
    override = normalize_category_name(request_categoria)
    if override:
        return override

    dict_category = classify_with_dictionary(text)
    if dict_category:
        logger.info("Categoría por diccionario: %s", dict_category)
        return dict_category

    return normalize_category_name(classify_with_ai(text)) or "Social"
