"""Card endpoints."""

import uuid

from fastapi import APIRouter, Response, status

from app.auth.dependencies import CurrentUser, DbSession
from app.cards import service
from app.cards.schemas import CardCreate, CardMove, CardOut, CardUpdate
from app.columns.service import owned_column
from app.schemas import VersionQuery

router = APIRouter(prefix="/api", tags=["cards"])


@router.post(
    "/columns/{column_id}/cards", response_model=CardOut, status_code=status.HTTP_201_CREATED
)
def create_card(
    column_id: uuid.UUID, body: CardCreate, user: CurrentUser, db: DbSession
) -> CardOut:
    column = owned_column(db, user, column_id)
    card = service.create_card(db, column, body.title, body.description, body.type_id)
    return CardOut.model_validate(card)


@router.patch("/cards/{card_id}", response_model=CardOut)
def update_card(card_id: uuid.UUID, body: CardUpdate, user: CurrentUser, db: DbSession) -> CardOut:
    card = service.owned_card(db, user, card_id, lock=True)
    updated = service.update_card(
        db, card, body.version, body.title, body.description, body.type_id
    )
    return CardOut.model_validate(updated)


@router.post("/cards/{card_id}/move", response_model=CardOut)
def move_card(card_id: uuid.UUID, body: CardMove, user: CurrentUser, db: DbSession) -> CardOut:
    card = service.owned_card(db, user, card_id, lock=True)
    moved = service.move_card(db, card, body.version, body.column_id, body.after_id)
    return CardOut.model_validate(moved)


@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: uuid.UUID, version: VersionQuery, user: CurrentUser, db: DbSession
) -> Response:
    card = service.owned_card(db, user, card_id, lock=True)
    service.delete_card(db, card, version)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
