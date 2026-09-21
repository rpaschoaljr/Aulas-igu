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
def _clear_presence() -> None:
    playback.clear_presence()
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


async def test_tick_advances_when_song_ends(db_session: AsyncSession) -> None:
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
            started_at=datetime.now(UTC) - timedelta(seconds=10),
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
            started_at=datetime.now(UTC) - timedelta(seconds=10),
        )
    )
    db_session.add(Vote(user_id=user.id, queue_item_id=item1.id))
    await db_session.commit()

    await playback.tick(db_session)

    votes = (await db_session.execute(select(Vote))).scalars().all()
    assert votes == []
