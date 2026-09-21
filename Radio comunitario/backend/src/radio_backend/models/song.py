import uuid

from sqlalchemy import ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from radio_backend.models.base import Base


class Song(Base):
    __tablename__ = "songs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    youtube_id: Mapped[str] = mapped_column(
        String(32), unique=True, index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    duration: Mapped[int] = mapped_column(Integer, nullable=False)
    thumbnail: Mapped[str] = mapped_column(String(512), nullable=False)
    added_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
