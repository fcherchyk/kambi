"""Column request and response bodies."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas import ColumnName, Version


class ColumnCreate(BaseModel):
    name: ColumnName
    after_id: uuid.UUID | None = Field(
        default=None,
        description="Active column to insert after; null puts it first; omit it to append",
    )


class ColumnRename(BaseModel):
    name: ColumnName
    version: Version


class ColumnMove(BaseModel):
    after_id: uuid.UUID | None = Field(description="Active column to move after; null for first")
    version: Version


class VersionBody(BaseModel):
    version: Version


class ColumnOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    board_id: uuid.UUID
    name: str
    sort_key: str
    archived_at: datetime | None
    version: int
