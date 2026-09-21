from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.db import get_session

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/db")
async def health_db(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, str]:
    await session.execute(text("SELECT 1"))
    return {"status": "ok"}
