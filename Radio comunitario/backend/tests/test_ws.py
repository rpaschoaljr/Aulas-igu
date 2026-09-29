import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi import WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.models.playback_state import PlaybackState
from radio_backend.models.queue_item import QueueItem
from radio_backend.models.song import Song
from radio_backend.models.user import User
from radio_backend.models.vote import Vote
from radio_backend.security.jwt import create_access_token
from radio_backend.services import playback
from radio_backend.ws.broadcast import broadcast_queue, broadcast_state
from radio_backend.ws.manager import manager
from radio_backend.ws.router import websocket_endpoint


class FakeWebSocket:
    """Simula o WebSocket do FastAPI para testar o endpoint sem servidor."""

    def __init__(self, token: str | None = None, incoming: list[object] | None = None):
        self.query_params = {"token": token} if token is not None else {}
        self.sent: list[dict] = []
        self.closed = False
        self._incoming = list(incoming or [])

    async def accept(self) -> None:
        pass

    async def send_json(self, data: dict) -> None:
        self.sent.append(data)

    async def receive_json(self) -> object:
        if self._incoming:
            return self._incoming.pop(0)
        raise WebSocketDisconnect(code=1000)

    async def close(self, code: int = 1000) -> None:
        self.closed = True


@pytest.fixture(autouse=True)
def _cleanup() -> None:
    manager.clear()
    playback.clear_presence()
    playback.clear_load_offsets()
    playback.clear_confirmed_starts()
    yield
    manager.clear()


async def _song(
    session: AsyncSession, youtube_id: str = "abc123", duration: int = 100
) -> Song:
    song = Song(youtube_id=youtube_id, title="T", duration=duration, thumbnail="")
    session.add(song)
    await session.flush()
    return song


async def _user(session: AsyncSession, nickname: str = "ouvinte") -> User:
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


async def _token(session: AsyncSession) -> str:
    user = await _user(session)
    await session.commit()
    return create_access_token(str(user.id), user.token_version)


async def test_ws_rejects_missing_token(db_session: AsyncSession) -> None:
    # Sem token na query e sem token no primeiro frame.
    ws = FakeWebSocket(incoming=[{"type": "ping"}])

    await websocket_endpoint(ws, session=db_session)

    assert ws.sent == [{"type": "error", "detail": "não autenticado"}]
    assert ws.closed is True


async def test_ws_accepts_token_in_first_frame(db_session: AsyncSession) -> None:
    token = await _token(db_session)
    ws = FakeWebSocket(incoming=[{"token": token}])

    await websocket_endpoint(ws, session=db_session)

    assert ws.sent[0]["type"] == "state"
    assert ws.sent[1]["type"] == "queue_updated"


async def test_ws_rejects_invalid_token(db_session: AsyncSession) -> None:
    ws = FakeWebSocket(token="token-invalido")  # noqa: S106

    await websocket_endpoint(ws, session=db_session)

    assert ws.sent == [{"type": "error", "detail": "token inválido"}]
    assert ws.closed is True


async def test_ws_connect_sends_state_and_queue(db_session: AsyncSession) -> None:
    token = await _token(db_session)
    ws = FakeWebSocket(token=token)

    await websocket_endpoint(ws, session=db_session)

    assert ws.sent[0]["type"] == "state"
    assert ws.sent[0]["song_id"] is None
    assert ws.sent[0]["started_at"] is None
    assert ws.sent[1] == {"type": "queue_updated", "queue": []}


async def test_ws_ping_keeps_listener_present(db_session: AsyncSession) -> None:
    token = await _token(db_session)
    ws = FakeWebSocket(token=token, incoming=[{"type": "ping"}])

    await websocket_endpoint(ws, session=db_session)

    # Depois do ping, o ouvinte deve estar presente (nenhum erro foi enviado).
    assert all(msg["type"] != "error" for msg in ws.sent)


async def test_ws_vote_records_vote(db_session: AsyncSession) -> None:
    song = await _song(db_session)
    user = await _user(db_session)
    item = QueueItem(song_id=song.id, position=1)
    db_session.add(item)
    await db_session.commit()

    token = create_access_token(str(user.id), user.token_version)
    ws = FakeWebSocket(
        token=token, incoming=[{"type": "vote", "queue_item_id": str(item.id)}]
    )

    await websocket_endpoint(ws, session=db_session)

    votes = (await db_session.execute(select(Vote))).scalars().all()
    assert len(votes) == 1
    assert votes[0].queue_item_id == item.id
    assert votes[0].user_id == user.id


async def test_ws_invalid_message_sends_error(db_session: AsyncSession) -> None:
    token = await _token(db_session)
    ws = FakeWebSocket(token=token, incoming=[{"type": "desconhecido"}])

    await websocket_endpoint(ws, session=db_session)

    assert {"type": "error", "detail": "evento desconhecido"} in ws.sent


async def test_ws_playback_report_updates_duration(db_session: AsyncSession) -> None:
    song = await _song(db_session, "abc123", duration=155)
    user = await _user(db_session)
    await db_session.commit()

    token = create_access_token(str(user.id), user.token_version)
    ws = FakeWebSocket(
        token=token,
        incoming=[
            {
                "type": "playback_report",
                "song_id": str(song.id),
                "duration": 187,
                "load_offset": 2.5,
            }
        ],
    )

    await websocket_endpoint(ws, session=db_session)

    assert song.duration == 187
    assert playback._user_load_offset.get(user.id) == 2.5
    assert all(msg["type"] != "error" for msg in ws.sent)


