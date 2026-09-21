import asyncio
import os
from collections.abc import AsyncGenerator

os.environ.setdefault("SECRET_KEY", "test-secret-key-with-at-least-32-bytes-length")

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from radio_backend.db import get_session
from radio_backend.main import app
from radio_backend.models import User, VerificationToken  # noqa: F401
from radio_backend.models.base import Base

ALL_TABLES = (
    "users, verification_tokens, songs, queue_items, votes, history, playback_state"
)

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://radio:radio@localhost:5432/radio_test",
)
ADMIN_DATABASE_DSN = os.environ.get(
    "ADMIN_DATABASE_DSN",
    "postgresql://radio:radio@localhost:5432/radio",
)


def _create_database() -> None:
    async def _run() -> None:
        import asyncpg

        conn = await asyncpg.connect(ADMIN_DATABASE_DSN)
        try:
            exists = await conn.fetchval(
                "SELECT 1 FROM pg_database WHERE datname = 'radio_test'"
            )
            if not exists:
                await conn.execute('CREATE DATABASE "radio_test"')
        finally:
            await conn.close()

    asyncio.run(_run())


def _create_tables() -> None:
    async def _run() -> None:
        engine = create_async_engine(TEST_DATABASE_URL)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()

    asyncio.run(_run())


def _drop_tables() -> None:
    async def _run() -> None:
        engine = create_async_engine(TEST_DATABASE_URL)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await engine.dispose()

    asyncio.run(_run())


@pytest.fixture(scope="session", autouse=True)
def prepare_database() -> None:
    _create_database()
    _create_tables()
    yield
    _drop_tables()


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    engine = create_async_engine(TEST_DATABASE_URL)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    async with engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE TABLE {ALL_TABLES} CASCADE"))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession]:
    engine = create_async_engine(TEST_DATABASE_URL)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE TABLE {ALL_TABLES} CASCADE"))

    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def raw_session() -> AsyncGenerator[AsyncSession]:
    """Sessão sem truncate, para compartilhar estado com o fixture `client`."""
    engine = create_async_engine(TEST_DATABASE_URL)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.fixture
def mock_search(monkeypatch: pytest.MonkeyPatch):
    """Substitui `youtube.search_songs` por um fake configurável nos testes."""
    from radio_backend.services import youtube as youtube_module

    def set_result(result: object) -> None:
        async def fake(query: str, max_results: int = 10, client: object = None):
            if isinstance(result, Exception):
                raise result
            return result

        monkeypatch.setattr(youtube_module, "search_songs", fake)

    return set_result


@pytest_asyncio.fixture
async def auth_headers(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> dict[str, str]:
    """Registra, verifica e loga um usuário; devolve os headers de autorização."""
    from radio_backend.services import auth as auth_service

    sent: list[tuple[str, str]] = []
    monkeypatch.setattr(
        auth_service,
        "send_verification_email",
        lambda to, token: sent.append((to, token)),
    )

    await client.post(
        "/api/auth/register",
        json={
            "nickname": "ouvinte",
            "email": "ouvinte@example.com",
            "password": "Senha1@forte",
        },
    )
    verify_token = sent[-1][1]
    await client.get("/api/auth/verify", params={"token": verify_token})
    login = await client.post(
        "/api/auth/login",
        json={"login": "ouvinte", "password": "Senha1@forte"},
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}
