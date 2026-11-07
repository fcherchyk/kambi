"""Board columns: the workflow steps, which are also the card state."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import SORT_KEY_COLLATION, Base, TimestampMixin, new_id


class BoardColumn(TimestampMixin, Base):
    __tablename__ = "board_columns"
    __table_args__ = (
        Index("ix_board_columns_board_archived_sort", "board_id", "archived_at", "sort_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=new_id)
    board_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    sort_key: Mapped[str] = mapped_column(String(collation=SORT_KEY_COLLATION))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(default=1)
