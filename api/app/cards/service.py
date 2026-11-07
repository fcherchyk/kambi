"""Card rules: creation at the end of a column, edits, moves to any column, deletion."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.models import User
from app.boards.models import Board
from app.card_types.service import first_type, type_in_board
from app.cards.models import Card
from app.columns.models import BoardColumn
from app.columns.service import active_column_in_board, require_active
from app.errors import check_version, invalid, not_found
from app.ordering import key_after_anchor, keys_after


def owned_card(db: Session, user: User, card_id: uuid.UUID, lock: bool = False) -> Card:
    query = (
        select(Card)
        .join(Board, Board.id == Card.board_id)
        .where(Card.id == card_id, Board.owner_id == user.id)
    )
    if lock:
        query = query.with_for_update(of=Card)
    card = db.scalars(query).one_or_none()
    if card is None:
        raise not_found("Card")
    return card


def create_card(
    db: Session,
    column: BoardColumn,
    title: str,
    description: str,
    type_id: uuid.UUID | None,
) -> Card:
    require_active(column)
    if type_id is None:
        card_type = first_type(db, column.board_id)
    else:
        card_type = type_in_board(db, column.board_id, type_id, "type_id")
    last = db.scalar(select(func.max(Card.sort_key)).where(Card.column_id == column.id))
    card = Card(
        board_id=column.board_id,
        column_id=column.id,
        type_id=card_type.id,
        title=title,
        description=description,
        sort_key=keys_after(last, 1)[0],
        props={},
    )
    db.add(card)
    db.flush()
    return card


def update_card(
    db: Session,
    card: Card,
    version: int,
    title: str | None,
    description: str | None,
    type_id: uuid.UUID | None,
) -> Card:
    check_version(card.version, version)
    _require_active_column(db, card)
    if title is not None:
        card.title = title
    if description is not None:
        card.description = description
    if type_id is not None:
        card.type_id = type_in_board(db, card.board_id, type_id, "type_id").id
    return _bump(db, card)


def move_card(
    db: Session,
    card: Card,
    version: int,
    column_id: uuid.UUID,
    after_id: uuid.UUID | None,
) -> Card:
    """Move a card to any active column of its board, right after `after_id` or first."""
    check_version(card.version, version)
    _require_active_column(db, card)
    target = active_column_in_board(db, card.board_id, column_id, "column_id")
    anchor = None
    if after_id is not None:
        anchor = _anchor_card(db, target.id, after_id, card.id).sort_key
    query = (
        select(Card.sort_key)
        .where(Card.column_id == target.id, Card.id != card.id)
        .order_by(Card.sort_key)
    )
    card.sort_key = key_after_anchor(list(db.scalars(query)), anchor)
    card.column_id = target.id
    return _bump(db, card)


def delete_card(db: Session, card: Card, version: int) -> None:
    check_version(card.version, version)
    _require_active_column(db, card)
    db.delete(card)
    db.flush()


def _anchor_card(
    db: Session, column_id: uuid.UUID, after_id: uuid.UUID, moving_id: uuid.UUID
) -> Card:
    anchor = db.get(Card, after_id)
    if anchor is None or anchor.column_id != column_id or anchor.id == moving_id:
        raise invalid("after_id must be another card of the target column")
    return anchor


def _require_active_column(db: Session, card: Card) -> None:
    column = db.get(BoardColumn, card.column_id)
    if column is None or column.archived_at is not None:
        raise invalid("The card is in an archived column: restore the column first")


def _bump(db: Session, card: Card) -> Card:
    card.version += 1
    db.flush()
    return card
