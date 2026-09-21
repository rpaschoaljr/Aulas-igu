from datetime import UTC, datetime, timedelta

import jwt

from radio_backend.config import get_settings

settings = get_settings()
ALGORITHM = "HS256"


def create_access_token(user_id: str, token_version: int) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "version": token_version,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, object]:
    return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
