from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.db import get_session
from radio_backend.models.history import History
from radio_backend.models.song import Song
from radio_backend.models.user import User
from radio_backend.schemas.radio import HistoryEntryOut, SongResult
from radio_backend.security.deps import get_current_user

router = APIRouter(tags=["history"])


@router.get("/history", response_model=list[HistoryEntryOut])
async def get_history(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[HistoryEntryOut]:
    result = await session.execute(
        select(History, Song)
        .join(Song, Song.id == History.song_id)
        .order_by(History.played_at.desc())
    )
    return [
        HistoryEntryOut(
            id=str(h.id),
            played_at=h.played_at.isoformat(),
            added_by=str(h.added_by) if h.added_by else None,
            song=SongResult(
                youtube_id=song.youtube_id,
                title=song.title,
                duration=song.duration,
                thumbnail=song.thumbnail,
            ),
        )
        for h, song in result.all()
    ]
