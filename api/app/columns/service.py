"""Column rules: placement, archive and restore, and deletion with its cards."""

import uuid
from typing import Literal

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.auth.models import User
from app.boards.models import Board
from app.cards.models import Card
from app.columns.models import BoardColumn
from app.db import utcnow
from app.errors import check_version, invalid, not_found
from app.ordering import key_after_anchor, keys_after

CardsAction = Literal["move", "delete"]


def owned_column(db: Session, user: User, column_id: uuid.UUID, lock: bool = False) -> BoardColumn:
    query = (
        select(BoardColumn)
        .join(Board, Board.id == BoardColumn.board_id)
        .where(BoardColumn.id == column_id, Board.owner_id == user.id)
    )
    if lock:
        query = query.with_for_update(of=BoardColumn)
    column = db.scalars(query).one_or_none()
    if column is None:
        raise not_found("Column")
    return column


def lock_board(db: Session, board_id: uuid.UUID) -> None:
    """Serialize structural changes (archive, delete) on one board."""
    db.execute(select(Board.id).where(Board.id == board_id).with_for_update())


def require_active(column: BoardColumn) -> None:
    if column.archived_at is not None:
        raise invalid("The column is archived")


def active_column_in_board(
    db: Session, board_id: uuid.UUID, column_id: uuid.UUID, field: str
) -> BoardColumn:
    """Return an active column of the board, or 422 if `column_id` is anything else."""
    column = db.get(BoardColumn, column_id)
    if column is None or column.board_id != board_id or column.archived_at is not None:
        raise invalid(f"{field} must be an active column of the same board")
    return column


def create_column(
    db: Session, board: Board, name: str, after_id: uuid.UUID | None, append: bool
) -> BoardColumn:
    if append:
        sort_key = keys_after(_last_key(db, board.id), 1)[0]
    else:
        sort_key = _key_after(db, board.id, after_id, moving_id=None)
    column = BoardColumn(board_id=board.id, name=name, sort_key=sort_key)
    db.add(column)
    db.flush()
    return column


def rename_column(db: Session, column: BoardColumn, name: str, version: int) -> BoardColumn:
    check_version(column.version, version)
    require_active(column)
    column.name = name
    return _bump(db, column)


def move_column(
    db: Session, column: BoardColumn, after_id: uuid.UUID | None, version: int
) -> BoardColumn:
    check_version(column.version, version)
    require_active(column)
    column.sort_key = _key_after(db, column.board_id, after_id, moving_id=column.id)
    return _bump(db, column)


def archive_column(db: Session, column: BoardColumn, version: int) -> BoardColumn:
    check_version(column.version, version)
    require_active(column)
    _forbid_last_active(db, column)
    column.archived_at = utcnow()
    return _bump(db, column)


def restore_column(db: Session, column: BoardColumn, version: int) -> BoardColumn:
    check_version(column.version, version)
    if column.archived_at is None:
        raise invalid("The column is not archived")
    column.archived_at = None
    return _bump(db, column)


def delete_column(
    db: Session,
    column: BoardColumn,
    version: int,
    cards: CardsAction | None,
    target_id: uuid.UUID | None,
) -> None:
    check_version(column.version, version)
    if column.archived_at is None:
        _forbid_last_active(db, column)
    column_cards = _cards_in(db, column.id)
    if column_cards:
        if cards is None:
            raise invalid("The column has cards: pass cards=move&target=… or cards=delete")
        if cards == "move":
            _move_cards_to_end(db, column, column_cards, target_id)
        else:
            db.execute(delete(Card).where(Card.column_id == column.id))
    db.delete(column)
    db.flush()


def _move_cards_to_end(
    db: Session, column: BoardColumn, cards: list[Card], target_id: uuid.UUID | None
) -> None:
    if target_id is None:
        raise invalid("cards=move needs a target column")
    if target_id == column.id:
        raise invalid("The target must be another column")
    target = active_column_in_board(db, column.board_id, target_id, "target")
    last = db.scalar(select(func.max(Card.sort_key)).where(Card.column_id == target.id))
    for card, sort_key in zip(cards, keys_after(last, len(cards)), strict=True):
        card.column_id = target.id
        card.sort_key = sort_key
        card.version += 1
    db.flush()


def _forbid_last_active(db: Session, column: BoardColumn) -> None:
    lock_board(db, column.board_id)
    query = select(func.count()).where(
        BoardColumn.board_id == column.board_id,
        BoardColumn.archived_at.is_(None),
        BoardColumn.id != column.id,
    )
    if db.scalar(query) == 0:
        raise invalid("A board needs at least one active column")


def _key_after(
    db: Session, board_id: uuid.UUID, after_id: uuid.UUID | None, moving_id: uuid.UUID | None
) -> str:
    """Key right after an active column (or first), never colliding with archived ones."""
    anchor = None
    if after_id is not None:
        if after_id == moving_id:
            raise invalid("A column cannot be moved after itself")
        anchor = active_column_in_board(db, board_id, after_id, "after_id").sort_key
    query = select(BoardColumn.sort_key).where(BoardColumn.board_id == board_id)
    if moving_id is not None:
        query = query.where(BoardColumn.id != moving_id)
    return key_after_anchor(list(db.scalars(query.order_by(BoardColumn.sort_key))), anchor)


def _last_key(db: Session, board_id: uuid.UUID) -> str | None:
    return db.scalar(select(func.max(BoardColumn.sort_key)).where(BoardColumn.board_id == board_id))


def _cards_in(db: Session, column_id: uuid.UUID) -> list[Card]:
    query = select(Card).where(Card.column_id == column_id).order_by(Card.sort_key)
    return list(db.scalars(query).all())


def _bump(db: Session, column: BoardColumn) -> BoardColumn:
    column.version += 1
    db.flush()
    return column
