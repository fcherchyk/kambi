"""S1_AC9 to S1_AC12: columns created, renamed, moved, archived, restored and deleted."""

import pytest
from sqlalchemy import Engine

from tests.helpers import Api, cards_in, column_named, snapshot


@pytest.fixture
def board(api: Api) -> dict:
    return api.board(api.create_board("Home")["id"])


def names(board: dict) -> list[str]:
    return [column["name"] for column in board["columns"]]


def test_S1_AC9_column_created_after_to_do_is_second(api: Api, board: dict) -> None:
    todo = column_named(board, "To Do")

    api.add_column(board["id"], "Review", after_id=todo["id"])

    assert names(api.board(board["id"])) == ["To Do", "Review", "In Progress", "Done"]


def test_S1_AC9_column_without_after_id_is_appended_and_null_is_first(
    api: Api, board: dict
) -> None:
    api.add_column(board["id"], "Last")
    api.add_column(board["id"], "First", after_id=None)

    assert names(api.board(board["id"])) == ["First", "To Do", "In Progress", "Done", "Last"]


def test_S1_AC9_rename_follows_the_name_rule(api: Api, board: dict) -> None:
    todo = column_named(board, "To Do")
    url = f"/api/columns/{todo['id']}"

    assert api.patch(url, {"name": "", "version": 1}).status_code == 422
    assert api.patch(url, {"name": "x" * 101, "version": 1}).status_code == 422
    response = api.patch(url, {"name": "  Backlog ", "version": 1})

    assert response.status_code == 200
    assert response.json()["name"] == "Backlog"
    assert response.json()["version"] == 2
    assert names(api.board(board["id"]))[0] == "Backlog"


@pytest.mark.parametrize("name", ["", "   ", "x" * 101])
def test_S1_AC9_invalid_column_names_return_422(api: Api, board: dict, name: str) -> None:
    assert api.post(f"/api/boards/{board['id']}/columns", {"name": name}).status_code == 422


def test_S1_AC9_name_of_100_chars_after_trim_is_valid(api: Api, board: dict) -> None:
    created = api.add_column(board["id"], "  " + "x" * 100 + "  ")
    assert created["name"] == "x" * 100


def test_S1_AC9_move_to_the_end_persists(api: Api, board: dict) -> None:
    todo = column_named(board, "To Do")
    done = column_named(board, "Done")

    response = api.post(f"/api/columns/{todo['id']}/move", {"after_id": done["id"], "version": 1})

    assert response.status_code == 200
    assert names(api.board(board["id"])) == ["In Progress", "Done", "To Do"]


def test_S1_AC9_move_after_itself_or_unknown_column_returns_422(
    api: Api, board: dict, engine: Engine
) -> None:
    todo = column_named(board, "To Do")
    url = f"/api/columns/{todo['id']}/move"
    before = snapshot(engine)

    assert api.post(url, {"after_id": todo["id"], "version": 1}).status_code == 422
    unknown = "00000000-0000-0000-0000-000000000000"
    assert api.post(url, {"after_id": unknown, "version": 1}).status_code == 422
    assert snapshot(engine) == before


@pytest.fixture
def archived_setup(api: Api, board: dict) -> dict:
    doing = column_named(board, "In Progress")
    first = api.add_card(doing["id"], "First", description="one")
    second = api.add_card(doing["id"], "Second")
    archived = api.archive_column(doing)
    return {"column": archived, "cards": [first, second], "board": board}


def test_S1_AC10_archived_column_and_cards_move_to_the_archive(
    api: Api, archived_setup: dict
) -> None:
    board_id = archived_setup["board"]["id"]
    column = archived_setup["column"]

    detail = api.board(board_id)
    assert column["id"] not in [c["id"] for c in detail["columns"]]
    assert detail["cards"] == []
    archive = api.archive(board_id)
    assert [c["id"] for c in archive["columns"]] == [column["id"]]
    assert [card["title"] for card in archive["columns"][0]["cards"]] == ["First", "Second"]
    assert archive["columns"][0]["archived_at"] is not None


def test_S1_AC10_cards_in_an_archived_column_are_read_only(
    api: Api, archived_setup: dict, engine: Engine
) -> None:
    board = archived_setup["board"]
    column = archived_setup["column"]
    card = archived_setup["cards"][0]
    todo = column_named(board, "To Do")
    other = api.add_card(todo["id"], "Active")
    before = snapshot(engine)

    responses = [
        api.patch(f"/api/cards/{card['id']}", {"title": "x", "version": 1}),
        api.post(
            f"/api/cards/{card['id']}/move",
            {"column_id": todo["id"], "after_id": None, "version": 1},
        ),
        api.delete(f"/api/cards/{card['id']}", params={"version": 1}),
        api.post(f"/api/columns/{column['id']}/cards", {"title": "New"}),
        api.post(
            f"/api/cards/{other['id']}/move",
            {"column_id": column["id"], "after_id": None, "version": 1},
        ),
        api.patch(f"/api/columns/{column['id']}", {"name": "x", "version": column["version"]}),
        api.post(
            f"/api/columns/{column['id']}/move", {"after_id": None, "version": column["version"]}
        ),
        api.post(f"/api/columns/{column['id']}/archive", {"version": column["version"]}),
        api.post(f"/api/columns/{todo['id']}/move", {"after_id": column["id"], "version": 1}),
    ]

    assert [response.status_code for response in responses] == [422] * len(responses)
    assert snapshot(engine) == before


