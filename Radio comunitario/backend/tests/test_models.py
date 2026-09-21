import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.models import History, PlaybackState, QueueItem, Song, User, Vote


async def _create_user(session: AsyncSession, nickname: str = "ouvinte") -> User:
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


async def _create_song(session: AsyncSession, youtube_id: str = "abc123") -> Song:
    song = Song(
        youtube_id=youtube_id,
        title="Test Song",
        duration=180,
        thumbnail="https://img.example.com/abc.jpg",
    )
    session.add(song)
    await session.flush()
    return song


async def test_song_youtube_id_unique(db_session: AsyncSession) -> None:
    await _create_song(db_session, "abc123")
    await db_session.commit()

    duplicate = Song(
        youtube_id="abc123",
        title="Outra música",
        duration=200,
        thumbnail="https://img.example.com/dup.jpg",
    )
    db_session.add(duplicate)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


async def test_vote_unique_per_user_and_item(db_session: AsyncSession) -> None:
    user = await _create_user(db_session)
    song = await _create_song(db_session, "abc123")
    item = QueueItem(song_id=song.id, added_by=user.id, position=0)
    db_session.add(item)
    await db_session.flush()

    db_session.add(Vote(user_id=user.id, queue_item_id=item.id))
    await db_session.commit()

    db_session.add(Vote(user_id=user.id, queue_item_id=item.id))
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


async def test_queue_item_requires_song(db_session: AsyncSession) -> None:
    item = QueueItem(song_id=uuid.uuid4(), position=0)
    db_session.add(item)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


async def test_history_requires_song(db_session: AsyncSession) -> None:
    entry = History(song_id=uuid.uuid4())
    db_session.add(entry)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


async def test_playback_state_null_current_song(db_session: AsyncSession) -> None:
    db_session.add(PlaybackState(id=1))
    await db_session.commit()

    loaded = await db_session.get(PlaybackState, 1)
    assert loaded is not None
    assert loaded.current_song_id is None
    assert loaded.started_at is None


async def test_playback_state_references_song(db_session: AsyncSession) -> None:
    song = await _create_song(db_session, "abc123")
    started_at = datetime.now(UTC)
    db_session.add(PlaybackState(id=1, current_song_id=song.id, started_at=started_at))
    await db_session.commit()

    loaded = await db_session.get(PlaybackState, 1)
    assert loaded is not None
    assert loaded.current_song_id == song.id
    assert loaded.started_at == started_at
