"""Card type request and response bodies."""

import uuid

from pydantic import BaseModel, ConfigDict

from app.schemas import Color, TypeName, Version


class CardTypeCreate(BaseModel):
    name: TypeName
    color: Color


class CardTypeUpdate(BaseModel):
    name: TypeName | None = None
    color: Color | None = None
    version: Version


class CardTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    board_id: uuid.UUID
    name: str
    color: str
    sort_key: str
    version: int
