"""Column endpoints."""

import uuid

from fastapi import APIRouter, Response, status

from app.auth.dependencies import CurrentUser, DbSession
from app.boards.service import owned_board
from app.columns import service
from app.columns.schemas import ColumnCreate, ColumnMove, ColumnOut, ColumnRename, VersionBody
from app.schemas import VersionQuery

router = APIRouter(prefix="/api", tags=["columns"])


@router.post(
    "/boards/{board_id}/columns", response_model=ColumnOut, status_code=status.HTTP_201_CREATED
)
def create_column(
    board_id: uuid.UUID, body: ColumnCreate, user: CurrentUser, db: DbSession
) -> ColumnOut:
    board = owned_board(db, user, board_id)
    append = "after_id" not in body.model_fields_set
    return ColumnOut.model_validate(
        service.create_column(db, board, body.name, body.after_id, append)
    )


@router.patch("/columns/{column_id}", response_model=ColumnOut)
def rename_column(
    column_id: uuid.UUID, body: ColumnRename, user: CurrentUser, db: DbSession
) -> ColumnOut:
    column = service.owned_column(db, user, column_id, lock=True)
    return ColumnOut.model_validate(service.rename_column(db, column, body.name, body.version))


@router.post("/columns/{column_id}/move", response_model=ColumnOut)
def move_column(
    column_id: uuid.UUID, body: ColumnMove, user: CurrentUser, db: DbSession
) -> ColumnOut:
    column = service.owned_column(db, user, column_id, lock=True)
    return ColumnOut.model_validate(service.move_column(db, column, body.after_id, body.version))


@router.post("/columns/{column_id}/archive", response_model=ColumnOut)
def archive_column(
    column_id: uuid.UUID, body: VersionBody, user: CurrentUser, db: DbSession
) -> ColumnOut:
    column = service.owned_column(db, user, column_id, lock=True)
    return ColumnOut.model_validate(service.archive_column(db, column, body.version))


@router.post("/columns/{column_id}/restore", response_model=ColumnOut)
def restore_column(
    column_id: uuid.UUID, body: VersionBody, user: CurrentUser, db: DbSession
) -> ColumnOut:
    column = service.owned_column(db, user, column_id, lock=True)
    return ColumnOut.model_validate(service.restore_column(db, column, body.version))


@router.delete("/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_column(
    column_id: uuid.UUID,
    version: VersionQuery,
    user: CurrentUser,
    db: DbSession,
    cards: service.CardsAction | None = None,
    target: uuid.UUID | None = None,
) -> Response:
    column = service.owned_column(db, user, column_id, lock=True)
    service.delete_column(db, column, version, cards, target)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
