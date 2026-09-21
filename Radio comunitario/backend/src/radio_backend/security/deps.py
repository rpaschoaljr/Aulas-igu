import uuid
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.db import get_session
from radio_backend.models.user import User
from radio_backend.security.jwt import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="não autenticado")

    try:
        payload = decode_token(credentials.credentials)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="token inválido") from exc

    user_id = payload.get("sub")
    version = payload.get("version")

    if not isinstance(user_id, str) or not isinstance(version, int):
        raise HTTPException(status_code=401, detail="token inválido")

    user = await session.get(User, uuid.UUID(user_id))
    if user is None or user.token_version != version:
        raise HTTPException(status_code=401, detail="token revogado")

    return user
