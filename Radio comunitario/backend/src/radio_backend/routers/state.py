from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.db import get_session
from radio_backend.models.playback_state import PlaybackState
from radio_backend.models.song import Song
from radio_backend.models.user import User
from radio_backend.schemas.radio import PlaybackStateOut
from radio_backend.security.deps import get_current_user
from radio_backend.services import playback

router = APIRouter(tags=["state"])


@router.get("/state", response_model=PlaybackStateOut)
async def get_state(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlaybackStateOut:
    playback.mark_present(user.id)

    state = await session.get(PlaybackState, 1)
    if state is None or state.current_song_id is None:
        return PlaybackStateOut(current_song_id=None, started_at=None, duration=0)

    song = await session.get(Song, state.current_song_id)
    duration = song.duration if song is not None else 0
    return PlaybackStateOut(
        current_song_id=str(state.current_song_id),
        started_at=state.started_at.isoformat() if state.started_at else None,
        duration=duration,
    )
