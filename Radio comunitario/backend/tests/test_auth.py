import pytest
from httpx import AsyncClient

from radio_backend.services import auth as auth_service

SQL_INJECTION_PAYLOADS = [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "' OR '1'='1' #",
    '" OR "1"="1',
    "' OR 1=1 --",
    "1' OR '1'='1",
    "' UNION SELECT username, password FROM users --",
    "'; DROP TABLE users; --",
    "' OR ''='",
    "admin' --",
    "admin'/*",
    "1' AND '1'='1",
    "' AND 1=1 --",
    "'; SELECT pg_sleep(5); --",
    "%' OR '1'='1",
    "' OR EXISTS(SELECT * FROM users) --",
]

VALID_PAYLOAD = {
    "nickname": "tEste",
    "email": "Fulano@Email.com",
    "password": "Senha1@forte",
}


@pytest.fixture(autouse=True)
def email_mock(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str]]:
    sent: list[tuple[str, str]] = []
    monkeypatch.setattr(
        auth_service,
        "send_verification_email",
        lambda to, token: sent.append((to, token)),
    )
    return sent


async def test_register_valid(
    client: AsyncClient, email_mock: list[tuple[str, str]]
) -> None:
    response = await client.post("/api/auth/register", json=VALID_PAYLOAD)
    assert response.status_code == 201
    body = response.json()
    assert body["nickname"] == "tEste"
    assert body["email"] == "Fulano@Email.com"
    assert body["verified"] is False
    assert len(email_mock) == 1


async def test_register_rejects_weak_password(client: AsyncClient) -> None:
    payload = {**VALID_PAYLOAD, "password": "fraca"}
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 400


async def test_register_rejects_invalid_email(client: AsyncClient) -> None:
    payload = {**VALID_PAYLOAD, "email": "nao-e-email"}
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 400


async def test_register_duplicate_nickname_variant(client: AsyncClient) -> None:
    await client.post("/api/auth/register", json=VALID_PAYLOAD)
    duplicate = {**VALID_PAYLOAD, "nickname": "TESTE", "email": "outro@email.com"}
    response = await client.post("/api/auth/register", json=duplicate)
    assert response.status_code == 409


async def test_register_duplicate_email_variant(client: AsyncClient) -> None:
    await client.post("/api/auth/register", json=VALID_PAYLOAD)
    duplicate = {**VALID_PAYLOAD, "nickname": "outro", "email": "fulano@email.com"}
    response = await client.post("/api/auth/register", json=duplicate)
    assert response.status_code == 409


async def test_login_blocked_until_verified(client: AsyncClient) -> None:
    await client.post("/api/auth/register", json=VALID_PAYLOAD)
    response = await client.post(
        "/api/auth/login", json={"login": "teste", "password": "Senha1@forte"}
    )
    assert response.status_code == 403


async def test_verify_then_login_by_nickname_and_email(
    client: AsyncClient, email_mock: list[tuple[str, str]]
) -> None:
    await client.post("/api/auth/register", json=VALID_PAYLOAD)
    token = email_mock[-1][1]

    verify = await client.get("/api/auth/verify", params={"token": token})
    assert verify.status_code == 200

    by_nickname = await client.post(
        "/api/auth/login", json={"login": "tEste", "password": "Senha1@forte"}
    )
    assert by_nickname.status_code == 200
    assert "access_token" in by_nickname.json()

    by_email = await client.post(
        "/api/auth/login",
        json={"login": "FULANO@email.com", "password": "Senha1@forte"},
    )
    assert by_email.status_code == 200


async def test_verify_invalid_token(client: AsyncClient) -> None:
    response = await client.get("/api/auth/verify", params={"token": "token-invalido"})
    assert response.status_code == 404


async def test_verify_is_idempotent(
    client: AsyncClient, email_mock: list[tuple[str, str]]
) -> None:
    await client.post("/api/auth/register", json=VALID_PAYLOAD)
    token = email_mock[-1][1]

    first = await client.get("/api/auth/verify", params={"token": token})
    assert first.status_code == 200

    second = await client.get("/api/auth/verify", params={"token": token})
    assert second.status_code == 200


async def test_logout_revokes_token(
    client: AsyncClient, email_mock: list[tuple[str, str]]
) -> None:
    await client.post("/api/auth/register", json=VALID_PAYLOAD)
    token = email_mock[-1][1]
    await client.get("/api/auth/verify", params={"token": token})

    login = await client.post(
        "/api/auth/login", json={"login": "teste", "password": "Senha1@forte"}
    )
    access_token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    logout = await client.post("/api/auth/logout", headers=headers)
    assert logout.status_code == 200

    reuse = await client.post("/api/auth/logout", headers=headers)
    assert reuse.status_code == 401


@pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
async def test_login_sql_injection(client: AsyncClient, payload: str) -> None:
    await client.post("/api/auth/register", json=VALID_PAYLOAD)
    response = await client.post(
        "/api/auth/login", json={"login": payload, "password": "Senha1@forte"}
    )
    assert response.status_code == 401
    assert "access_token" not in response.json()


@pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
async def test_login_sql_injection_password(client: AsyncClient, payload: str) -> None:
    await client.post("/api/auth/register", json=VALID_PAYLOAD)
    response = await client.post(
        "/api/auth/login", json={"login": "teste", "password": payload}
    )
    assert response.status_code == 401


@pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
async def test_register_sql_injection_email(client: AsyncClient, payload: str) -> None:
    body = {**VALID_PAYLOAD, "email": payload}
    response = await client.post("/api/auth/register", json=body)
    assert response.status_code in (400, 409)
