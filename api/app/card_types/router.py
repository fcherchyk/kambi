"""Card type endpoints."""

import uuid

from fastapi import APIRouter, Response, status

from app.auth.dependencies import CurrentUser, DbSession
from app.boards.service import owned_board
from app.card_types import service
from app.card_types.schemas import CardTypeCreate, CardTypeOut, CardTypeUpdate
from app.schemas import VersionQuery

router = APIRouter(prefix="/api", tags=["card types"])


@router.post(
    "/boards/{board_id}/card-types",
    response_model=CardTypeOut,
    status_code=status.HTTP_201_CREATED,
)
def create_card_type(
    board_id: uuid.UUID, body: CardTypeCreate, user: CurrentUser, db: DbSession
) -> CardTypeOut:
    board = owned_board(db, user, board_id)
    return CardTypeOut.model_validate(service.create_card_type(db, board, body.name, body.color))


@router.patch("/card-types/{type_id}", response_model=CardTypeOut)
def update_card_type(
    type_id: uuid.UUID, body: CardTypeUpdate, user: CurrentUser, db: DbSession
) -> CardTypeOut:
    card_type = service.owned_card_type(db, user, type_id, lock=True)
    updated = service.update_card_type(db, card_type, body.name, body.color, body.version)
    return CardTypeOut.model_validate(updated)


@router.delete("/card-types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card_type(
    type_id: uuid.UUID,
    version: VersionQuery,
    user: CurrentUser,
    db: DbSession,
    replace_with: uuid.UUID | None = None,
) -> Response:
    card_type = service.owned_card_type(db, user, type_id, lock=True)
    service.delete_card_type(db, card_type, version, replace_with)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