def test_S1_AC10_restore_brings_back_column_and_cards_untouched(
    api: Api, archived_setup: dict
) -> None:
    board_id = archived_setup["board"]["id"]
    column = archived_setup["column"]
    original = column_named(archived_setup["board"], "In Progress")

    response = api.post(f"/api/columns/{column['id']}/restore", {"version": column["version"]})

    assert response.status_code == 200
    assert response.json()["sort_key"] == original["sort_key"]
    detail = api.board(board_id)
    assert names(detail) == ["To Do", "In Progress", "Done"]
    keys = ("id", "title", "description", "type_id", "sort_key", "version")
    restored = [{k: card[k] for k in keys} for card in cards_in(detail, column["id"])]
    assert restored == [{k: card[k] for k in keys} for card in archived_setup["cards"]]
    assert api.archive(board_id)["columns"] == []


def test_S1_AC10_restoring_an_active_column_returns_422(api: Api, board: dict) -> None:
    todo = column_named(board, "To Do")

    assert api.post(f"/api/columns/{todo['id']}/restore", {"version": 1}).status_code == 422


def test_S1_AC10_creating_column_after_archived_column_returns_422(
    api: Api, archived_setup: dict
) -> None:
    board_id = archived_setup["board"]["id"]
    column = archived_setup["column"]

    response = api.post(
        f"/api/boards/{board_id}/columns", {"name": "New", "after_id": column["id"]}
    )

    assert response.status_code == 422


def test_S1_AC10_new_columns_never_reuse_an_archived_columns_key(api: Api, board: dict) -> None:
    doing = column_named(board, "In Progress")
    todo = column_named(board, "To Do")
    archived = api.archive_column(doing)
    created = api.add_column(board["id"], "Between", after_id=todo["id"])
    api.post(f"/api/columns/{archived['id']}/restore", {"version": archived["version"]})

    assert created["sort_key"] != doing["sort_key"]
    assert names(api.board(board["id"])) == ["To Do", "Between", "In Progress", "Done"]


@pytest.fixture
def delete_setup(api: Api, board: dict) -> dict:
    todo = column_named(board, "To Do")
    done = column_named(board, "Done")
    moving = [api.add_card(todo["id"], title) for title in ("A", "B", "C")]
    existing = api.add_card(done["id"], "Existing")
    return {"board": board, "column": todo, "target": done, "cards": moving, "existing": existing}


def test_S1_AC11_delete_moves_cards_to_the_end_of_target(api: Api, delete_setup: dict) -> None:
    column, target = delete_setup["column"], delete_setup["target"]

    response = api.delete(
        f"/api/columns/{column['id']}",
        params={"version": 1, "cards": "move", "target": target["id"]},
    )

    assert response.status_code == 204
    detail = api.board(delete_setup["board"]["id"])
    assert column["id"] not in [c["id"] for c in detail["columns"]]
    titles = [card["title"] for card in cards_in(detail, target["id"])]
    assert titles == ["Existing", "A", "B", "C"]


def test_S1_AC11_delete_with_cards_delete_removes_them(
    api: Api, delete_setup: dict, engine: Engine
) -> None:
    column = delete_setup["column"]

    response = api.delete(f"/api/columns/{column['id']}", params={"version": 1, "cards": "delete"})

    assert response.status_code == 204
    after = snapshot(engine)
    assert column["id"] not in [str(row["id"]) for row in after["board_columns"]]
    assert [row["title"] for row in after["cards"]] == ["Existing"]


def test_S1_AC11_invalid_delete_requests_return_422_and_change_nothing(
    api: Api, delete_setup: dict, engine: Engine, other_api: Api
) -> None:
    board = delete_setup["board"]
    column = delete_setup["column"]
    doing = column_named(board, "In Progress")
    archived = api.archive_column(doing)
    foreign_board = other_api.board(other_api.create_board("Other")["id"])
    foreign = foreign_board["columns"][0]
    url = f"/api/columns/{column['id']}"
    before = snapshot(engine)

    invalid_params = [
        {"version": 1},
        {"version": 1, "cards": "move"},
        {"version": 1, "cards": "move", "target": column["id"]},
        {"version": 1, "cards": "move", "target": archived["id"]},
        {"version": 1, "cards": "move", "target": foreign["id"]},
        {"version": 1, "cards": "explode"},
    ]
    for params in invalid_params:
        assert api.delete(url, params=params).status_code == 422, params
    assert snapshot(engine) == before


def test_S1_AC11_empty_column_is_deleted_without_parameters(api: Api, board: dict) -> None:
    doing = column_named(board, "In Progress")

    response = api.delete(f"/api/columns/{doing['id']}", params={"version": 1})

    assert response.status_code == 204
    assert names(api.board(board["id"])) == ["To Do", "Done"]


def test_S1_AC11_archived_column_can_be_deleted_from_the_archive(api: Api, board: dict) -> None:
    doing = column_named(board, "In Progress")
    api.add_card(doing["id"], "Old")
    archived = api.archive_column(doing)

    response = api.delete(
        f"/api/columns/{archived['id']}",
        params={"version": archived["version"], "cards": "delete"},
    )

    assert response.status_code == 204
    assert api.archive(board["id"])["columns"] == []


def test_S1_AC12_last_active_column_cannot_be_deleted_or_archived(
    api: Api, board: dict, engine: Engine
) -> None:
    todo, doing, done = board["columns"]
    api.delete(f"/api/columns/{doing['id']}", params={"version": 1})
    api.archive_column(done)
    before = snapshot(engine)

    deleted = api.delete(f"/api/columns/{todo['id']}", params={"version": 1})
    archived = api.post(f"/api/columns/{todo['id']}/archive", {"version": 1})

    assert deleted.status_code == 422
    assert archived.status_code == 422
    assert snapshot(engine) == before
