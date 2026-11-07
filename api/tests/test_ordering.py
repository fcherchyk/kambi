"""Criterion 8: fractional sort keys, checked in Python and in PostgreSQL's text order."""

import random

import pytest
from sqlalchemy import Engine, text

from app.ordering import DIGITS, key_after_anchor, key_between, keys_after
from tests.helpers import Api, snapshot


def pg_sorted(engine: Engine, keys: list[str]) -> list[str]:
    """Sort keys the way the sort_key columns do (collation "C")."""
    with engine.connect() as connection:
        rows = connection.execute(
            text('SELECT k FROM unnest(CAST(:keys AS text[])) AS k ORDER BY k COLLATE "C"'),
            {"keys": keys},
        )
        return list(rows.scalars())


def test_criterion_8_key_between_sorts_strictly_between_neighbors() -> None:
    first = key_between(None, None)
    before = key_between(None, first)
    after = key_between(first, None)
    middle = key_between(first, after)

    assert before < first < middle < after
    assert all(not key.endswith(DIGITS[0]) for key in (first, before, after, middle))


@pytest.mark.parametrize("position", ["first", "last", "same-gap-low", "same-gap-high"])
def test_criterion_8_fifty_inserts_at_the_same_position(position: str) -> None:
    low, high = "V", "W"
    keys = [low, high]
    for _ in range(50):
        if position == "first":
            new = key_between(None, keys[0])
            keys.insert(0, new)
        elif position == "last":
            new = key_between(keys[-1], None)
            keys.append(new)
        elif position == "same-gap-low":
            index = keys.index(low)
            new = key_between(low, keys[index + 1])
            keys.insert(index + 1, new)
        else:
            index = keys.index(high)
            new = key_between(keys[index - 1], high)
            keys.insert(index, new)

    assert keys == sorted(keys)
    assert len(set(keys)) == len(keys)


def test_criterion_8_random_inserts_match_postgres_c_collation(engine: Engine) -> None:
    rng = random.Random(42)
    keys: list[str] = []
    for _ in range(300):
        index = rng.randint(0, len(keys))
        before = keys[index - 1] if index > 0 else None
        after = keys[index] if index < len(keys) else None
        new = key_between(before, after)
        assert (before is None or before < new) and (after is None or new < after)
        keys.insert(index, new)

    shuffled = keys[:]
    rng.shuffle(shuffled)
    assert pg_sorted(engine, shuffled) == keys


def test_criterion_8_sort_key_columns_use_the_c_collation(engine: Engine) -> None:
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT table_name, collation_name FROM information_schema.columns "
                "WHERE column_name = 'sort_key' ORDER BY table_name"
            )
        ).all()

    assert rows == [("board_columns", "C"), ("card_types", "C"), ("cards", "C")]


def test_criterion_8_keys_after_and_anchor_helpers() -> None:
    keys = keys_after(None, 5)
    assert keys == sorted(keys) and len(set(keys)) == 5
    assert key_after_anchor([], None) == key_between(None, None)
    assert key_after_anchor(keys, None) < keys[0]
    assert keys[1] < key_after_anchor(keys, keys[1]) < keys[2]
    assert key_after_anchor(keys, keys[-1]) > keys[-1]


@pytest.mark.parametrize(
    ("before", "after"),
    [("b", "a"), ("a", "a"), ("", None), ("a0", None), ("a-", None)],
)
def test_criterion_8_invalid_keys_are_rejected(before: str, after: str | None) -> None:
    with pytest.raises(ValueError):
        key_between(before, after)


def test_criterion_8_moving_a_column_changes_exactly_one_row(api: Api, engine: Engine) -> None:
    board = api.board(api.create_board("Home")["id"])
    todo, _, done = board["columns"]
    before = snapshot(engine)

    response = api.post(f"/api/columns/{done['id']}/move", {"after_id": None, "version": 1})

    assert response.status_code == 200
    after = snapshot(engine)
    changed = [row for row in after["board_columns"] if row not in before["board_columns"]]
    assert [str(row["id"]) for row in changed] == [done["id"]]
    assert changed[0]["sort_key"] < todo["sort_key"]
    assert after["cards"] == before["cards"]
