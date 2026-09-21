import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from radio_backend.models.base import Base


class PlaybackState(Base):
    __tablename__ = "playback_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    current_song_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("songs.id"), nullable=True
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
