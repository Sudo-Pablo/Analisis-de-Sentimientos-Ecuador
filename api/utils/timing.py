"""Utilidades de medición de tiempo para rutas de búsqueda."""
import logging
import time
from contextlib import contextmanager
from typing import Dict

logger = logging.getLogger(__name__)


class SearchTiming:
    def __init__(self, label: str):
        self.label = label
        self._starts: Dict[str, float] = {}
        self.stages: Dict[str, float] = {}
        self._t0 = time.perf_counter()

    @contextmanager
    def stage(self, name: str):
        start = time.perf_counter()
        try:
            yield
        finally:
            self.stages[name] = round(time.perf_counter() - start, 3)

    def total_seconds(self) -> float:
        return round(time.perf_counter() - self._t0, 3)

    def log_summary(self, **extra):
        parts = [f"{k}={v}s" for k, v in self.stages.items()]
        parts.append(f"total={self.total_seconds()}s")
        for key, value in extra.items():
            parts.append(f"{key}={value}")
        logger.info("[timing] %s %s", self.label, " ".join(parts))
