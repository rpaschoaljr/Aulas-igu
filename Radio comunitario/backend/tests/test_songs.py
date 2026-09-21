import pytest
from httpx import AsyncClient

from radio_backend.services import youtube as youtube_module

FAKE_RESULTS = [
    {
        "youtube_id": "abc123",
        "title": "Música de teste",
        "duration": 120,
        "thumbnail": "http://img/a.jpg",
    }
]

SQL_INJECTION_PAYLOADS = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    '" OR "1"="1',
    "1' OR '1'='1",
]


async def test_search_returns_results(
    client: AsyncClient, auth_headers: dict[str, str], mock_search
) -> None:
    mock_search(FAKE_RESULTS)

    resp = await client.get(
        "/api/songs/search", params={"q": "teste"}, headers=auth_headers
    )

    assert resp.status_code == 200
    assert resp.json()["results"] == FAKE_RESULTS


async def test_search_no_results(
    client: AsyncClient, auth_headers: dict[str, str], mock_search
) -> None:
    mock_search([])

    resp = await client.get(
        "/api/songs/search", params={"q": "xyz"}, headers=auth_headers
    )

    assert resp.status_code == 200
    assert resp.json()["results"] == []


async def test_search_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/songs/search", params={"q": "teste"})
    assert resp.status_code == 401


async def test_search_revoked_token(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    await client.post("/api/auth/logout", headers=auth_headers)

    resp = await client.get(
        "/api/songs/search", params={"q": "teste"}, headers=auth_headers
    )
    assert resp.status_code == 401


async def test_search_missing_q(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    resp = await client.get("/api/songs/search", headers=auth_headers)
    assert resp.status_code == 400


async def test_search_empty_q(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    resp = await client.get(
        "/api/songs/search", params={"q": ""}, headers=auth_headers
    )
    assert resp.status_code == 400


async def test_search_whitespace_q(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    resp = await client.get(
        "/api/songs/search", params={"q": "   "}, headers=auth_headers
    )
    assert resp.status_code == 400


async def test_search_q_too_long(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    resp = await client.get(
        "/api/songs/search", params={"q": "a" * 101}, headers=auth_headers
    )
    assert resp.status_code == 400


async def test_search_youtube_unavailable(
    client: AsyncClient, auth_headers: dict[str, str], mock_search
) -> None:
    mock_search(youtube_module.YouTubeError("busca indisponível"))

    resp = await client.get(
        "/api/songs/search", params={"q": "teste"}, headers=auth_headers
    )

    assert resp.status_code == 503
    assert resp.json()["detail"] == "busca indisponível"


@pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
async def test_search_sql_injection(
    client: AsyncClient, auth_headers: dict[str, str], mock_search, payload: str
) -> None:
    mock_search(FAKE_RESULTS)

    resp = await client.get(
        "/api/songs/search", params={"q": payload}, headers=auth_headers
    )

    # Nunca quebra (500) e nunca vaza token de acesso.
    assert resp.status_code in (200, 400)
    assert "access_token" not in resp.text
