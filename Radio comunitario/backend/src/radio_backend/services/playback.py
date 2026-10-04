"""Motor de reprodução: estado, avanço da fila, skip, DJ automático e presença."""

import asyncio
import logging
import random
import time
import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.db import async_session_factory
from radio_backend.models.history import History
from radio_backend.models.playback_state import PlaybackState
from radio_backend.models.queue_item import QueueItem
from radio_backend.models.song import Song
from radio_backend.models.vote import Vote
from radio_backend.ws.broadcast import broadcast_queue, broadcast_skip, broadcast_state

logger = logging.getLogger(__name__)

ENGINE_INTERVAL = 1.0
PRESENCE_TTL = 30.0
SKIP_PERCENTAGE = 0.5
# Folga além da duração antes de avançar sem o evento ENDED (fallback de
# segurança: cobre o caso do front cair exatamente no fim da música).
SAFETY_MARGIN = 30.0

# Chave do advisory lock que serializa as mutações da fila (mesma usada no
# `POST /queue`), para o DJ não correr com um ouvinte adicionando ao mesmo tempo.
QUEUE_LOCK_KEY = 1

_presence: dict[uuid.UUID, float] = {}
_user_load_offset: dict[uuid.UUID, float] = {}
_dj_deck: list[uuid.UUID] = []
_dj_last_played: uuid.UUID | None = None
_confirmed_start_song_id: uuid.UUID | None = None


def mark_present(user_id: uuid.UUID) -> None:
    """Registra o ouvinte como presente (heartbeat dos endpoints de leitura)."""
    _presence[user_id] = time.monotonic()


def clear_presence() -> None:
    """Limpa a presença em memória (usado nos testes)."""
    _presence.clear()


def set_load_offset(user_id: uuid.UUID, offset: float) -> None:
    """Registra o atraso de carregamento reportado pelo front do ouvinte (s)."""
    _user_load_offset[user_id] = offset


def clear_load_offsets() -> None:
    """Limpa os offsets de carregamento em memória (usado nos testes)."""
    _user_load_offset.clear()


def clear_dj_deck() -> None:
    """Limpa o baralho do DJ em memória (usado nos testes)."""
    global _dj_last_played
    _dj_deck.clear()
    _dj_last_played = None


def clear_confirmed_starts() -> None:
    """Limpa a confirmação de início em memória (usado nos testes)."""
    global _confirmed_start_song_id
    _confirmed_start_song_id = None


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


async def _dj_pick(session: AsyncSession) -> uuid.UUID | None:
    """Sorteia a próxima música do DJ a partir do histórico (distintas), sem
    repetir até esgotar o ciclo. Devolve `None` se o histórico estiver vazio."""
    global _dj_last_played
    if not _dj_deck:
        ids = list(
            (await session.execute(select(History.song_id).distinct())).scalars()
        )
        if not ids:
            return None
        random.shuffle(ids)
        # Evita repetir a última tocada logo no início do novo ciclo.
        if len(ids) > 1 and ids[-1] == _dj_last_played:
            ids[-1], ids[0] = ids[0], ids[-1]
        _dj_deck.extend(ids)
    song_id = _dj_deck.pop()
    _dj_last_played = song_id
    return song_id


async def _start_next(session: AsyncSession, state: PlaybackState) -> bool:
    """Inicia a primeira da fila; se vazia e houver ouvintes, o DJ assume."""
    first = (
        await session.execute(
            select(QueueItem).order_by(QueueItem.position).limit(1)
        )
    ).scalar_one_or_none()

    if first is None and _listener_count() > 0:
        song_id = await _dj_pick(session)
        if song_id is not None:
            # Serializa a inserção com o `POST /queue` para não correr na posição.
            await session.execute(
                text("SELECT pg_advisory_xact_lock(:key)"),
                {"key": QUEUE_LOCK_KEY},
            )
            max_position = await session.execute(
                select(func.max(QueueItem.position))
            )
            position = (max_position.scalar() or 0) + 1
            session.add(
                QueueItem(song_id=song_id, added_by=None, position=position)
            )
            await session.flush()
            first = (
                await session.execute(
                    select(QueueItem).order_by(QueueItem.position).limit(1)
                )
            ).scalar_one_or_none()

    if first is None:
        state.current_song_id = None
        state.started_at = None
        return False
    state.current_song_id = first.song_id
    state.started_at = datetime.now(UTC)
    print(
        f"[BACK][PLAY] _start_next song={first.song_id} "
        f"started_at={state.started_at.isoformat()}"
    )
    return True


