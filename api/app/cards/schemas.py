"""Card request and response bodies."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas import CardDescription, CardTitle, Version


class CardCreate(BaseModel):
    title: CardTitle
    description: CardDescription = ""
    type_id: uuid.UUID | None = Field(
        default=None, description="Defaults to the board's first type"
    )


class CardUpdate(BaseModel):
    title: CardTitle | None = None
    description: CardDescription | None = None
    type_id: uuid.UUID | None = None
    version: Version


class CardMove(BaseModel):
    column_id: uuid.UUID
    after_id: uuid.UUID | None = Field(description="Card to move after; null for first")
    version: Version


class CardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    board_id: uuid.UUID
    column_id: uuid.UUID
    type_id: uuid.UUID
    title: str
    description: str
    sort_key: str
    version: int
    created_at: datetime
    updated_at: datetime
