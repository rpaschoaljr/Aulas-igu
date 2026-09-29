import random
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.models.history import History
from radio_backend.models.playback_state import PlaybackState
from radio_backend.models.queue_item import QueueItem
from radio_backend.models.song import Song
from radio_backend.models.user import User
from radio_backend.models.vote import Vote
from radio_backend.services import playback


@pytest.fixture(autouse=True)
def _clear_state() -> None:
    playback.clear_presence()
    playback.clear_load_offsets()
    playback.clear_dj_deck()
    playback.clear_confirmed_starts()
    yield


async def _song(
    session: AsyncSession, youtube_id: str = "abc123", duration: int = 100
) -> Song:
    song = Song(youtube_id=youtube_id, title="T", duration=duration, thumbnail="")
    session.add(song)
    await session.flush()
    return song


async def _user(session: AsyncSession, nickname: str = "ouvinte1") -> User:
    user = User(
        nickname=nickname,
        nickname_normalized=nickname.lower(),
        email=f"{nickname}@example.com",
        email_normalized=f"{nickname}@example.com",
        password_hash="dummy-hash",  # noqa: S106
    )
    session.add(user)
    await session.flush()
    return user


async def test_tick_starts_first_queue_item(db_session: AsyncSession) -> None:
    song = await _song(db_session)
    db_session.add(QueueItem(song_id=song.id, position=1))
    await db_session.commit()

    await playback.tick(db_session)

    state = await db_session.get(PlaybackState, 1)
    assert state is not None
    assert state.current_song_id == song.id
    assert state.started_at is not None


async def test_tick_advances_on_safety_timeout(db_session: AsyncSession) -> None:
    song1 = await _song(db_session, "a", duration=1)
    song2 = await _song(db_session, "b", duration=100)
    db_session.add_all(
        [
            QueueItem(song_id=song1.id, position=1),
            QueueItem(song_id=song2.id, position=2),
        ]
    )
    await db_session.flush()
    db_session.add(
        PlaybackState(
            id=1,
            current_song_id=song1.id,
            # Passou MUITO da duração (1s) + folga: o ENDED não chegou.
            started_at=datetime.now(UTC) - timedelta(seconds=60),
        )
    )
    await db_session.commit()

    await playback.tick(db_session)

    state = await db_session.get(PlaybackState, 1)
    assert state.current_song_id == song2.id

    history = (await db_session.execute(select(History))).scalars().all()
    assert len(history) == 1
    assert history[0].song_id == song1.id


async def test_tick_skip_when_votes_exceed_half(db_session: AsyncSession) -> None:
    song1 = await _song(db_session, "a", duration=100)
    song2 = await _song(db_session, "b", duration=100)
    user = await _user(db_session)
    item1 = QueueItem(song_id=song1.id, position=1)
    db_session.add_all(
        [item1, QueueItem(song_id=song2.id, position=2)]
    )
    await db_session.flush()
    db_session.add(
        PlaybackState(id=1, current_song_id=song1.id, started_at=datetime.now(UTC))
    )
    db_session.add(Vote(user_id=user.id, queue_item_id=item1.id))
    await db_session.commit()

    playback.mark_present(user.id)
    await playback.tick(db_session)

    state = await db_session.get(PlaybackState, 1)
    assert state.current_song_id == song2.id


async def test_tick_no_skip_below_half(db_session: AsyncSession) -> None:
    song1 = await _song(db_session, "a", duration=100)
    song2 = await _song(db_session, "b", duration=100)
    user1 = await _user(db_session, "ouvinte1")
    user2 = await _user(db_session, "ouvinte2")
    item1 = QueueItem(song_id=song1.id, position=1)
    db_session.add_all(
        [item1, QueueItem(song_id=song2.id, position=2)]
    )
    await db_session.flush()
    db_session.add(
        PlaybackState(id=1, current_song_id=song1.id, started_at=datetime.now(UTC))
    )
    db_session.add(Vote(user_id=user1.id, queue_item_id=item1.id))
    await db_session.commit()

    # 2 ouvintes presentes, 1 voto = 50% → não pula.
    playback.mark_present(user1.id)
    playback.mark_present(user2.id)
    await playback.tick(db_session)

    state = await db_session.get(PlaybackState, 1)
    assert state.current_song_id == song1.id


async def test_tick_clears_votes_on_advance(db_session: AsyncSession) -> None:
    song1 = await _song(db_session, "a", duration=1)
    song2 = await _song(db_session, "b", duration=100)
    user = await _user(db_session)
    item1 = QueueItem(song_id=song1.id, position=1)
    db_session.add_all(
        [item1, QueueItem(song_id=song2.id, position=2)]
    )
    await db_session.flush()
    db_session.add(
        PlaybackState(
            id=1,
            current_song_id=song1.id,
            started_at=datetime.now(UTC) - timedelta(seconds=60),
        )
    )
    db_session.add(Vote(user_id=user.id, queue_item_id=item1.id))
    await db_session.commit()

    await playback.tick(db_session)

    votes = (await db_session.execute(select(Vote))).scalars().all()
    assert votes == []


async def test_dj_plays_history_song_when_queue_empty(
    db_session: AsyncSession,
) -> None:
    song = await _song(db_session)
    user = await _user(db_session)
    db_session.add(History(song_id=song.id, played_at=datetime.now(UTC)))
    await db_session.commit()

    playback.mark_present(user.id)
    await playback.tick(db_session)

    state = await db_session.get(PlaybackState, 1)
    assert state is not None
    assert state.current_song_id == song.id

    queue = (await db_session.execute(select(QueueItem))).scalars().all()
    assert len(queue) == 1
    assert queue[0].song_id == song.id
    assert queue[0].added_by is None  # item do DJ


