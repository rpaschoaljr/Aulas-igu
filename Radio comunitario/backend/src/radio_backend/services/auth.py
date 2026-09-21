from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.config import get_settings
from radio_backend.models.user import User
from radio_backend.models.verification_token import VerificationToken
from radio_backend.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from radio_backend.security.email import send_verification_email
from radio_backend.security.jwt import create_access_token
from radio_backend.security.normalize import normalize
from radio_backend.security.password import hash_password, verify_password
from radio_backend.security.verification import generate_token, hash_token

settings = get_settings()


def _to_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        nickname=user.nickname,
        email=user.email,
        verified=user.verified_at is not None,
    )


async def register_user(session: AsyncSession, data: RegisterRequest) -> UserResponse:
    nickname_normalized = normalize(data.nickname)
    email_normalized = normalize(data.email)

    existing = await session.execute(
        select(User).where(
            (User.nickname_normalized == nickname_normalized)
            | (User.email_normalized == email_normalized)
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="apelido ou e-mail já cadastrado")

    user = User(
        nickname=data.nickname.strip(),
        nickname_normalized=nickname_normalized,
        email=data.email.strip(),
        email_normalized=email_normalized,
        password_hash=hash_password(data.password),
    )
    session.add(user)
    await session.flush()

    raw_token = generate_token()
    token = VerificationToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(UTC)
        + timedelta(hours=settings.verification_token_expire_hours),
    )
    session.add(token)
    await session.commit()

    send_verification_email(user.email, raw_token)

    return _to_response(user)


async def login_user(session: AsyncSession, data: LoginRequest) -> TokenResponse:
    login_normalized = normalize(data.login)

    result = await session.execute(
        select(User).where(
            (User.nickname_normalized == login_normalized)
            | (User.email_normalized == login_normalized)
        )
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="credenciais inválidas")

    if user.verified_at is None:
        raise HTTPException(status_code=403, detail="e-mail não verificado")

    token = create_access_token(str(user.id), user.token_version)
    return TokenResponse(access_token=token)


async def verify_email(session: AsyncSession, token: str) -> None:
    token_hash = hash_token(token)
    result = await session.execute(
        select(VerificationToken).where(VerificationToken.token_hash == token_hash)
    )
    record = result.scalar_one_or_none()

    if record is None or record.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=404, detail="token inválido ou expirado")

    user = await session.get(User, record.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="usuário não encontrado")

    user.verified_at = datetime.now(UTC)
    await session.commit()


async def revoke_session(session: AsyncSession, user: User) -> None:
    user.token_version += 1
    await session.commit()
