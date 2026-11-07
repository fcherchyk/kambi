"""Board endpoints."""

import uuid

from fastapi import APIRouter, Response, status

from app.auth.dependencies import CurrentUser, DbSession
from app.boards import service
from app.boards.schemas import (
    ArchivedColumnOut,
    BoardArchive,
    BoardCreate,
    BoardDetail,
    BoardOut,
    BoardRename,
)
from app.card_types.schemas import CardTypeOut
from app.cards.schemas import CardOut
from app.columns.schemas import ColumnOut
from app.schemas import VersionQuery

router = APIRouter(prefix="/api/boards", tags=["boards"])


@router.get("", response_model=list[BoardOut])
def list_boards(user: CurrentUser, db: DbSession) -> list[BoardOut]:
    return [BoardOut.model_validate(board) for board in service.list_boards(db, user)]


@router.post("", response_model=BoardOut, status_code=status.HTTP_201_CREATED)
def create_board(body: BoardCreate, user: CurrentUser, db: DbSession) -> BoardOut:
    return BoardOut.model_validate(service.create_board(db, user, body.name))


@router.get("/{board_id}", response_model=BoardDetail)
def get_board(board_id: uuid.UUID, user: CurrentUser, db: DbSession) -> BoardDetail:
    board = service.owned_board(db, user, board_id)
    columns = service.active_columns(db, board.id)
    cards = service.cards_of_columns(db, [column.id for column in columns])
    return BoardDetail(
        **BoardOut.model_validate(board).model_dump(),
        columns=[ColumnOut.model_validate(column) for column in columns],
        card_types=[
            CardTypeOut.model_validate(card_type)
            for card_type in service.board_card_types(db, board.id)
        ],
        cards=[CardOut.model_validate(card) for card in cards],
    )


@router.get("/{board_id}/archive", response_model=BoardArchive)
def get_archive(board_id: uuid.UUID, user: CurrentUser, db: DbSession) -> BoardArchive:
    board = service.owned_board(db, user, board_id)
    columns = service.archived_columns(db, board.id)
    cards = [
        CardOut.model_validate(card)
        for card in service.cards_of_columns(db, [column.id for column in columns])
    ]
    return BoardArchive(
        board_id=board.id,
        columns=[
            ArchivedColumnOut(
                **ColumnOut.model_validate(column).model_dump(),
                cards=[card for card in cards if card.column_id == column.id],
            )
            for column in columns
        ],
    )


@router.patch("/{board_id}", response_model=BoardOut)
def rename_board(
    board_id: uuid.UUID, body: BoardRename, user: CurrentUser, db: DbSession
) -> BoardOut:
    board = service.owned_board(db, user, board_id, lock=True)
    return BoardOut.model_validate(service.rename_board(db, board, body.name, body.version))


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(
    board_id: uuid.UUID, version: VersionQuery, user: CurrentUser, db: DbSession
) -> Response:
    board = service.owned_board(db, user, board_id, lock=True)
    service.delete_board(db, board, version)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
