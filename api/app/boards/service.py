"""Board rules: ownership, seeding defaults, rename, delete and the board loads."""

import uuid

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.models import User
from app.boards.models import Board
from app.card_types.models import CardType
from app.cards.models import Card
from app.columns.models import BoardColumn
from app.errors import check_version, not_found
from app.ordering import keys_after

DEFAULT_COLUMNS = ("To Do", "In Progress", "Done")
DEFAULT_TYPE = ("Task", "yellow")


def owned_board(db: Session, user: User, board_id: uuid.UUID, lock: bool = False) -> Board:
    query = select(Board).where(Board.id == board_id, Board.owner_id == user.id)
    if lock:
        query = query.with_for_update()
    board = db.scalars(query).one_or_none()
    if board is None:
        raise not_found("Board")
    return board


def list_boards(db: Session, user: User) -> list[Board]:
    query = select(Board).where(Board.owner_id == user.id).order_by(Board.created_at, Board.id)
    return list(db.scalars(query))


def create_board(db: Session, user: User, name: str) -> Board:
    """Create a board with its default columns and type in the caller's transaction."""
    board = Board(owner_id=user.id, name=name)
    db.add(board)
    db.flush()
    seed_columns(db, board)
    seed_card_types(db, board)
    db.flush()
    return board


def seed_columns(db: Session, board: Board) -> None:
    for name, key in zip(DEFAULT_COLUMNS, keys_after(None, len(DEFAULT_COLUMNS)), strict=True):
        db.add(BoardColumn(board_id=board.id, name=name, sort_key=key))
    db.flush()


def seed_card_types(db: Session, board: Board) -> None:
    name, color = DEFAULT_TYPE
    db.add(CardType(board_id=board.id, name=name, color=color, sort_key=keys_after(None, 1)[0]))
    db.flush()


def rename_board(db: Session, board: Board, name: str, version: int) -> Board:
    check_version(board.version, version)
    board.name = name
    board.version += 1
    db.flush()
    return board


def delete_board(db: Session, board: Board, version: int) -> None:
    check_version(board.version, version)
    db.execute(delete(Card).where(Card.board_id == board.id))
    db.execute(delete(Board).where(Board.id == board.id))


def active_columns(db: Session, board_id: uuid.UUID) -> list[BoardColumn]:
    query = (
        select(BoardColumn)
        .where(BoardColumn.board_id == board_id, BoardColumn.archived_at.is_(None))
        .order_by(BoardColumn.sort_key)
    )
    return list(db.scalars(query))


def archived_columns(db: Session, board_id: uuid.UUID) -> list[BoardColumn]:
    query = (
        select(BoardColumn)
        .where(BoardColumn.board_id == board_id, BoardColumn.archived_at.is_not(None))
        .order_by(BoardColumn.sort_key)
    )
    return list(db.scalars(query))


def board_card_types(db: Session, board_id: uuid.UUID) -> list[CardType]:
    query = select(CardType).where(CardType.board_id == board_id).order_by(CardType.sort_key)
    return list(db.scalars(query))


def cards_of_columns(db: Session, column_ids: list[uuid.UUID]) -> list[Card]:
    if not column_ids:
        return []
    query = (
        select(Card).where(Card.column_id.in_(column_ids)).order_by(Card.column_id, Card.sort_key)
    )
    return list(db.scalars(query))
