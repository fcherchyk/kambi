"""Criteria 4 and 5: board creation with defaults, rename, list and delete."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.boards import service
from tests.helpers import TABLES, Api, count_rows, snapshot


def test_criterion_4_new_board_is_trimmed_and_gets_default_columns_and_type(api: Api) -> None:
    board = api.create_board("  Home ")

    assert board["name"] == "Home"
    assert board["version"] == 1
    detail = api.board(board["id"])
    assert [column["name"] for column in detail["columns"]] == ["To Do", "In Progress", "Done"]
    assert [(t["name"], t["color"]) for t in detail["card_types"]] == [("Task", "yellow")]
    assert detail["cards"] == []


def test_criterion_4_failed_seeding_leaves_no_rows(
    api: Api, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken_seed(*args: object) -> None:
        raise RuntimeError("forced seeding failure")

    monkeypatch.setattr(service, "seed_card_types", broken_seed)
    client = TestClient(api.client.app, raise_server_exceptions=False, cookies=api.client.cookies)

    response = client.post("/api/boards", json={"name": "Home"}, headers={"X-CSRF": "1"})

    assert response.status_code == 500
    for table in ("boards", "board_columns", "card_types"):
        assert count_rows(engine, table) == 0


def test_criterion_5_rename_increments_version(api: Api) -> None:
    board = api.create_board("Home")

    response = api.patch(f"/api/boards/{board['id']}", {"name": " Work ", "version": 1})

    assert response.status_code == 200
    assert response.json()["name"] == "Work"
    assert response.json()["version"] == 2
    assert api.board(board["id"])["name"] == "Work"


@pytest.mark.parametrize("name", ["", "   ", "x" * 101])
def test_criterion_5_invalid_board_names_return_422(api: Api, name: str) -> None:
    board = api.create_board("Home")

    assert api.post("/api/boards", {"name": name}).status_code == 422
    response = api.patch(f"/api/boards/{board['id']}", {"name": name, "version": 1})
    assert response.status_code == 422


def test_criterion_5_name_of_100_chars_after_trim_is_valid(api: Api) -> None:
    assert api.create_board("  " + "x" * 100 + "  ")["name"] == "x" * 100


def test_criterion_5_delete_removes_every_row_of_the_board(api: Api, engine: Engine) -> None:
    keep = api.create_board("Keep")
    board = api.create_board("Doomed")
    detail = api.board(board["id"])
    todo, doing, _ = detail["columns"]
    bug = api.add_type(board["id"], "Bug")
    api.add_card(todo["id"], "One", type_id=bug["id"])
    api.add_card(doing["id"], "Two")
    api.archive_column(doing)
    before = snapshot(engine)

    response = api.delete(f"/api/boards/{board['id']}", params={"version": 1})

    assert response.status_code == 204
    after = snapshot(engine)
    for table in TABLES[2:]:
        assert all(str(row.get("board_id", row["id"])) != board["id"] for row in after[table])
    assert len(after["board_columns"]) == 3
    assert len(after["card_types"]) == 1
    assert after["cards"] == []
    assert after["users"] == before["users"]
    assert api.get(f"/api/boards/{board['id']}").status_code == 404
    assert api.board(keep["id"])["name"] == "Keep"


def test_criterion_5_list_returns_only_the_callers_boards(api: Api, other_api: Api) -> None:
    mine = api.create_board("Mine")
    other_api.create_board("Theirs")

    response = api.get("/api/boards")

    assert response.status_code == 200
    assert [board["id"] for board in response.json()] == [mine["id"]]


def test_archive_of_a_board_without_archived_columns_is_empty(api: Api) -> None:
    board = api.create_board("Home")

    assert api.archive(board["id"]) == {"board_id": board["id"], "columns": []}


def test_openapi_schema_is_exposed(client: TestClient) -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert "/api/boards/{board_id}" in response.json()["paths"]
