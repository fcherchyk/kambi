"""S1_AC15 to S1_AC17: the card lifecycle and moves between any columns."""

import pytest
from sqlalchemy import Engine

from tests.helpers import Api, cards_in, column_named, snapshot


@pytest.fixture
def board(api: Api) -> dict:
    return api.board(api.create_board("Home")["id"])


def test_S1_AC15_new_card_is_trimmed_and_appended_with_the_first_type(
    api: Api, board: dict
) -> None:
    todo = column_named(board, "To Do")
    api.add_type(board["id"], "Bug")
    first = api.add_card(todo["id"], "First")

    card = api.add_card(todo["id"], " Buy milk ")

    assert card["title"] == "Buy milk"
    assert card["description"] == ""
    assert card["type_id"] == board["card_types"][0]["id"]
    assert card["version"] == 1
    titles = [c["title"] for c in cards_in(api.board(board["id"]), todo["id"])]
    assert titles == [first["title"], "Buy milk"]


def test_S1_AC15_edit_persists_title_description_and_type(api: Api, board: dict) -> None:
    todo = column_named(board, "To Do")
    bug = api.add_type(board["id"], "Bug")
    card = api.add_card(todo["id"], "Card")

    response = api.patch(
        f"/api/cards/{card['id']}",
        {"title": " Renamed ", "description": "Line 1\nLine 2", "type_id": bug["id"], "version": 1},
    )

    assert response.status_code == 200
    saved = api.board(board["id"])["cards"][0]
    assert saved["title"] == "Renamed"
    assert saved["description"] == "Line 1\nLine 2"
    assert saved["type_id"] == bug["id"]
    assert saved["version"] == 2


@pytest.mark.parametrize(
    "body",
    [
        {"title": ""},
        {"title": "   "},
        {"title": "x" * 201},
        {"title": "ok", "description": "x" * 10_001},
    ],
)
def test_S1_AC15_invalid_cards_return_422(api: Api, board: dict, body: dict) -> None:
    todo = column_named(board, "To Do")
    card = api.add_card(todo["id"], "Card")

    assert api.post(f"/api/columns/{todo['id']}/cards", body).status_code == 422
    patch = api.patch(f"/api/cards/{card['id']}", {**body, "version": 1})
    assert patch.status_code == 422


def test_S1_AC15_limits_are_inclusive(api: Api, board: dict) -> None:
    todo = column_named(board, "To Do")

    card = api.add_card(todo["id"], "x" * 200, description="y" * 10_000)

    assert len(card["title"]) == 200
    assert len(card["description"]) == 10_000


def test_S1_AC15_type_from_another_board_returns_422(api: Api, board: dict, engine: Engine) -> None:
    other_board = api.board(api.create_board("Other")["id"])
    foreign_type = other_board["card_types"][0]["id"]
    todo = column_named(board, "To Do")
    card = api.add_card(todo["id"], "Card")
    before = snapshot(engine)

    created = api.post(f"/api/columns/{todo['id']}/cards", {"title": "x", "type_id": foreign_type})
    edited = api.patch(f"/api/cards/{card['id']}", {"type_id": foreign_type, "version": 1})

    assert created.status_code == 422
    assert edited.status_code == 422
    assert snapshot(engine) == before


def test_S1_AC15_unknown_type_id_returns_422(api: Api, board: dict, engine: Engine) -> None:
    unknown_type = "00000000-0000-0000-0000-000000000000"
    todo = column_named(board, "To Do")
    card = api.add_card(todo["id"], "Card")
    before = snapshot(engine)

    created = api.post(f"/api/columns/{todo['id']}/cards", {"title": "x", "type_id": unknown_type})
    edited = api.patch(f"/api/cards/{card['id']}", {"type_id": unknown_type, "version": 1})

    assert created.status_code == 422
    assert edited.status_code == 422
    assert snapshot(engine) == before


def test_S1_AC17_html_in_titles_is_stored_unchanged(api: Api, board: dict) -> None:
    todo = column_named(board, "To Do")
    title = "<script>alert('x')</script>"

    api.add_card(todo["id"], title, description="<b>bold</b>")

    saved = api.board(board["id"])["cards"][0]
    assert saved["title"] == title
    assert saved["description"] == "<b>bold</b>"


def test_S1_AC15_delete_removes_the_card(api: Api, board: dict) -> None:
    todo = column_named(board, "To Do")
    card = api.add_card(todo["id"], "Card")

    assert api.delete(f"/api/cards/{card['id']}", params={"version": 1}).status_code == 204
    assert api.board(board["id"])["cards"] == []
    assert api.patch(f"/api/cards/{card['id']}", {"title": "x", "version": 1}).status_code == 404


