from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.db import get_session
from radio_backend.models.song import Song
from radio_backend.models.user import User
from radio_backend.schemas.radio import SearchResponse, SongResult
from radio_backend.security.deps import get_current_user
from radio_backend.services import youtube

router = APIRouter(prefix="/songs", tags=["songs"])


async def _upsert_songs(
    session: AsyncSession, songs: list[SongResult]
) -> None:
    """Registra (upsert) as músicas retornadas, deduplicando por `youtube_id`."""
    youtube_ids = [s.youtube_id for s in songs]
    if not youtube_ids:
        return

    existing = await session.execute(
        select(Song.youtube_id).where(Song.youtube_id.in_(youtube_ids))
    )
    existing_ids = set(existing.scalars())

    for s in songs:
        if s.youtube_id not in existing_ids:
            session.add(
                Song(
                    youtube_id=s.youtube_id,
                    title=s.title[:255],
                    duration=s.duration,
                    thumbnail=s.thumbnail[:512],
                )
            )
    await session.commit()


@router.get("/search", response_model=SearchResponse)
async def search(
    q: Annotated[str, Query(min_length=1, max_length=100)],
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SearchResponse:
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="termo de busca obrigatório")

    try:
        results = await youtube.search_songs(query)
    except youtube.YouTubeError as exc:
        raise HTTPException(status_code=503, detail="busca indisponível") from exc

    songs = [SongResult(**r) for r in results]
    await _upsert_songs(session, songs)
    return SearchResponse(results=songs)
