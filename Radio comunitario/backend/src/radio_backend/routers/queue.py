import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.db import get_session
from radio_backend.models.history import History
from radio_backend.models.queue_item import QueueItem
from radio_backend.models.song import Song
from radio_backend.models.user import User
from radio_backend.models.vote import Vote
from radio_backend.schemas.radio import (
    QueueAddRequest,
    QueueAddResponse,
    QueueItemOut,
    VoteResponse,
)
from radio_backend.security.deps import get_current_user
from radio_backend.services import playback
from radio_backend.services.playback import QUEUE_LOCK_KEY
from radio_backend.ws.broadcast import broadcast_queue
from radio_backend.ws.payloads import to_item_out

router = APIRouter(prefix="/queue", tags=["queue"])

QUEUE_LIMIT = 3
REPETITION_WINDOW = 3


@router.get("", response_model=list[QueueItemOut])
async def list_queue(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[QueueItemOut]:
    playback.mark_present(user.id)
    result = await session.execute(
        select(QueueItem, Song)
        .join(Song, Song.id == QueueItem.song_id)
        .order_by(QueueItem.position)
    )
    return [to_item_out(item, song) for item, song in result.all()]


@router.post("", response_model=QueueAddResponse, status_code=201)
async def add_to_queue(
    data: QueueAddRequest,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> QueueAddResponse:
    # Serializa as mutações da fila para evitar corrida na atribuição de posição.
    await session.execute(
        text("SELECT pg_advisory_xact_lock(:key)"), {"key": QUEUE_LOCK_KEY}
    )

    count = await session.execute(
        select(func.count()).select_from(QueueItem).where(QueueItem.added_by == user.id)
    )
    if (count.scalar() or 0) >= QUEUE_LIMIT:
        raise HTTPException(status_code=400, detail="limite de 3 músicas por pessoa")

    song = (
        await session.execute(select(Song).where(Song.youtube_id == data.youtube_id))
    ).scalar_one_or_none()
    if song is None:
        raise HTTPException(status_code=404, detail="música não encontrada")

    recent = await session.execute(
        select(Song.youtube_id)
        .join(History, History.song_id == Song.id)
        .order_by(History.played_at.desc())
        .limit(REPETITION_WINDOW)
    )
    if song.youtube_id in set(recent.scalars()):
        raise HTTPException(status_code=400, detail="música repetida recentemente")

    max_position = await session.execute(select(func.max(QueueItem.position)))
    position = (max_position.scalar() or 0) + 1

    item = QueueItem(song_id=song.id, added_by=user.id, position=position)
    session.add(item)
    await session.flush()
    await session.commit()

    await broadcast_queue(session)

    return QueueAddResponse(id=str(item.id), position=position)


@router.post("/{queue_item_id}/vote", response_model=VoteResponse)
async def vote(
    queue_item_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> VoteResponse:
    item = await session.get(QueueItem, queue_item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="item da fila não encontrado")

    stmt = pg_insert(Vote).values(
        user_id=user.id, queue_item_id=queue_item_id
    ).on_conflict_do_nothing()
    await session.execute(stmt)
    await session.commit()

    return VoteResponse(status="ok")
