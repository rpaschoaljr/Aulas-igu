import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from radio_backend.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    nickname: Mapped[str] = mapped_column(String(32), nullable=False)
    nickname_normalized: Mapped[str] = mapped_column(
        String(32), unique=True, index=True, nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    email_normalized: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    token_version: Mapped[int] = mapped_column(default=0, nullable=False)
