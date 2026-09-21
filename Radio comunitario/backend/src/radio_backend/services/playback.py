"""Motor de reprodução: estado, avanço da fila, skip e presença."""

import asyncio
import logging
import time
import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.db import async_session_factory
from radio_backend.models.history import History
from radio_backend.models.playback_state import PlaybackState
from radio_backend.models.queue_item import QueueItem
from radio_backend.models.song import Song
from radio_backend.models.vote import Vote

logger = logging.getLogger(__name__)

ENGINE_INTERVAL = 1.0
PRESENCE_TTL = 30.0
SKIP_PERCENTAGE = 0.5

_presence: dict[uuid.UUID, float] = {}


def mark_present(user_id: uuid.UUID) -> None:
    """Registra o ouvinte como presente (heartbeat dos endpoints de leitura)."""
    _presence[user_id] = time.monotonic()


def clear_presence() -> None:
    """Limpa a presença em memória (usado nos testes)."""
    _presence.clear()


def _listener_count() -> int:
    cutoff = time.monotonic() - PRESENCE_TTL
    return sum(1 for ts in _presence.values() if ts >= cutoff)


async def _get_state(session: AsyncSession) -> PlaybackState:
    state = await session.get(PlaybackState, 1)
    if state is None:
        state = PlaybackState(id=1)
        session.add(state)
        await session.flush()
    return state


async def _start_next(session: AsyncSession, state: PlaybackState) -> None:
    first = (
        await session.execute(
            select(QueueItem).order_by(QueueItem.position).limit(1)
        )
    ).scalar_one_or_none()
    if first is None:
        state.current_song_id = None
        state.started_at = None
    else:
        state.current_song_id = first.song_id
        state.started_at = datetime.now(UTC)


async def _advance(session: AsyncSession, state: PlaybackState) -> None:
    """Tira a música atual da fila, registra no histórico e passa para a próxima."""
    first = (
        await session.execute(
            select(QueueItem)
            .order_by(QueueItem.position)
            .limit(1)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if first is not None:
        session.add(
            History(
                song_id=first.song_id,
                played_at=datetime.now(UTC),
                added_by=first.added_by,
            )
        )
        await session.execute(delete(Vote).where(Vote.queue_item_id == first.id))
        await session.delete(first)
        await session.flush()
    await _start_next(session, state)


async def _maybe_skip(session: AsyncSession, state: PlaybackState) -> None:
    listeners = _listener_count()
    if listeners == 0:
        return
    first = (
        await session.execute(
            select(QueueItem).order_by(QueueItem.position).limit(1)
        )
    ).scalar_one_or_none()
    if first is None:
        return
    votes = (
        await session.execute(
            select(func.count())
            .select_from(Vote)
            .where(Vote.queue_item_id == first.id)
        )
    ).scalar() or 0
    if votes > SKIP_PERCENTAGE * listeners:
        await _advance(session, state)


async def tick(session: AsyncSession) -> None:
    """Uma iteração do motor: inicia a primeira da fila, avança ou aplica skip."""
    state = await _get_state(session)
    now = datetime.now(UTC)

    if state.current_song_id is None:
        await _start_next(session, state)
        await session.commit()
        return

    song = await session.get(Song, state.current_song_id)
    ended = (
        song is not None
        and state.started_at is not None
        and (now - state.started_at).total_seconds() >= song.duration
    )
    if ended:
        await _advance(session, state)
        await session.commit()
        return

    await _maybe_skip(session, state)
    await session.commit()


async def run_engine() -> None:
    """Loop em background que mantém a reprodução andando."""
    while True:
        try:
            async with async_session_factory() as session:
                await tick(session)
        except Exception:
            # Nunca deixa o motor morrer (falha não trava o sistema).
            logger.exception("erro no motor de reprodução")
        await asyncio.sleep(ENGINE_INTERVAL)