async def test_ws_playback_report_invalid_song_id(db_session: AsyncSession) -> None:
    token = await _token(db_session)
    ws = FakeWebSocket(
        token=token,
        incoming=[
            {
                "type": "playback_report",
                "song_id": "nao-e-uuid",
                "duration": 187,
                "load_offset": 0,
            }
        ],
    )

    await websocket_endpoint(ws, session=db_session)

    assert {"type": "error", "detail": "song_id inválido"} in ws.sent


async def test_ws_playback_report_unknown_song(db_session: AsyncSession) -> None:
    token = await _token(db_session)
    ws = FakeWebSocket(
        token=token,
        incoming=[
            {
                "type": "playback_report",
                "song_id": str(uuid.uuid4()),
                "duration": 187,
                "load_offset": 0,
            }
        ],
    )

    await websocket_endpoint(ws, session=db_session)

    assert {"type": "error", "detail": "música não encontrada"} in ws.sent


async def test_ws_playback_report_invalid_duration(db_session: AsyncSession) -> None:
    song = await _song(db_session, "abc123", duration=155)
    user = await _user(db_session)
    await db_session.commit()

    token = create_access_token(str(user.id), user.token_version)
    ws = FakeWebSocket(
        token=token,
        incoming=[
            {
                "type": "playback_report",
                "song_id": str(song.id),
                "duration": 0,
                "load_offset": 0,
            }
        ],
    )

    await websocket_endpoint(ws, session=db_session)

    assert song.duration == 155  # não alterado
    assert {"type": "error", "detail": "duration inválido"} in ws.sent


async def test_ws_playback_report_invalid_offset(db_session: AsyncSession) -> None:
    song = await _song(db_session, "abc123", duration=155)
    user = await _user(db_session)
    await db_session.commit()

    token = create_access_token(str(user.id), user.token_version)
    ws = FakeWebSocket(
        token=token,
        incoming=[
            {
                "type": "playback_report",
                "song_id": str(song.id),
                "duration": 187,
                "load_offset": -1,
            }
        ],
    )

    await websocket_endpoint(ws, session=db_session)

    assert song.duration == 155  # não alterado
    assert {"type": "error", "detail": "load_offset inválido"} in ws.sent


async def test_ws_playback_report_rejects_huge_duration(
    db_session: AsyncSession,
) -> None:
    song = await _song(db_session, "abc123", duration=155)
    user = await _user(db_session)
    await db_session.commit()

    token = create_access_token(str(user.id), user.token_version)
    ws = FakeWebSocket(
        token=token,
        incoming=[
            {
                "type": "playback_report",
                "song_id": str(song.id),
                "duration": 99_999_999,
                "load_offset": 0,
            }
        ],
    )

    await websocket_endpoint(ws, session=db_session)

    assert song.duration == 155  # não alterado
    assert {"type": "error", "detail": "duration inválido"} in ws.sent


async def test_ws_playback_ended_advances(db_session: AsyncSession) -> None:
    song1 = await _song(db_session, "a", duration=100)
    song2 = await _song(db_session, "b", duration=100)
    user = await _user(db_session)
    db_session.add_all(
        [
            QueueItem(song_id=song1.id, position=1),
            QueueItem(song_id=song2.id, position=2),
        ]
    )
    await db_session.flush()
    db_session.add(
        PlaybackState(id=1, current_song_id=song1.id, started_at=datetime.now(UTC))
    )
    await db_session.commit()

    token = create_access_token(str(user.id), user.token_version)
    ws = FakeWebSocket(
        token=token,
        incoming=[{"type": "playback_ended", "song_id": str(song1.id)}],
    )

    await websocket_endpoint(ws, session=db_session)

    state = await db_session.get(PlaybackState, 1)
    assert state.current_song_id == song2.id


async def test_ws_playback_ended_invalid_song_id(db_session: AsyncSession) -> None:
    token = await _token(db_session)
    ws = FakeWebSocket(
        token=token,
        incoming=[{"type": "playback_ended", "song_id": "nao-e-uuid"}],
    )

    await websocket_endpoint(ws, session=db_session)

    assert {"type": "error", "detail": "song_id inválido"} in ws.sent


async def test_broadcast_state_and_queue(db_session: AsyncSession) -> None:
    ws = FakeWebSocket()
    manager.add(ws)

    await broadcast_state(db_session)
    await broadcast_queue(db_session)

    assert ws.sent == [
        {"type": "state", "song_id": None, "started_at": None, "duration": 0},
        {"type": "queue_updated", "queue": []},
    ]


async def test_tick_broadcasts_state_and_queue_on_advance(
    db_session: AsyncSession,
) -> None:
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
            started_at=datetime.now(UTC) - timedelta(seconds=60),
        )
    )
    await db_session.commit()

    ws = FakeWebSocket()
    manager.add(ws)

    await playback.tick(db_session)

    types = [msg["type"] for msg in ws.sent]
    assert "state" in types
    assert "queue_updated" in types
    assert ws.sent[types.index("state")]["song_id"] == str(song2.id)


def test_ws_endpoint_rejects_invalid_token_over_asgi(monkeypatch) -> None:
    """Confirma o roteamento /ws e a injeção de dependência no caminho real ASGI."""
    from fastapi.testclient import TestClient

    from radio_backend.db import get_session
    from radio_backend.main import app
    from radio_backend.services import playback as playback_module

    async def override_get_session() -> None:
        yield None  # não usado no caminho de token inválido

    async def noop_engine() -> None:
        pass

    app.dependency_overrides[get_session] = override_get_session
    monkeypatch.setattr(playback_module, "run_engine", noop_engine)
    manager.clear()

    try:
        with TestClient(app) as client:
            with client.websocket_connect("/ws?token=token-invalido") as ws:
                assert ws.receive_json() == {
                    "type": "error",
                    "detail": "token inválido",
                }
    finally:
        app.dependency_overrides.clear()
        manager.clear()
