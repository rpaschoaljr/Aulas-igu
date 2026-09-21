from httpx import AsyncClient

ALLOWED_ORIGIN = "http://localhost:5173"
DISALLOWED_ORIGIN = "http://evil.com"


async def test_cors_preflight_allowed(client: AsyncClient) -> None:
    response = await client.options(
        "/api/auth/register",
        headers={
            "Origin": ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN


async def test_cors_preflight_disallowed(client: AsyncClient) -> None:
    response = await client.options(
        "/api/auth/register",
        headers={
            "Origin": DISALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
