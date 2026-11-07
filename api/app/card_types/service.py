"""Card type rules: unique names per board, the palette, and deletion with replacement."""

import uuid

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.auth.models import User
from app.boards.models import Board
from app.card_types.models import CardType
from app.cards.models import Card
from app.errors import check_version, invalid, not_found
from app.ordering import keys_after


def owned_card_type(db: Session, user: User, type_id: uuid.UUID, lock: bool = False) -> CardType:
    query = (
        select(CardType)
        .join(Board, Board.id == CardType.board_id)
        .where(CardType.id == type_id, Board.owner_id == user.id)
    )
    if lock:
        query = query.with_for_update(of=CardType)
    card_type = db.scalars(query).one_or_none()
    if card_type is None:
        raise not_found("Card type")
    return card_type


def type_in_board(db: Session, board_id: uuid.UUID, type_id: uuid.UUID, field: str) -> CardType:
    """Return a type of the board, or 422 if `type_id` is anything else."""
    card_type = db.get(CardType, type_id)
    if card_type is None or card_type.board_id != board_id:
        raise invalid(f"{field} must be a card type of the same board")
    return card_type


def first_type(db: Session, board_id: uuid.UUID) -> CardType:
    query = select(CardType).where(CardType.board_id == board_id).order_by(CardType.sort_key)
    return db.scalars(query.limit(1)).one()


def create_card_type(db: Session, board: Board, name: str, color: str) -> CardType:
    _require_unique_name(db, board.id, name, exclude_id=None)
    last = db.scalar(select(func.max(CardType.sort_key)).where(CardType.board_id == board.id))
    card_type = CardType(board_id=board.id, name=name, color=color, sort_key=keys_after(last, 1)[0])
    db.add(card_type)
    db.flush()
    return card_type


def update_card_type(
    db: Session, card_type: CardType, name: str | None, color: str | None, version: int
) -> CardType:
    check_version(card_type.version, version)
    if name is not None:
        _require_unique_name(db, card_type.board_id, name, exclude_id=card_type.id)
        card_type.name = name
    if color is not None:
        card_type.color = color
    card_type.version += 1
    db.flush()
    return card_type


def delete_card_type(
    db: Session, card_type: CardType, version: int, replace_with: uuid.UUID | None
) -> None:
    check_version(card_type.version, version)
    db.execute(select(Board.id).where(Board.id == card_type.board_id).with_for_update())
    others = db.scalar(
        select(func.count()).where(
            CardType.board_id == card_type.board_id, CardType.id != card_type.id
        )
    )
    if others == 0:
        raise invalid("A board needs at least one card type")
    used_by = db.scalar(select(func.count()).where(Card.type_id == card_type.id))
    if used_by:
        _reassign_cards(db, card_type, replace_with)
    db.delete(card_type)
    db.flush()


def _reassign_cards(db: Session, card_type: CardType, replace_with: uuid.UUID | None) -> None:
    if replace_with is None:
        raise invalid("The type is in use: pass replace_with=<type id>")
    if replace_with == card_type.id:
        raise invalid("replace_with must be another type")
    replacement = type_in_board(db, card_type.board_id, replace_with, "replace_with")
    db.execute(
        update(Card)
        .where(Card.type_id == card_type.id)
        .values(type_id=replacement.id, version=Card.version + 1)
    )


def _require_unique_name(
    db: Session, board_id: uuid.UUID, name: str, exclude_id: uuid.UUID | None
) -> None:
    query = select(CardType.id).where(
        CardType.board_id == board_id, func.lower(CardType.name) == name.lower()
    )
    if exclude_id is not None:
        query = query.where(CardType.id != exclude_id)
    if db.scalar(query) is not None:
        raise invalid(f"A card type named {name!r} already exists in this board")
