"""S1_AC13 and S1_AC14: card types and their deletion."""

import pytest
from sqlalchemy import Engine

from app.schemas import PALETTE
from tests.helpers import Api, column_named, snapshot


@pytest.fixture
def board(api: Api) -> dict:
    return api.board(api.create_board("Home")["id"])


def test_S1_AC13_new_type_is_listed_after_task(api: Api, board: dict) -> None:
    created = api.add_type(board["id"], " Bug ", "red")

    assert created["name"] == "Bug"
    types = api.board(board["id"])["card_types"]
    assert [(t["name"], t["color"]) for t in types] == [("Task", "yellow"), ("Bug", "red")]


def test_S1_AC13_rename_and_recolor_are_reflected_in_the_board(api: Api, board: dict) -> None:
    bug = api.add_type(board["id"], "Bug", "red")

    renamed = api.patch(f"/api/card-types/{bug['id']}", {"name": "Defect", "version": 1})
    recolored = api.patch(f"/api/card-types/{bug['id']}", {"color": "purple", "version": 2})

    assert renamed.status_code == 200
    assert recolored.status_code == 200
    assert recolored.json()["version"] == 3
    types = api.board(board["id"])["card_types"]
    assert (types[1]["name"], types[1]["color"]) == ("Defect", "purple")


def test_S1_AC13_renaming_a_type_to_its_own_name_in_another_case_is_allowed(
    api: Api, board: dict
) -> None:
    task = board["card_types"][0]

    response = api.patch(f"/api/card-types/{task['id']}", {"name": "TASK", "version": 1})

    assert response.status_code == 200
    assert response.json()["name"] == "TASK"


def test_S1_AC13_every_palette_color_is_accepted(api: Api, board: dict) -> None:
    for index, color in enumerate(PALETTE):
        assert api.add_type(board["id"], f"Type {index}", color)["color"] == color


def test_S1_AC13_name_of_50_chars_is_accepted(api: Api, board: dict) -> None:
    created = api.add_type(board["id"], "x" * 50)
    assert created["name"] == "x" * 50


@pytest.mark.parametrize(
    "body",
    [
        {"name": "Bug", "color": "#ff0000"},
        {"name": "Bug", "color": "magenta"},
        {"name": "", "color": "red"},
        {"name": "x" * 51, "color": "red"},
        {"name": "task", "color": "red"},
        {"name": " TASK ", "color": "red"},
    ],
)
def test_S1_AC13_invalid_types_return_422(
    api: Api, board: dict, body: dict, engine: Engine
) -> None:
    before = snapshot(engine)

    assert api.post(f"/api/boards/{board['id']}/card-types", body).status_code == 422
    assert snapshot(engine) == before


@pytest.mark.parametrize(
    "body",
    [{"name": "task"}, {"name": ""}, {"name": "x" * 51}, {"color": "#000"}],
)
def test_S1_AC13_invalid_type_updates_return_422(api: Api, board: dict, body: dict) -> None:
    bug = api.add_type(board["id"], "Bug")

    response = api.patch(f"/api/card-types/{bug['id']}", {**body, "version": 1})

    assert response.status_code == 422


@pytest.fixture
def bug_setup(api: Api, board: dict) -> dict:
    bug = api.add_type(board["id"], "Bug", "red")
    todo = column_named(board, "To Do")
    doing = column_named(board, "In Progress")
    active_card = api.add_card(todo["id"], "Active bug", type_id=bug["id"])
    archived_card = api.add_card(doing["id"], "Archived bug", type_id=bug["id"])
    api.archive_column(doing)
    return {
        "board": board,
        "bug": bug,
        "task": board["card_types"][0],
        "cards": [active_card, archived_card],
    }


def test_S1_AC14_delete_with_replacement_reassigns_every_card(api: Api, bug_setup: dict) -> None:
    board_id = bug_setup["board"]["id"]
    bug, task = bug_setup["bug"], bug_setup["task"]

    response = api.delete(
        f"/api/card-types/{bug['id']}", params={"version": 1, "replace_with": task["id"]}
    )

    assert response.status_code == 204
    detail = api.board(board_id)
    assert [t["name"] for t in detail["card_types"]] == ["Task"]
    archived_cards = api.archive(board_id)["columns"][0]["cards"]
    for card in detail["cards"] + archived_cards:
        assert card["type_id"] == task["id"]
        assert card["version"] == 2


def test_S1_AC14_invalid_type_deletions_return_422_and_change_nothing(
    api: Api, bug_setup: dict, other_api: Api, engine: Engine
) -> None:
    bug = bug_setup["bug"]
    foreign_type = other_api.board(other_api.create_board("Other")["id"])["card_types"][0]
    url = f"/api/card-types/{bug['id']}"
    before = snapshot(engine)

    for params in (
        {"version": 1},
        {"version": 1, "replace_with": bug["id"]},
        {"version": 1, "replace_with": foreign_type["id"]},
    ):
        assert api.delete(url, params=params).status_code == 422, params
    assert snapshot(engine) == before


def test_S1_AC14_the_last_type_cannot_be_deleted(api: Api, board: dict, engine: Engine) -> None:
    task = board["card_types"][0]
    before = snapshot(engine)

    response = api.delete(f"/api/card-types/{task['id']}", params={"version": 1})

    assert response.status_code == 422
    assert snapshot(engine) == before


def test_S1_AC14_last_type_cannot_be_deleted_even_with_replace_with(
    api: Api, board: dict, engine: Engine
) -> None:
    task = board["card_types"][0]
    before = snapshot(engine)

    response = api.delete(
        f"/api/card-types/{task['id']}",
        params={"version": 1, "replace_with": task["id"]},
    )

    assert response.status_code == 422
    assert snapshot(engine) == before


def test_S1_AC14_unused_type_is_deleted_without_parameters(api: Api, board: dict) -> None:
    bug = api.add_type(board["id"], "Bug")

    assert api.delete(f"/api/card-types/{bug['id']}", params={"version": 1}).status_code == 204
    assert [t["name"] for t in api.board(board["id"])["card_types"]] == ["Task"]
