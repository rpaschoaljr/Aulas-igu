from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.models.history import History
from radio_backend.models.song import Song


async def test_state_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/state")
    assert resp.status_code == 401


async def test_state_empty(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    resp = await client.get("/api/state", headers=auth_headers)

    assert resp.status_code == 200
    body = resp.json()
    assert body["current_song_id"] is None
    assert body["started_at"] is None
    assert body["duration"] == 0


async def test_history_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/history")
    assert resp.status_code == 401


async def test_history_empty(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    resp = await client.get("/api/history", headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json() == []


async def test_history_returns_entries(
    client: AsyncClient, auth_headers: dict[str, str], raw_session: AsyncSession
) -> None:
    song = Song(youtube_id="abc123", title="Antiga", duration=120, thumbnail="")
    raw_session.add(song)
    await raw_session.flush()
    raw_session.add(History(song_id=song.id))
    await raw_session.commit()

    resp = await client.get("/api/history", headers=auth_headers)

    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["song"]["youtube_id"] == "abc123"
    assert entries[0]["played_at"] is not None
