"""Initial schema: users, sessions, boards, columns, card types and cards.

Revision ID: 0001
Revises:
Create Date: 2026-11-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def _sort_key() -> sa.Column:
    # Fractional keys compare byte by byte: they need the "C" collation.
    return sa.Column("sort_key", sa.String(collation="C"), nullable=False)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("google_sub", sa.String(255), nullable=False, unique=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("settings", postgresql.JSONB(), nullable=False),
        *_timestamps(),
    )
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "boards",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_boards_owner_created", "boards", ["owner_id", "created_at"])
    op.create_table(
        "board_columns",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "board_id", sa.Uuid(), sa.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("name", sa.String(100), nullable=False),
        _sort_key(),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        *_timestamps(),
    )
    op.create_index(
        "ix_board_columns_board_archived_sort",
        "board_columns",
        ["board_id", "archived_at", "sort_key"],
    )
    op.create_table(
        "card_types",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "board_id", sa.Uuid(), sa.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("color", sa.String(32), nullable=False),
        _sort_key(),
        sa.Column("version", sa.Integer(), nullable=False),
        *_timestamps(),
    )
    op.create_index(
        "uq_card_types_board_name",
        "card_types",
        ["board_id", sa.text("lower(name)")],
        unique=True,
    )
    op.create_table(
        "cards",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "board_id", sa.Uuid(), sa.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False
        ),
        # No ON DELETE action: the services move or delete cards explicitly first.
        sa.Column("column_id", sa.Uuid(), sa.ForeignKey("board_columns.id"), nullable=False),
        sa.Column("type_id", sa.Uuid(), sa.ForeignKey("card_types.id"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        _sort_key(),
        sa.Column("props", postgresql.JSONB(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_cards_column_sort", "cards", ["column_id", "sort_key"])


def downgrade() -> None:
    op.drop_table("cards")
    op.drop_table("card_types")
    op.drop_table("board_columns")
    op.drop_table("boards")
    op.drop_table("sessions")
    op.drop_table("users")
