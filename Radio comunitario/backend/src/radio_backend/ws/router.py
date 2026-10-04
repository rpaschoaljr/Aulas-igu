"""Endpoint WebSocket `/ws`: estado em tempo real e comandos do cliente."""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.db import get_session
from radio_backend.models.queue_item import QueueItem
from radio_backend.models.song import Song
from radio_backend.models.user import User
from radio_backend.models.vote import Vote
from radio_backend.security.jwt import decode_token
from radio_backend.services import playback
from radio_backend.ws.manager import manager
from radio_backend.ws.payloads import build_queue_payload, build_state_payload

router = APIRouter()


# Teto para a duração reportada (24h): evita que um valor inválido congele o
# relógio do backend (a música nunca "acabaria").
MAX_REPORTED_DURATION = 24 * 60 * 60


async def _authenticate(session: AsyncSession, token: str) -> User | None:
    """Valida o JWT e devolve o usuário, ou `None` se inválido/revogado."""
    try:
        payload = decode_token(token)
    except Exception:
        return None

    user_id = payload.get("sub")
    version = payload.get("version")
    if not isinstance(user_id, str) or not isinstance(version, int):
        return None

    try:
        uid = uuid.UUID(user_id)
    except (ValueError, AttributeError):
        return None

    user = await session.get(User, uid)
    if user is None or user.token_version != version:
        return None
    return user


async def _send_error(websocket: WebSocket, detail: str) -> None:
    await websocket.send_json({"type": "error", "detail": detail})


async def _handle_message(
    websocket: WebSocket, user: User, session: AsyncSession, message: Any
) -> None:
    if not isinstance(message, dict) or not isinstance(message.get("type"), str):
        await _send_error(websocket, "mensagem inválida")
        return

    msg_type = message["type"]

    if msg_type == "ping":
        # Heartbeat: mantém o ouvinte "presente" (relevante para o skip >50%).
        playback.mark_present(user.id)
        return

    if msg_type == "vote":
        raw_id = message.get("queue_item_id")
        if not isinstance(raw_id, str):
            await _send_error(websocket, "queue_item_id obrigatório")
            return
        try:
            queue_item_id = uuid.UUID(raw_id)
        except ValueError:
            await _send_error(websocket, "queue_item_id inválido")
            return

        item = await session.get(QueueItem, queue_item_id)
        if item is None:
            await _send_error(websocket, "item da fila não encontrado")
            return

        await session.execute(
            pg_insert(Vote)
            .values(user_id=user.id, queue_item_id=queue_item_id)
            .on_conflict_do_nothing()
        )
        await session.commit()
        return

    if msg_type == "playback_report":
        raw_song_id = message.get("song_id")
        if not isinstance(raw_song_id, str):
            await _send_error(websocket, "song_id obrigatório")
            return
        try:
            song_id = uuid.UUID(raw_song_id)
        except ValueError:
            await _send_error(websocket, "song_id inválido")
            return

        duration = message.get("duration")
        if (
            isinstance(duration, bool)
            or not isinstance(duration, (int, float))
            or duration <= 0
            or duration > MAX_REPORTED_DURATION
        ):
            await _send_error(websocket, "duration inválido")
            return

        load_offset = message.get("load_offset")
        if (
            isinstance(load_offset, bool)
            or not isinstance(load_offset, (int, float))
            or load_offset < 0
        ):
            await _send_error(websocket, "load_offset inválido")
            return

        song = await session.get(Song, song_id)
        if song is None:
            await _send_error(websocket, "música não encontrada")
            return

        print(
            f"[BACK][WS] playback_report song_id={song_id} "
            f"duration={duration} load_offset={load_offset}"
        )

        # Duração real reportada pelo player (IFrame) corrige o relógio do
        # backend, que deixa de depender só do metadado do YouTube.
        song.duration = int(duration)
        playback.set_load_offset(user.id, float(load_offset))
        await session.commit()
        # PLAYING = a música começou de verdade: crava o `started_at` real.
        await playback.confirm_started(session, song_id)
        return

    if msg_type == "playback_ended":
        raw_song_id = message.get("song_id")
        if not isinstance(raw_song_id, str):
            await _send_error(websocket, "song_id obrigatório")
            return
        try:
            song_id = uuid.UUID(raw_song_id)
        except ValueError:
            await _send_error(websocket, "song_id inválido")
            return

        print(f"[BACK][WS] playback_ended song_id={song_id}")

        # ENDED = a música acabou de verdade: avança para a próxima.
        await playback.confirm_ended(session, song_id)
        return

    if msg_type in ("mute_until_next", "mute_until_song"):
        await _send_error(websocket, "mudo programado ainda não suportado")
        return

    await _send_error(websocket, "evento desconhecido")


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    token = websocket.query_params.get("token")

    await websocket.accept()

    if token is None:
        # Alternativa prevista no contrato: token no primeiro frame.
        try:
            frame = await websocket.receive_json()
        except WebSocketDisconnect:
            await websocket.close()
            return
        token = frame.get("token") if isinstance(frame, dict) else None

    if not isinstance(token, str) or not token:
        await _send_error(websocket, "não autenticado")
        await websocket.close()
        return

    user = await _authenticate(session, token)
    if user is None:
        await _send_error(websocket, "token inválido")
        await websocket.close()
        return

    manager.add(websocket)
    playback.mark_present(user.id)

    await websocket.send_json(
        {"type": "state", **await build_state_payload(session)}
    )
    await websocket.send_json(
        {"type": "queue_updated", "queue": await build_queue_payload(session)}
    )

    try:
        while True:
            try:
                message = await websocket.receive_json()
            except WebSocketDisconnect:
                break
            except ValueError:
                await _send_error(websocket, "mensagem inválida")
                continue
            await _handle_message(websocket, user, session, message)
    finally:
        manager.remove(websocket)