async def test_dj_no_refill_without_listeners(db_session: AsyncSession) -> None:
    song = await _song(db_session)
    db_session.add(History(song_id=song.id, played_at=datetime.now(UTC)))
    await db_session.commit()

    # Sem ninguém presente, o DJ não assume (música continua parada).
    await playback.tick(db_session)

    state = await db_session.get(PlaybackState, 1)
    assert state is not None
    assert state.current_song_id is None
    queue = (await db_session.execute(select(QueueItem))).scalars().all()
    assert queue == []


async def test_dj_returns_to_queue_after_history_song(
    db_session: AsyncSession,
) -> None:
    song_a = await _song(db_session, "a", duration=1)
    song_b = await _song(db_session, "b", duration=100)
    user = await _user(db_session)
    db_session.add(History(song_id=song_a.id, played_at=datetime.now(UTC)))
    await db_session.commit()

    # DJ assume e toca A.
    playback.mark_present(user.id)
    await playback.tick(db_session)
    state = await db_session.get(PlaybackState, 1)
    assert state is not None and state.current_song_id == song_a.id

    # Enquanto A toca, um ouvinte adiciona B à fila.
    db_session.add(QueueItem(song_id=song_b.id, added_by=user.id, position=2))
    await db_session.commit()

    # A "acaba" de verdade: o front reporta o ENDED.
    await playback.confirm_ended(db_session, song_a.id)

    state = await db_session.get(PlaybackState, 1)
    assert state is not None
    assert state.current_song_id == song_b.id  # prioridade à fila, não outro DJ


async def test_dj_pick_cycles_without_repeat(db_session: AsyncSession) -> None:
    random.seed(0)
    songs = [await _song(db_session, f"id{i}") for i in range(3)]
    for s in songs:
        db_session.add(History(song_id=s.id, played_at=datetime.now(UTC)))
    await db_session.commit()

    picked = [await playback._dj_pick(db_session) for _ in range(3)]
    assert len(set(picked)) == 3  # percorre todas sem repetir

    # Novo ciclo: devolve uma das músicas de novo.
    next_cycle = await playback._dj_pick(db_session)
    assert next_cycle in {s.id for s in songs}


async def test_dj_no_history_does_nothing(db_session: AsyncSession) -> None:
    user = await _user(db_session)
    await db_session.commit()

    playback.mark_present(user.id)
    await playback.tick(db_session)

    # Sem histórico, não há o que o DJ tocar.
    state = await db_session.get(PlaybackState, 1)
    assert state is not None
    assert state.current_song_id is None
    queue = (await db_session.execute(select(QueueItem))).scalars().all()
    assert queue == []


async def test_confirm_ended_advances_to_next(db_session: AsyncSession) -> None:
    song1 = await _song(db_session, "a", duration=100)
    song2 = await _song(db_session, "b", duration=100)
    db_session.add_all(
        [
            QueueItem(song_id=song1.id, position=1),
            QueueItem(song_id=song2.id, position=2),
        ]
    )
    await db_session.flush()
    db_session.add(
        PlaybackState(id=1, current_song_id=song1.id, started_at=datetime.now(UTC))
    )
    await db_session.commit()

    advanced = await playback.confirm_ended(db_session, song1.id)

    assert advanced is True
    state = await db_session.get(PlaybackState, 1)
    assert state.current_song_id == song2.id


async def test_confirm_ended_ignores_wrong_song(db_session: AsyncSession) -> None:
    song1 = await _song(db_session, "a", duration=100)
    song2 = await _song(db_session, "b", duration=100)
    db_session.add_all(
        [
            QueueItem(song_id=song1.id, position=1),
            QueueItem(song_id=song2.id, position=2),
        ]
    )
    await db_session.flush()
    db_session.add(
        PlaybackState(id=1, current_song_id=song1.id, started_at=datetime.now(UTC))
    )
    await db_session.commit()

    advanced = await playback.confirm_ended(db_session, song2.id)

    assert advanced is False
    state = await db_session.get(PlaybackState, 1)
    assert state.current_song_id == song1.id


async def test_confirm_started_refines_started_at(db_session: AsyncSession) -> None:
    song1 = await _song(db_session, "a", duration=100)
    db_session.add(QueueItem(song_id=song1.id, position=1))
    await db_session.flush()
    old_start = datetime.now(UTC) - timedelta(seconds=5)
    db_session.add(
        PlaybackState(id=1, current_song_id=song1.id, started_at=old_start)
    )
    await db_session.commit()

    refined = await playback.confirm_started(db_session, song1.id)

    assert refined is True
    state = await db_session.get(PlaybackState, 1)
    assert state.started_at is not None
    assert state.started_at > old_start


async def test_confirm_started_only_once(db_session: AsyncSession) -> None:
    song1 = await _song(db_session, "a", duration=100)
    db_session.add(QueueItem(song_id=song1.id, position=1))
    await db_session.flush()
    db_session.add(
        PlaybackState(id=1, current_song_id=song1.id, started_at=datetime.now(UTC))
    )
    await db_session.commit()

    first = await playback.confirm_started(db_session, song1.id)
    state = await db_session.get(PlaybackState, 1)
    first_start = state.started_at

    second = await playback.confirm_started(db_session, song1.id)

    assert first is True
    assert second is False  # já confirmou esta música
    state = await db_session.get(PlaybackState, 1)
    assert state.started_at == first_start
