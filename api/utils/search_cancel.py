"""
Cancelación de búsquedas en curso (frontend Stop + abort de runs Apify).
"""
from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass, field
from typing import Dict, Optional, Set

logger = logging.getLogger(__name__)

TERMINAL_STATUSES = {"SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT", "ABORTING"}


class SearchCancelled(Exception):
    """La búsqueda fue detenida por el usuario."""

    def __init__(self, search_id: str = "", message: str = "Búsqueda detenida"):
        self.search_id = search_id
        super().__init__(message)


@dataclass
class _SearchSession:
    cancelled: threading.Event = field(default_factory=threading.Event)
    run_ids: Set[str] = field(default_factory=set)
    lock: threading.Lock = field(default_factory=threading.Lock)
    refs: int = 0


_SESSIONS: Dict[str, _SearchSession] = {}
_SESSIONS_LOCK = threading.Lock()


def register_search(search_id: Optional[str]) -> None:
    if not search_id:
        return
    with _SESSIONS_LOCK:
        session = _SESSIONS.get(search_id)
        if not session:
            session = _SearchSession()
            _SESSIONS[search_id] = session
        session.refs += 1


def unregister_search(search_id: Optional[str]) -> None:
    if not search_id:
        return
    with _SESSIONS_LOCK:
        session = _SESSIONS.get(search_id)
        if not session:
            return
        session.refs = max(0, session.refs - 1)
        if session.refs <= 0:
            _SESSIONS.pop(search_id, None)


def is_cancelled(search_id: Optional[str]) -> bool:
    if not search_id:
        return False
    session = _SESSIONS.get(search_id)
    return bool(session and session.cancelled.is_set())


def raise_if_cancelled(search_id: Optional[str]) -> None:
    if is_cancelled(search_id):
        raise SearchCancelled(search_id=search_id or "")


def register_run(search_id: Optional[str], run_id: Optional[str]) -> None:
    """Asocia un run Apify a la sesión (sin alterar el refcount)."""
    if not search_id or not run_id:
        return
    session = _SESSIONS.get(search_id)
    if not session:
        with _SESSIONS_LOCK:
            session = _SESSIONS.get(search_id)
            if not session:
                session = _SearchSession()
                session.refs = 1
                _SESSIONS[search_id] = session
    with session.lock:
        session.run_ids.add(str(run_id))


def cancel_search(search_id: str) -> Dict:
    """Marca la búsqueda como cancelada y aborta todos los runs Apify asociados."""
    if not search_id:
        return {"ok": False, "aborted_runs": [], "detail": "search_id vacío"}

    with _SESSIONS_LOCK:
        session = _SESSIONS.get(search_id)
        if not session:
            session = _SearchSession()
            _SESSIONS[search_id] = session

    session.cancelled.set()

    with session.lock:
        run_ids = list(session.run_ids)

    aborted = []
    token = os.getenv("APIFY_TOKEN")
    if token and run_ids:
        try:
            from apify_client import ApifyClient

            client = ApifyClient(token)
            for run_id in run_ids:
                try:
                    client.run(run_id).abort()
                    aborted.append(run_id)
                    logger.info("Apify run abortado: %s (search_id=%s)", run_id, search_id)
                except Exception as exc:
                    logger.warning(
                        "No se pudo abortar run %s (search_id=%s): %s",
                        run_id,
                        search_id,
                        exc,
                    )
        except Exception as exc:
            logger.error("Error abortando runs Apify: %s", exc, exc_info=True)

    return {
        "ok": True,
        "search_id": search_id,
        "aborted_runs": aborted,
        "detail": "Búsqueda detenida",
    }


def run_actor_cancellable(
    client,
    actor_id: str,
    run_input: dict,
    *,
    search_id: Optional[str] = None,
    poll_secs: int = 8,
):
    """
    Inicia un actor Apify y espera el resultado, abortando si search_id fue cancelado.
    Reemplaza client.actor(...).call(...) para soportar Stop.
    """
    raise_if_cancelled(search_id)

    logger.info("Iniciando actor Apify %s (search_id=%s)", actor_id, search_id)
    run = client.actor(actor_id).start(run_input=run_input)
    if not run:
        return None

    run_id = run.get("id")
    register_run(search_id, run_id)
    raise_if_cancelled(search_id)

    while True:
        raise_if_cancelled(search_id)
        finished = client.run(run_id).wait_for_finish(wait_secs=poll_secs)
        if not finished:
            continue

        status = (finished.get("status") or "").upper()
        if status in TERMINAL_STATUSES:
            if status in {"ABORTED", "ABORTING"} or is_cancelled(search_id):
                raise SearchCancelled(search_id=search_id or "")
            return finished
