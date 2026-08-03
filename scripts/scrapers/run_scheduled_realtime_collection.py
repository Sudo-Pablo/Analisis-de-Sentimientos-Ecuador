"""
Orquestador CLI de recolección periódica (Facebook PPR/Apify + TikTok).

Usa el mismo servicio que el endpoint:
  POST /api/internal/scheduled-collection

Uso local (prueba pequeña):
  python scripts/scrapers/run_scheduled_realtime_collection.py --max-posts 1 --max-comments 3

Solo una categoría / plataforma:
  python scripts/scrapers/run_scheduled_realtime_collection.py --categories Salud --platforms tiktok

Render Cron Job (recomendado frente a curl HTTP por timeouts largos):
  python scripts/scrapers/run_scheduled_realtime_collection.py
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from api.services.scheduled_collection import DEFAULT_CATEGORIES, run_scheduled_collection

logger = logging.getLogger(__name__)


def setup_logging() -> Path:
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
    return log_file


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Recolección automática por categorías (persistencia en PostgreSQL)"
    )
    parser.add_argument(
        "--platforms",
        nargs="+",
        choices=["facebook", "tiktok"],
        default=None,
        help="Plataformas (default: facebook tiktok)",
    )
    parser.add_argument(
        "--categories",
        nargs="+",
        choices=DEFAULT_CATEGORIES,
        default=None,
        help=f"Categorías (default: {' '.join(DEFAULT_CATEGORIES)})",
    )
    parser.add_argument("--max-posts", type=int, default=None, help="Máx. posts/videos por keyword")
    parser.add_argument("--max-comments", type=int, default=None, help="Máx. comentarios por post/video")
    parser.add_argument(
        "--keywords-per-category",
        type=int,
        default=None,
        help="Keywords a tomar por categoría en esta corrida (rotación cada 3h)",
    )
    parser.add_argument(
        "--facebook-method",
        choices=["ppr", "apify"],
        default=None,
        help="Método Facebook (default en config: ppr)",
    )
    parser.add_argument(
        "--facebook-dual-search",
        action="store_true",
        help="Activa dual_search PPR (más caro/lento; off por default en cron)",
    )
    parser.add_argument(
        "--json-out",
        type=Path,
        default=None,
        help="Ruta opcional para guardar el resumen JSON",
    )
    return parser.parse_args()


def main() -> int:
    setup_logging()
    args = parse_args()

    try:
        summary = run_scheduled_collection(
            platforms=args.platforms,
            categories=args.categories,
            max_posts=args.max_posts,
            max_comments=args.max_comments,
            keywords_per_category=args.keywords_per_category,
            facebook_method=args.facebook_method,
            facebook_dual_search=True if args.facebook_dual_search else None,
        )
    except Exception as exc:
        logger.error("Fallo la recolección programada: %s", exc, exc_info=True)
        return 1

    logger.info("=== RESUMEN ===")
    logger.info("%s", json.dumps(summary["totals"], ensure_ascii=False))

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info("Resumen guardado en %s", args.json_out)

    return 0 if summary["totals"]["errors"] == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
