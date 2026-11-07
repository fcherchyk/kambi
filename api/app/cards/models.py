"""Cards."""

import uuid

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import SORT_KEY_COLLATION, Base, TimestampMixin, new_id


class Card(TimestampMixin, Base):
    __tablename__ = "cards"
    __table_args__ = (Index("ix_cards_column_sort", "column_id", "sort_key"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=new_id)
    # Denormalized so isolation checks and the board load need a single join.
    board_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"))
    # No ON DELETE action: the services move or delete cards explicitly first.
    column_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("board_columns.id"))
    type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("card_types.id"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    sort_key: Mapped[str] = mapped_column(String(collation=SORT_KEY_COLLATION))
    props: Mapped[dict] = mapped_column(JSONB, default=dict)
    version: Mapped[int] = mapped_column(default=1)
