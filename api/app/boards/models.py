"""Boards."""

import uuid

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, TimestampMixin, new_id


class Board(TimestampMixin, Base):
    __tablename__ = "boards"
    __table_args__ = (Index("ix_boards_owner_created", "owner_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=new_id)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    version: Mapped[int] = mapped_column(default=1)
