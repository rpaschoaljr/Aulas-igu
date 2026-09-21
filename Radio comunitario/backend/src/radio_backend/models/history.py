import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from radio_backend.models.base import Base


class History(Base):
    __tablename__ = "history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    song_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("songs.id"), nullable=False, index=True
    )
    played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    added_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
