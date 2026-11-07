"""Board request and response bodies."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.card_types.schemas import CardTypeOut
from app.cards.schemas import CardOut
from app.columns.schemas import ColumnOut
from app.schemas import BoardName, Version


class BoardCreate(BaseModel):
    name: BoardName


class BoardRename(BaseModel):
    name: BoardName
    version: Version


class BoardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    version: int
    created_at: datetime
    updated_at: datetime


class BoardDetail(BoardOut):
    """The active board: active columns, every type, and the cards of active columns."""

    columns: list[ColumnOut]
    card_types: list[CardTypeOut]
    cards: list[CardOut]


class ArchivedColumnOut(ColumnOut):
    cards: list[CardOut]


class BoardArchive(BaseModel):
    board_id: uuid.UUID
    columns: list[ArchivedColumnOut]
