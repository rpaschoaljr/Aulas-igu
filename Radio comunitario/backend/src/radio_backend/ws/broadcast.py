"""Dispara eventos do backend para os clientes WebSocket conectados."""

from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.ws.manager import manager
from radio_backend.ws.payloads import build_queue_payload, build_state_payload


async def broadcast_state(session: AsyncSession) -> None:
    payload = await build_state_payload(session)
    await manager.broadcast({"type": "state", **payload})


async def broadcast_queue(session: AsyncSession) -> None:
    queue = await build_queue_payload(session)
    await manager.broadcast({"type": "queue_updated", "queue": queue})


async def broadcast_skip(song_id: str) -> None:
    await manager.broadcast({"type": "skip_triggered", "song_id": song_id})
