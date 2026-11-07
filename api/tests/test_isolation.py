"""Criterion 6: one user can never read or change another user's data."""

from collections.abc import Callable

import pytest
from httpx import Response
from sqlalchemy import Engine

from tests.helpers import Api, snapshot


@pytest.fixture
def world(api: Api, other_api: Api) -> dict:
    """User A's board (the victim) and user B's board (the attacker's own)."""
    a_board = api.board(api.create_board("A")["id"])
    a_column, a_spare, _ = a_board["columns"]
    a_type = a_board["card_types"][0]
    a_card = api.add_card(a_column["id"], "A card")
    a_archived = api.archive_column(a_spare)

    b_board = other_api.board(other_api.create_board("B")["id"])
    b_column, b_other, _ = b_board["columns"]
    b_task = b_board["card_types"][0]
    b_bug = other_api.add_type(b_board["id"], "Bug")
    b_card = other_api.add_card(b_column["id"], "B card", type_id=b_bug["id"])
    return {
        "a_board": a_board["id"],
        "a_column": a_column["id"],
        "a_archived": a_archived["id"],
        "a_type": a_type["id"],
        "a_card": a_card["id"],
        "b_board": b_board["id"],
        "b_column": b_column["id"],
        "b_other": b_other["id"],
        "b_task": b_task["id"],
        "b_bug": b_bug["id"],
        "b_card": b_card["id"],
    }


Request = Callable[[Api, dict], Response]

FOREIGN_PATH_REQUESTS: dict[str, Request] = {
    "read board": lambda b, w: b.get(f"/api/boards/{w['a_board']}"),
    "read archive": lambda b, w: b.get(f"/api/boards/{w['a_board']}/archive"),
    "rename board": lambda b, w: b.patch(
        f"/api/boards/{w['a_board']}", {"name": "x", "version": 1}
    ),
    "delete board": lambda b, w: b.delete(f"/api/boards/{w['a_board']}", params={"version": 1}),
    "create column": lambda b, w: b.post(f"/api/boards/{w['a_board']}/columns", {"name": "x"}),
    "rename column": lambda b, w: b.patch(
        f"/api/columns/{w['a_column']}", {"name": "x", "version": 1}
    ),
    "move column": lambda b, w: b.post(
        f"/api/columns/{w['a_column']}/move", {"after_id": None, "version": 1}
    ),
    "archive column": lambda b, w: b.post(f"/api/columns/{w['a_column']}/archive", {"version": 1}),
    "restore column": lambda b, w: b.post(
        f"/api/columns/{w['a_archived']}/restore", {"version": 2}
    ),
    "delete column": lambda b, w: b.delete(
        f"/api/columns/{w['a_column']}", params={"version": 1, "cards": "delete"}
    ),
    "create type": lambda b, w: b.post(
        f"/api/boards/{w['a_board']}/card-types", {"name": "x", "color": "red"}
    ),
    "edit type": lambda b, w: b.patch(
        f"/api/card-types/{w['a_type']}", {"name": "x", "version": 1}
    ),
    "delete type": lambda b, w: b.delete(f"/api/card-types/{w['a_type']}", params={"version": 1}),
    "create card": lambda b, w: b.post(f"/api/columns/{w['a_column']}/cards", {"title": "x"}),
    "edit card": lambda b, w: b.patch(f"/api/cards/{w['a_card']}", {"title": "x", "version": 1}),
    "move card": lambda b, w: b.post(
        f"/api/cards/{w['a_card']}/move",
        {"column_id": w["a_column"], "after_id": None, "version": 1},
    ),
    "delete card": lambda b, w: b.delete(f"/api/cards/{w['a_card']}", params={"version": 1}),
}

FOREIGN_REFERENCE_REQUESTS: dict[str, Request] = {
    "column after_id": lambda b, w: b.post(
        f"/api/boards/{w['b_board']}/columns", {"name": "x", "after_id": w["a_column"]}
    ),
    "move column after_id": lambda b, w: b.post(
        f"/api/columns/{w['b_other']}/move", {"after_id": w["a_column"], "version": 1}
    ),
    "delete column target": lambda b, w: b.delete(
        f"/api/columns/{w['b_column']}",
        params={"version": 1, "cards": "move", "target": w["a_column"]},
    ),
    "delete type replace_with": lambda b, w: b.delete(
        f"/api/card-types/{w['b_bug']}", params={"version": 1, "replace_with": w["a_type"]}
    ),
    "create card type_id": lambda b, w: b.post(
        f"/api/columns/{w['b_column']}/cards", {"title": "x", "type_id": w["a_type"]}
    ),
    "edit card type_id": lambda b, w: b.patch(
        f"/api/cards/{w['b_card']}", {"type_id": w["a_type"], "version": 1}
    ),
    "move card column_id": lambda b, w: b.post(
        f"/api/cards/{w['b_card']}/move",
        {"column_id": w["a_column"], "after_id": None, "version": 1},
    ),
    "move card after_id": lambda b, w: b.post(
        f"/api/cards/{w['b_card']}/move",
        {"column_id": w["b_column"], "after_id": w["a_card"], "version": 1},
    ),
}


@pytest.mark.parametrize("name", FOREIGN_PATH_REQUESTS)
def test_criterion_6_foreign_entities_in_the_path_return_404(
    name: str, world: dict, other_api: Api, engine: Engine
) -> None:
    before = snapshot(engine)

    response = FOREIGN_PATH_REQUESTS[name](other_api, world)

    assert response.status_code == 404, response.text
    assert snapshot(engine) == before


@pytest.mark.parametrize("name", FOREIGN_REFERENCE_REQUESTS)
def test_criterion_6_foreign_ids_in_body_or_query_return_422(
    name: str, world: dict, other_api: Api, engine: Engine
) -> None:
    before = snapshot(engine)

    response = FOREIGN_REFERENCE_REQUESTS[name](other_api, world)

    assert response.status_code == 422, response.text
    assert snapshot(engine) == before
