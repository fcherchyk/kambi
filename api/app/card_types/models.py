"""Card types: a name and a palette color, per board."""

import uuid

from sqlalchemy import ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import SORT_KEY_COLLATION, Base, TimestampMixin, new_id


class CardType(TimestampMixin, Base):
    __tablename__ = "card_types"
    __table_args__ = (
        Index("uq_card_types_board_name", "board_id", text("lower(name)"), unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=new_id)
    board_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(50))
    color: Mapped[str] = mapped_column(String(32))
    sort_key: Mapped[str] = mapped_column(String(collation=SORT_KEY_COLLATION))
    version: Mapped[int] = mapped_column(default=1)
