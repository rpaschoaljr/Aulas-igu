from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from radio_backend.db import get_session
from radio_backend.models.user import User
from radio_backend.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from radio_backend.security.deps import get_current_user
from radio_backend.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    data: RegisterRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserResponse:
    return await auth_service.register_user(session, data)


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    return await auth_service.login_user(session, data)


@router.get("/verify")
async def verify(
    token: str,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, str]:
    await auth_service.verify_email(session, token)
    return {"status": "verified"}


@router.post("/logout")
async def logout(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, str]:
    await auth_service.revoke_session(session, user)
    return {"status": "ok"}