@pytest.fixture
def move_setup(api: Api, board: dict) -> dict:
    todo = column_named(board, "To Do")
    done = column_named(board, "Done")
    a, b, c = (api.add_card(done["id"], title) for title in "abc")
    x = api.add_card(todo["id"], "x")
    return {"board": board, "todo": todo, "done": done, "a": a, "b": b, "c": c, "x": x}


def test_S1_AC16_move_after_a_card_updates_only_the_moved_row(
    api: Api, move_setup: dict, engine: Engine
) -> None:
    x, a, done = move_setup["x"], move_setup["a"], move_setup["done"]
    before = snapshot(engine)

    response = api.post(
        f"/api/cards/{x['id']}/move", {"column_id": done["id"], "after_id": a["id"], "version": 1}
    )

    assert response.status_code == 200
    detail = api.board(move_setup["board"]["id"])
    assert [card["title"] for card in cards_in(detail, done["id"])] == ["a", "x", "b", "c"]
    after = snapshot(engine)
    changed = [row for row in after["cards"] if row not in before["cards"]]
    assert [str(row["id"]) for row in changed] == [x["id"]]
    old = next(row for row in before["cards"] if str(row["id"]) == x["id"])
    changed_fields = {k for k in old if old[k] != changed[0][k]}
    assert changed_fields == {"sort_key", "column_id", "version", "updated_at"}
    assert {k: v for k, v in after.items() if k != "cards"} == {
        k: v for k, v in before.items() if k != "cards"
    }


def test_S1_AC16_moves_need_no_flow_validation(api: Api, move_setup: dict) -> None:
    board = move_setup["board"]
    c, todo = move_setup["c"], move_setup["todo"]
    new_column = api.add_column(board["id"], "Brand new")

    backward = api.post(
        f"/api/cards/{c['id']}/move", {"column_id": todo["id"], "after_id": None, "version": 1}
    )
    to_new = api.post(
        f"/api/cards/{c['id']}/move",
        {"column_id": new_column["id"], "after_id": None, "version": 2},
    )

    assert backward.status_code == 200
    assert to_new.status_code == 200
    detail = api.board(board["id"])
    assert [card["title"] for card in cards_in(detail, new_column["id"])] == ["c"]


def test_S1_AC16_move_first_and_within_the_same_column(api: Api, move_setup: dict) -> None:
    c, done = move_setup["c"], move_setup["done"]

    first = api.post(
        f"/api/cards/{c['id']}/move", {"column_id": done["id"], "after_id": None, "version": 1}
    )
    after_b = api.post(
        f"/api/cards/{c['id']}/move",
        {"column_id": done["id"], "after_id": move_setup["b"]["id"], "version": 2},
    )

    assert first.status_code == 200
    assert after_b.status_code == 200
    detail = api.board(move_setup["board"]["id"])
    assert [card["title"] for card in cards_in(detail, done["id"])] == ["a", "b", "c"]


def test_S1_AC16_after_id_outside_the_target_column_returns_422(
    api: Api, move_setup: dict, engine: Engine
) -> None:
    x, done, todo = move_setup["x"], move_setup["done"], move_setup["todo"]
    url = f"/api/cards/{x['id']}/move"
    before = snapshot(engine)

    wrong_column = api.post(
        url, {"column_id": todo["id"], "after_id": move_setup["a"]["id"], "version": 1}
    )
    itself = api.post(url, {"column_id": done["id"], "after_id": x["id"], "version": 1})

    assert wrong_column.status_code == 422
    assert itself.status_code == 422
    assert snapshot(engine) == before


def test_S1_AC16_move_to_empty_column_with_null_after_id(api: Api, board: dict) -> None:
    todo = column_named(board, "To Do")
    done = column_named(board, "Done")
    c = api.add_card(todo["id"], "Card")

    response = api.post(
        f"/api/cards/{c['id']}/move",
        {"column_id": done["id"], "after_id": None, "version": 1},
    )

    assert response.status_code == 200
    detail = api.board(board["id"])
    assert [card["title"] for card in cards_in(detail, done["id"])] == ["Card"]
    assert cards_in(detail, todo["id"]) == []


def test_S1_AC16_move_to_unknown_column_returns_422(
    api: Api, move_setup: dict, engine: Engine
) -> None:
    x = move_setup["x"]
    unknown_col = "00000000-0000-0000-0000-000000000000"
    before = snapshot(engine)

    response = api.post(
        f"/api/cards/{x['id']}/move",
        {"column_id": unknown_col, "after_id": None, "version": 1},
    )

    assert response.status_code == 422
    assert snapshot(engine) == before
