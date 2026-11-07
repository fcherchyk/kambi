"""Test helpers: the fake Google, a CSRF-aware API client and database snapshots."""

import urllib.parse
from typing import Any

from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy import Engine, text

from app.auth.google import GoogleIdentity

CSRF = {"X-CSRF": "1"}
TABLES = ("users", "sessions", "boards", "board_columns", "card_types", "cards")


class FakeGoogle:
    """Stands in for Google: no network, and the identity is set by the test."""

    def __init__(self) -> None:
        self.sub = "g-123"
        self.email = "ada@example.com"
        self.name = "Ada"
        self.last_nonce: str | None = None
        self.nonce_override: str | None = None
        self.error: Exception | None = None

    def authorization_url(self, state: str, nonce: str) -> str:
        self.last_nonce = nonce
        query = urllib.parse.urlencode({"state": state, "nonce": nonce})
        return f"https://accounts.example.test/auth?{query}"

    def fetch_identity(self, code: str) -> GoogleIdentity:
        if self.error is not None:
            raise self.error
        return GoogleIdentity(
            sub=self.sub,
            email=self.email,
            name=self.name,
            picture=None,
            nonce=self.nonce_override or self.last_nonce,
        )


def start_login(client: TestClient) -> str:
    """Follow /api/auth/login and return the `state` sent to Google."""
    response = client.get("/api/auth/login", follow_redirects=False)
    assert response.status_code == 302
    query = urllib.parse.parse_qs(urllib.parse.urlparse(response.headers["location"]).query)
    return query["state"][0]


def login(client: TestClient, google: FakeGoogle, sub: str) -> Response:
    google.sub = sub
    google.email = f"{sub}@example.com"
    state = start_login(client)
    response = client.get(
        "/api/auth/callback", params={"code": "code", "state": state}, follow_redirects=False
    )
    assert response.status_code == 302, response.text
    return response


class Api:
    """Sends `X-CSRF: 1` on mutations and offers shortcuts for common setups."""

    def __init__(self, client: TestClient) -> None:
        self.client = client

    def get(self, url: str, **kwargs: Any) -> Response:
        return self.client.get(url, **kwargs)

    def post(self, url: str, json: Any = None, **kwargs: Any) -> Response:
        return self.client.post(url, json=json, headers=CSRF, **kwargs)

    def patch(self, url: str, json: Any = None, **kwargs: Any) -> Response:
        return self.client.patch(url, json=json, headers=CSRF, **kwargs)

    def delete(self, url: str, **kwargs: Any) -> Response:
        return self.client.delete(url, headers=CSRF, **kwargs)

    def create_board(self, name: str = "Board") -> dict:
        response = self.post("/api/boards", {"name": name})
        assert response.status_code == 201, response.text
        return response.json()

    def board(self, board_id: str) -> dict:
        response = self.get(f"/api/boards/{board_id}")
        assert response.status_code == 200, response.text
        return response.json()

    def archive(self, board_id: str) -> dict:
        response = self.get(f"/api/boards/{board_id}/archive")
        assert response.status_code == 200, response.text
        return response.json()

    def add_column(self, board_id: str, name: str, **body: Any) -> dict:
        response = self.post(f"/api/boards/{board_id}/columns", {"name": name, **body})
        assert response.status_code == 201, response.text
        return response.json()

    def add_card(self, column_id: str, title: str, **body: Any) -> dict:
        response = self.post(f"/api/columns/{column_id}/cards", {"title": title, **body})
        assert response.status_code == 201, response.text
        return response.json()

    def add_type(self, board_id: str, name: str, color: str = "red") -> dict:
        response = self.post(f"/api/boards/{board_id}/card-types", {"name": name, "color": color})
        assert response.status_code == 201, response.text
        return response.json()

    def archive_column(self, column: dict) -> dict:
        response = self.post(f"/api/columns/{column['id']}/archive", {"version": column["version"]})
        assert response.status_code == 200, response.text
        return response.json()


def column_named(board: dict, name: str) -> dict:
    return next(column for column in board["columns"] if column["name"] == name)


def cards_in(board: dict, column_id: str) -> list[dict]:
    cards = [card for card in board["cards"] if card["column_id"] == column_id]
    return sorted(cards, key=lambda card: card["sort_key"].encode())


def snapshot(engine: Engine) -> dict[str, list[dict]]:
    """Every row of every table, to assert that a request changed nothing."""
    with engine.connect() as connection:
        return {
            table: [
                dict(row._mapping)
                for row in connection.execute(text(f"SELECT * FROM {table} ORDER BY id"))
            ]
            for table in TABLES
        }


def count_rows(engine: Engine, table: str) -> int:
    with engine.connect() as connection:
        return connection.execute(text(f"SELECT count(*) FROM {table}")).scalar_one()
