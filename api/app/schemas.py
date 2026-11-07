"""Validated field types shared by the request bodies of every domain."""

from typing import Annotated, Literal, get_args

from fastapi import Query
from pydantic import Field, StringConstraints

BoardName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
ColumnName = BoardName
TypeName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
CardTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
CardDescription = Annotated[str, StringConstraints(max_length=10_000)]
Version = Annotated[int, Field(ge=1, description="The version the client last saw")]
VersionQuery = Annotated[int, Query(ge=1, description="The version the client last saw")]

# Palette keys. The SPA maps them to colors; hex values may be added later.
Color = Literal[
    "yellow", "orange", "red", "pink", "purple", "blue", "teal", "green", "gray", "brown"
]
PALETTE: tuple[str, ...] = get_args(Color)
