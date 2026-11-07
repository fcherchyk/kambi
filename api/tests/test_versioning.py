"""Criterion 7: a stale `version` returns 409 and changes nothing."""

from collections.abc import Callable

import pytest
from httpx import Response
from sqlalchemy import Engine

from tests.helpers import Api, snapshot


def bump(api: Api, entity: str, ids: dict) -> None:
    """Raise the entity to version 2, so version 1 becomes stale."""
    urls = {
        "board": (f"/api/boards/{ids['board']}", {"name": "Renamed", "version": 1}),
        "column": (f"/api/columns/{ids['column']}", {"name": "Renamed", "version": 1}),
        "type": (f"/api/card-types/{ids['type']}", {"name": "Renamed", "version": 1}),
        "card": (f"/api/cards/{ids['card']}", {"title": "Renamed", "version": 1}),
    }
    url, body = urls[entity]
    assert api.patch(url, body).status_code == 200


@pytest.fixture
def ids(api: Api) -> dict:
    board = api.board(api.create_board("Home")["id"])
    column, _, done = board["columns"]
    bug = api.add_type(board["id"], "Bug")
    card = api.add_card(column["id"], "Card", type_id=bug["id"])
    return {
        "board": board["id"],
        "column": column["id"],
        "done": done["id"],
        "type": bug["id"],
        "task": board["card_types"][0]["id"],
        "card": card["id"],
    }


Mutation = Callable[[Api, dict, int], Response]

MUTATIONS: dict[tuple[str, str], Mutation] = {
    ("board", "rename"): lambda a, i, v: a.patch(
        f"/api/boards/{i['board']}", {"name": "New", "version": v}
    ),
    ("board", "delete"): lambda a, i, v: a.delete(
        f"/api/boards/{i['board']}", params={"version": v}
    ),
    ("column", "rename"): lambda a, i, v: a.patch(
        f"/api/columns/{i['column']}", {"name": "New", "version": v}
    ),
    ("column", "move"): lambda a, i, v: a.post(
        f"/api/columns/{i['column']}/move", {"after_id": i["done"], "version": v}
    ),
    ("column", "archive"): lambda a, i, v: a.post(
        f"/api/columns/{i['column']}/archive", {"version": v}
    ),
    ("column", "delete"): lambda a, i, v: a.delete(
        f"/api/columns/{i['column']}", params={"version": v, "cards": "delete"}
    ),
    ("type", "rename"): lambda a, i, v: a.patch(
        f"/api/card-types/{i['type']}", {"name": "New", "color": "blue", "version": v}
    ),
    ("type", "delete"): lambda a, i, v: a.delete(
        f"/api/card-types/{i['type']}", params={"version": v, "replace_with": i["task"]}
    ),
    ("card", "rename"): lambda a, i, v: a.patch(
        f"/api/cards/{i['card']}", {"title": "New", "version": v}
    ),
    ("card", "move"): lambda a, i, v: a.post(
        f"/api/cards/{i['card']}/move", {"column_id": i["done"], "after_id": None, "version": v}
    ),
    ("card", "delete"): lambda a, i, v: a.delete(f"/api/cards/{i['card']}", params={"version": v}),
}


@pytest.mark.parametrize(("entity", "action"), MUTATIONS)
def test_criterion_7_stale_version_returns_409_and_current_one_succeeds(
    entity: str, action: str, api: Api, ids: dict, engine: Engine
) -> None:
    bump(api, entity, ids)
    before = snapshot(engine)
    mutate = MUTATIONS[(entity, action)]

    stale = mutate(api, ids, 1)

    assert stale.status_code == 409, stale.text
    assert snapshot(engine) == before
    current = mutate(api, ids, 2)
    assert current.status_code in {200, 204}, current.text
    if current.status_code == 200:
        assert current.json()["version"] == 3


def test_criterion_7_restore_checks_the_version(api: Api, ids: dict, engine: Engine) -> None:
    url = f"/api/columns/{ids['column']}"
    assert api.post(f"{url}/archive", {"version": 1}).status_code == 200
    before = snapshot(engine)

    assert api.post(f"{url}/restore", {"version": 1}).status_code == 409
    assert snapshot(engine) == before
    restored = api.post(f"{url}/restore", {"version": 2})
    assert restored.status_code == 200
    assert restored.json()["version"] == 3


def test_criterion_7_version_must_be_positive(api: Api, ids: dict) -> None:
    response = api.patch(f"/api/boards/{ids['board']}", {"name": "x", "version": 0})

    assert response.status_code == 422
