import uuid

from sqlalchemy import ForeignKey, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from radio_backend.models.base import Base


class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("user_id", "queue_item_id"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False, index=True
    )
    queue_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("queue_items.id"), nullable=False, index=True
    )
