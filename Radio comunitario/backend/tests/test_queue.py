import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.models.history import History
from radio_backend.models.song import Song

FAKE_SONG = {
    "youtube_id": "abc123",
    "title": "Música de teste",
    "duration": 120,
    "thumbnail": "http://img/a.jpg",
}

SQL_INJECTION_PAYLOADS = [
    "' OR '1'='1",
    "'; DROP TABLE songs; --",
    "' UNION SELECT * FROM songs --",
    '" OR "1"="1',
    "1' OR '1'='1",
]


async def _seed_song(
    client: AsyncClient, auth_headers: dict[str, str], mock_search
) -> None:
    """Busca (com fake) para registrar a música via upsert."""
    mock_search([FAKE_SONG])
    await client.get("/api/songs/search", params={"q": "x"}, headers=auth_headers)


async def test_add_to_queue(
    client: AsyncClient, auth_headers: dict[str, str], mock_search
) -> None:
    await _seed_song(client, auth_headers, mock_search)

    resp = await client.post(
        "/api/queue", json={"youtube_id": "abc123"}, headers=auth_headers
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["position"] == 1
    assert "id" in body


async def test_list_queue(
    client: AsyncClient, auth_headers: dict[str, str], mock_search
) -> None:
    await _seed_song(client, auth_headers, mock_search)
    await client.post(
        "/api/queue", json={"youtube_id": "abc123"}, headers=auth_headers
    )

    resp = await client.get("/api/queue", headers=auth_headers)

    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["position"] == 1
    assert items[0]["song"]["youtube_id"] == "abc123"
    assert items[0]["added_by"] is not None


async def test_vote(
    client: AsyncClient, auth_headers: dict[str, str], mock_search
) -> None:
    await _seed_song(client, auth_headers, mock_search)
    add = await client.post(
        "/api/queue", json={"youtube_id": "abc123"}, headers=auth_headers
    )
    item_id = add.json()["id"]

    resp = await client.post(f"/api/queue/{item_id}/vote", headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_add_requires_auth(client: AsyncClient) -> None:
    resp = await client.post("/api/queue", json={"youtube_id": "abc123"})
    assert resp.status_code == 401


async def test_add_song_not_found(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    resp = await client.post(
        "/api/queue", json={"youtube_id": "naoexiste"}, headers=auth_headers
    )
    assert resp.status_code == 404


async def test_add_invalid_youtube_id(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    resp = await client.post(
        "/api/queue", json={"youtube_id": "!!invalido!!"}, headers=auth_headers
    )
    assert resp.status_code == 400


async def test_add_limit_three(
    client: AsyncClient, auth_headers: dict[str, str], mock_search
) -> None:
    songs = [
        {"youtube_id": f"vid{i}", "title": f"M{i}", "duration": 100, "thumbnail": ""}
        for i in range(4)
    ]
    mock_search(songs)
    await client.get("/api/songs/search", params={"q": "x"}, headers=auth_headers)

    for i in range(3):
        resp = await client.post(
            "/api/queue", json={"youtube_id": f"vid{i}"}, headers=auth_headers
        )
        assert resp.status_code == 201

    resp = await client.post(
        "/api/queue", json={"youtube_id": "vid3"}, headers=auth_headers
    )
    assert resp.status_code == 400


async def test_add_repetition_rejected(
    client: AsyncClient,
    auth_headers: dict[str, str],
    mock_search,
    raw_session: AsyncSession,
) -> None:
    await _seed_song(client, auth_headers, mock_search)

    # Registra a música no histórico (como se já tivesse tocado recentemente).
    song = (
        await raw_session.execute(select(Song).where(Song.youtube_id == "abc123"))
    ).scalar_one()
    raw_session.add(History(song_id=song.id))
    await raw_session.commit()

    resp = await client.post(
        "/api/queue", json={"youtube_id": "abc123"}, headers=auth_headers
    )
    assert resp.status_code == 400


async def test_add_allowed_after_three_songs_in_history(
    client: AsyncClient,
    auth_headers: dict[str, str],
    mock_search,
    raw_session: AsyncSession,
) -> None:
    from datetime import UTC, datetime, timedelta

    songs = [
        {"youtube_id": f"vid{i}", "title": f"M{i}", "duration": 100, "thumbnail": ""}
        for i in range(4)
    ]
    mock_search(songs)
    await client.get("/api/songs/search", params={"q": "x"}, headers=auth_headers)

    db_songs = (await raw_session.execute(select(Song))).scalars().all()
    song_map = {s.youtube_id: s for s in db_songs}

    now = datetime.now(UTC)
    raw_session.add(
        History(song_id=song_map["vid0"].id, played_at=now - timedelta(minutes=40))
    )
    raw_session.add(
        History(song_id=song_map["vid1"].id, played_at=now - timedelta(minutes=30))
    )
    raw_session.add(
        History(song_id=song_map["vid2"].id, played_at=now - timedelta(minutes=20))
    )
    raw_session.add(
        History(song_id=song_map["vid3"].id, played_at=now - timedelta(minutes=10))
    )
    await raw_session.commit()

    # vid0 já teve 3 músicas tocadas depois (vid1, vid2, vid3): pode ser adicionada
    resp0 = await client.post(
        "/api/queue", json={"youtube_id": "vid0"}, headers=auth_headers
    )
    assert resp0.status_code == 201

    # vid1 ainda está entre as últimas 3: rejeitada
    resp1 = await client.post(
        "/api/queue", json={"youtube_id": "vid1"}, headers=auth_headers
    )
    assert resp1.status_code == 400


async def test_vote_nonexistent_item(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    import uuid

    resp = await client.post(
        f"/api/queue/{uuid.uuid4()}/vote", headers=auth_headers
    )
    assert resp.status_code == 404


async def test_vote_invalid_uuid(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    resp = await client.post("/api/queue/nao-e-uuid/vote", headers=auth_headers)
    assert resp.status_code == 400


async def test_vote_duplicate_idempotent(
    client: AsyncClient, auth_headers: dict[str, str], mock_search
) -> None:
    await _seed_song(client, auth_headers, mock_search)
    add = await client.post(
        "/api/queue", json={"youtube_id": "abc123"}, headers=auth_headers
    )
    item_id = add.json()["id"]

    first = await client.post(f"/api/queue/{item_id}/vote", headers=auth_headers)
    second = await client.post(f"/api/queue/{item_id}/vote", headers=auth_headers)

    assert first.status_code == 200
    assert second.status_code == 200


@pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
async def test_add_sql_injection(
    client: AsyncClient, auth_headers: dict[str, str], payload: str
) -> None:
    resp = await client.post(
        "/api/queue", json={"youtube_id": payload}, headers=auth_headers
    )
    assert resp.status_code in (400, 404)
