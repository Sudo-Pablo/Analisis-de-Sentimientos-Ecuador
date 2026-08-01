"""
Orquestador de recolección periódica (diaria/semanal) para tiempo real.

Flujos ejecutados:
1) Buscador TikTok (Apify) por topics configurados
2) Buscador Facebook (PPR / Apify) por topics configurados

Uso:
  python scripts/scrapers/run_scheduled_realtime_collection.py --frequency daily
  python scripts/scrapers/run_scheduled_realtime_collection.py --frequency weekly --weekly-day monday
"""

import argparse
import asyncio
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List

# Agregar raíz del proyecto al path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.routes.tiktok_search import TikTokSearchRequest, search_tiktok
from api.routes.facebook_search import FacebookSearchRequest, search_facebook


logger = logging.getLogger(__name__)


TOPIC_TO_CATEGORY: Dict[str, str] = {
    "salud": "Salud",
    "seguridad": "Seguridad",
    "economia": "Economia",
    "politica": "Politica",
}


def setup_logging() -> None:
    """Configura logging para el proceso programado."""
    log_dir = project_root / "logs"
    log_dir.mkdir(exist_ok=True)

    log_file = log_dir / f"scheduled_collection_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )
    logger.info("Log de ejecución: %s", log_file)


def should_run_today(frequency: str, weekly_day: str) -> bool:
    """Valida si debe ejecutarse hoy según la frecuencia."""
    if frequency == "daily":
        return True

    today = datetime.now().strftime("%A").lower()
    return today == weekly_day.lower()


def get_topics() -> List[str]:
    """Topics usados en la recolección periódica."""
    return list(TOPIC_TO_CATEGORY.keys())


async def run_tiktok_realtime(topics: List[str], max_posts: int, max_comments: int) -> Dict[str, int]:
    """Ejecuta búsqueda TikTok en tiempo real por topics configurados."""
    totals = {"videos": 0, "comments": 0, "errors": 0}

    for topic in topics:
        category = TOPIC_TO_CATEGORY.get(topic, "Social")
        keyword = f"{topic} ecuador"

        logger.info("[TikTok] Ejecutando búsqueda para topic='%s' keyword='%s'", topic, keyword)

        try:
            req = TikTokSearchRequest(
                keyword=keyword,
                categoria=category,
                max_videos=max_posts,
                max_comments_per_video=max_comments,
            )
            resp = await search_tiktok(req)

            totals["videos"] += resp.videos_found
            totals["comments"] += resp.comments_analyzed

            logger.info(
                "[TikTok] OK topic='%s' videos=%s comments=%s saved=%s",
                topic,
                resp.videos_found,
                resp.comments_analyzed,
                resp.saved_to_db,
            )
        except Exception as exc:
            totals["errors"] += 1
            logger.error("[TikTok] Error topic='%s': %s", topic, exc)

    return totals


async def run_facebook_apify_realtime(topics: List[str], max_posts: int, max_comments: int) -> Dict[str, int]:
    """Ejecuta búsqueda Facebook tiempo real (método Apify/PPR) por topics."""
    totals = {"posts": 0, "comments": 0, "errors": 0}

    for topic in topics:
        category = TOPIC_TO_CATEGORY.get(topic, "Politica")
        keyword = f"{topic} ecuador"

        logger.info("[Facebook Apify] Ejecutando búsqueda para topic='%s' keyword='%s'", topic, keyword)

        try:
            req = FacebookSearchRequest(
                keyword=keyword,
                categoria=category,
                method="ppr",
                max_posts=max_posts,
                max_comments_per_post=max_comments,
            )
            resp = await search_facebook(req)

            totals["posts"] += resp.posts_found
            totals["comments"] += resp.comments_analyzed

            logger.info(
                "[Facebook Apify] OK topic='%s' method='%s' posts=%s comments=%s saved=%s",
                topic,
                resp.method,
                resp.posts_found,
                resp.comments_analyzed,
                resp.saved_to_db,
            )
        except Exception as exc:
            totals["errors"] += 1
            logger.error("[Facebook Apify] Error topic='%s': %s", topic, exc)

    return totals


async def main_async(args: argparse.Namespace) -> int:
    """Flujo principal asíncrono."""
    if not should_run_today(args.frequency, args.weekly_day):
        logger.info(
            "Hoy no corresponde ejecutar. frequency=%s weekly_day=%s",
            args.frequency,
            args.weekly_day,
        )
        return 0

    topics = get_topics()
    logger.info("Topics configurados: %s", ", ".join(topics))

    logger.info("=== INICIO RECOLECCIÓN PERIÓDICA (%s) ===", args.frequency)

    # 1) TikTok realtime
    tiktok_stats = await run_tiktok_realtime(
        topics=topics,
        max_posts=args.max_posts,
        max_comments=args.max_comments,
    )

    # 2) Facebook Apify / PPR realtime
    facebook_apify_stats = await run_facebook_apify_realtime(
        topics=topics,
        max_posts=args.max_posts,
        max_comments=args.max_comments,
    )

    logger.info("=== RESUMEN ===")
    logger.info("TikTok: %s", tiktok_stats)
    logger.info("Facebook Apify/PPR: %s", facebook_apify_stats)

    logger.info("=== FIN RECOLECCIÓN PERIÓDICA ===")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Orquestador de recolección periódica (TikTok + Facebook PPR/Apify)")
    parser.add_argument("--frequency", choices=["daily", "weekly"], default="weekly", help="Frecuencia de ejecución")
    parser.add_argument(
        "--weekly-day",
        choices=["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        default="monday",
        help="Día de ejecución para modo weekly",
    )
    parser.add_argument("--max-posts", type=int, default=5, help="Máximo de posts/videos por topic en búsquedas realtime")
    parser.add_argument("--max-comments", type=int, default=10, help="Máximo de comentarios por post/video en búsquedas realtime")
    return parser.parse_args()


def main() -> int:
    setup_logging()
    args = parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    raise SystemExit(main())