async def _advance(session: AsyncSession, state: PlaybackState) -> None:
    """Tira a música atual da fila, registra no histórico e passa para a próxima."""
    global _confirmed_start_song_id
    _confirmed_start_song_id = None
    first = (
        await session.execute(
            select(QueueItem)
            .order_by(QueueItem.position)
            .limit(1)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if first is not None:
        # Remove entrada anterior da mesma música para evitar acúmulo no histórico
        # e manter probabilidades equilibradas no DJ automático.
        await session.execute(delete(History).where(History.song_id == first.song_id))
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


async def confirm_started(session: AsyncSession, song_id: uuid.UUID) -> bool:
    """Refina o `started_at` para o início real reportado pelo front (PLAYING).

    Só a primeira confirmação por música vale (os demais ouvintes apenas
    sincronizam com o broadcast). Devolve se houve mudança."""
    global _confirmed_start_song_id
    if _confirmed_start_song_id == song_id:
        return False
    state = await _get_state(session)
    if state.current_song_id != song_id:
        return False
    _confirmed_start_song_id = song_id
    state.started_at = datetime.now(UTC)
    print(
        f"[BACK][PLAY] confirm_started song={song_id} "
        f"started_at={state.started_at.isoformat()}"
    )
    await session.commit()
    await broadcast_state(session)
    return True


async def confirm_ended(session: AsyncSession, song_id: uuid.UUID) -> bool:
    """Avança a música se `song_id` for a atual (fim real reportado pelo front).

    Devolve `True` se avançou."""
    # Serializa o avanço (evita avanço duplo com ENDED concorrentes).
    await session.execute(
        text("SELECT pg_advisory_xact_lock(:key)"), {"key": QUEUE_LOCK_KEY}
    )
    state = await _get_state(session)
    advanced = state.current_song_id == song_id
    print(f"[BACK][PLAY] confirm_ended song={song_id} advanced={advanced}")
    if advanced:
        await _advance(session, state)
    await session.commit()
    if advanced:
        await broadcast_state(session)
        await broadcast_queue(session)
    return advanced


async def _maybe_skip(session: AsyncSession, state: PlaybackState) -> uuid.UUID | None:
    """Aplica skip por votos; devolve o id da música pulada ou `None`."""
    listeners = _listener_count()
    if listeners == 0:
        return None
    first = (
        await session.execute(
            select(QueueItem).order_by(QueueItem.position).limit(1)
        )
    ).scalar_one_or_none()
    if first is None:
        return None
    votes = (
        await session.execute(
            select(func.count())
            .select_from(Vote)
            .where(Vote.queue_item_id == first.id)
        )
    ).scalar() or 0
    if votes > SKIP_PERCENTAGE * listeners:
        skipped_id = first.song_id
        await _advance(session, state)
        return skipped_id
    return None


async def tick(session: AsyncSession) -> None:
    """Uma iteração do motor: inicia a primeira da fila, avança ou aplica skip."""
    state = await _get_state(session)
    now = datetime.now(UTC)

    if state.current_song_id is None:
        started = await _start_next(session, state)
        await session.commit()
        if started:
            await broadcast_state(session)
            await broadcast_queue(session)
        return

    song = await session.get(Song, state.current_song_id)
    # Fallback de segurança: só avança se a música passou MUITO da duração
    # (o ENDED não chegou). O avanço normal acontece via `confirm_ended`.
    timed_out = (
        song is not None
        and state.started_at is not None
        and (now - state.started_at).total_seconds()
        >= song.duration + SAFETY_MARGIN
    )
    if timed_out:
        await _advance(session, state)
        await session.commit()
        await broadcast_state(session)
        await broadcast_queue(session)
        return

    skipped_id = await _maybe_skip(session, state)
    await session.commit()
    if skipped_id is not None:
        await broadcast_skip(str(skipped_id))
        await broadcast_state(session)
        await broadcast_queue(session)


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
