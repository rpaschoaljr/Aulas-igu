"""Monta os payloads de estado e fila enviados pelo WebSocket."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.models.playback_state import PlaybackState
from radio_backend.models.queue_item import QueueItem
from radio_backend.models.song import Song
from radio_backend.schemas.radio import QueueItemOut, SongResult


def to_item_out(item: QueueItem, song: Song) -> QueueItemOut:
    """Serializa um item da fila (reutilizado pela REST e pelo WebSocket)."""
    return QueueItemOut(
        id=str(item.id),
        position=item.position,
        added_by=str(item.added_by) if item.added_by else None,
        song=SongResult(
            youtube_id=song.youtube_id,
            title=song.title,
            duration=song.duration,
            thumbnail=song.thumbnail,
        ),
    )


async def build_state_payload(session: AsyncSession) -> dict[str, object]:
    """Estado atual de reprodução: `song_id`, `started_at` e `duration`."""
    state = await session.get(PlaybackState, 1)
    if state is None or state.current_song_id is None:
        return {"song_id": None, "started_at": None, "duration": 0}

    song = await session.get(Song, state.current_song_id)
    duration = song.duration if song is not None else 0
    return {
        "song_id": str(state.current_song_id),
        "started_at": state.started_at.isoformat() if state.started_at else None,
        "duration": duration,
    }


async def build_queue_payload(session: AsyncSession) -> list[dict[str, object]]:
    """Fila atual, ordenada por posição, no mesmo formato da REST `GET /queue`."""
    result = await session.execute(
        select(QueueItem, Song)
        .join(Song, Song.id == QueueItem.song_id)
        .order_by(QueueItem.position)
    )
    return [
        to_item_out(item, song).model_dump(mode="json")
        for item, song in result.all()
    ]
