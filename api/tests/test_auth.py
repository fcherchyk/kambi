"""Criteria 2 and 3: login with the fake Google, anonymous access, logout and CSRF."""

import uuid
from dataclasses import replace
from datetime import UTC

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from app.auth.google import IdentityError
from app.config import Settings
from app.main import create_app
from tests.helpers import CSRF, Api, FakeGoogle, count_rows, login, snapshot, start_login


def test_criterion_2_login_creates_user_and_httponly_lax_session(
    client: TestClient, google: FakeGoogle, engine: Engine
) -> None:
    response = login(client, google, "g-123")

    cookie = next(
        header
        for header in response.headers.get_list("set-cookie")
        if header.startswith("kambi_session=")
    )
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie or "SameSite=Lax" in cookie
    assert "Secure" not in cookie
    assert response.headers["location"] == "/"
    me = client.get("/api/me")
    assert me.status_code == 200
    assert me.json()["email"] == "g-123@example.com"
    with engine.connect() as connection:
        subs = connection.execute(text("SELECT google_sub FROM users")).scalars().all()
    assert subs == ["g-123"]


def test_criterion_2_second_login_reuses_the_user_row(
    client: TestClient, google: FakeGoogle, engine: Engine
) -> None:
    login(client, google, "g-123")
    first_id = client.get("/api/me").json()["id"]
    google.name = "Ada Lovelace"
    login(client, google, "g-123")

    assert count_rows(engine, "users") == 1
    me = client.get("/api/me").json()
    assert me["id"] == first_id
    assert me["name"] == "Ada Lovelace"


def test_criterion_2_no_table_stores_google_tokens(engine: Engine) -> None:
    with engine.connect() as connection:
        columns = connection.execute(
            text(
                "SELECT table_name, column_name FROM information_schema.columns "
                "WHERE table_schema = 'public'"
            )
        ).all()
    token_like = [
        f"{table}.{column}"
        for table, column in columns
        if "token" in column or "refresh" in column or "access" in column
    ]
    assert token_like == []


def test_criterion_2_wrong_state_returns_400_without_session(
    client: TestClient, google: FakeGoogle, engine: Engine
) -> None:
    start_login(client)
    response = client.get(
        "/api/auth/callback", params={"code": "code", "state": "forged"}, follow_redirects=False
    )

    assert response.status_code == 400
    assert count_rows(engine, "sessions") == 0
    assert count_rows(engine, "users") == 0


def test_criterion_2_callback_without_login_cookie_returns_400(
    client: TestClient, engine: Engine
) -> None:
    response = client.get("/api/auth/callback", params={"code": "c", "state": "s"})

    assert response.status_code == 400
    assert count_rows(engine, "sessions") == 0


def test_criterion_2_callback_without_code_returns_400(client: TestClient, engine: Engine) -> None:
    state = start_login(client)
    response = client.get("/api/auth/callback", params={"state": state})

    assert response.status_code == 400
    assert count_rows(engine, "sessions") == 0


def test_criterion_2_callback_without_state_returns_400(client: TestClient, engine: Engine) -> None:
    start_login(client)
    response = client.get("/api/auth/callback", params={"code": "code"})

    assert response.status_code == 400
    assert count_rows(engine, "sessions") == 0


def test_criterion_2_tampered_login_cookie_returns_400(client: TestClient, engine: Engine) -> None:
    state = start_login(client)
    value = client.cookies.get("kambi_oauth")
    client.cookies.set("kambi_oauth", value[:-1] + ("0" if value[-1] != "0" else "1"))

    response = client.get("/api/auth/callback", params={"code": "c", "state": state})

    assert response.status_code == 400
    assert count_rows(engine, "sessions") == 0


def test_criterion_2_wrong_nonce_returns_400_without_session(
    client: TestClient, google: FakeGoogle, engine: Engine
) -> None:
    state = start_login(client)
    google.nonce_override = "another-nonce"
    response = client.get("/api/auth/callback", params={"code": "code", "state": state})

    assert response.status_code == 400
    assert count_rows(engine, "sessions") == 0
    assert count_rows(engine, "users") == 0


def test_criterion_2_provider_error_returns_400(
    client: TestClient, google: FakeGoogle, engine: Engine
) -> None:
    state = start_login(client)
    google.error = IdentityError("bad code")
    response = client.get("/api/auth/callback", params={"code": "code", "state": state})

    assert response.status_code == 400
    assert count_rows(engine, "sessions") == 0


def test_criterion_2_secure_cookie_flag_comes_from_settings(
    settings, google: FakeGoogle, engine: Engine
) -> None:
    from dataclasses import replace

    from app.main import create_app

    app = create_app(replace(settings, cookie_secure=True), identity_provider=google, engine=engine)
    with TestClient(app, base_url="https://testserver") as client:
        response = login(client, google, "g-123")
    cookies = response.headers.get_list("set-cookie")
    assert any(c.startswith("kambi_session=") and "Secure" in c for c in cookies)


ANONYMOUS_REQUESTS = [
    ("GET", "/api/me"),
    ("GET", "/api/boards"),
    ("POST", "/api/boards"),
    ("GET", "/api/boards/{id}"),
    ("PATCH", "/api/boards/{id}"),
    ("DELETE", "/api/boards/{id}?version=1"),
    ("GET", "/api/boards/{id}/archive"),
    ("POST", "/api/boards/{id}/columns"),
    ("POST", "/api/boards/{id}/card-types"),
    ("PATCH", "/api/columns/{id}"),
    ("POST", "/api/columns/{id}/move"),
    ("POST", "/api/columns/{id}/archive"),
    ("POST", "/api/columns/{id}/restore"),
    ("DELETE", "/api/columns/{id}?version=1"),
    ("POST", "/api/columns/{id}/cards"),
    ("PATCH", "/api/card-types/{id}"),
    ("DELETE", "/api/card-types/{id}?version=1"),
    ("PATCH", "/api/cards/{id}"),
    ("POST", "/api/cards/{id}/move"),
    ("DELETE", "/api/cards/{id}?version=1"),
]


@pytest.mark.parametrize(("method", "path"), ANONYMOUS_REQUESTS)
def test_criterion_3_anonymous_requests_get_401(client: TestClient, method: str, path: str) -> None:
    url = path.format(id=uuid.uuid4())
    response = client.request(method, url, headers=CSRF, json={})

    assert response.status_code == 401


def test_criterion_3_invalid_session_cookie_gets_401(client: TestClient) -> None:
    client.cookies.set("kambi_session", "not-a-session")

    assert client.get("/api/boards").status_code == 401


def test_criterion_3_expired_session_cookie_gets_401(
    client: TestClient, google: FakeGoogle, engine: Engine
) -> None:
    from datetime import datetime, timedelta

    login(client, google, "g-expired")
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE sessions SET expires_at = :expired"),
            {"expired": datetime.now(UTC) - timedelta(days=1)},
        )

    assert client.get("/api/me").status_code == 401
    assert client.get("/api/boards").status_code == 401


def test_criterion_3_logout_invalidates_the_cookie(api: Api, engine: Engine) -> None:
    token = api.client.cookies.get("kambi_session")
    assert api.get("/api/me").status_code == 200

    response = api.post("/api/auth/logout")

    assert response.status_code == 204
    assert count_rows(engine, "sessions") == 0
    api.client.cookies.set("kambi_session", token)
    assert api.get("/api/me").status_code == 401


def test_criterion_3_logout_without_session_is_harmless(client: TestClient) -> None:
    assert client.post("/api/auth/logout", headers=CSRF).status_code == 204


def test_criterion_3_mutations_without_csrf_header_get_403_and_change_nothing(
    api: Api, engine: Engine
) -> None:
    board = api.create_board("Home")
    detail = api.board(board["id"])
    column = detail["columns"][0]
    card_type = detail["card_types"][0]
    card = api.add_card(column["id"], "Card")
    client = api.client
    requests = [
        ("POST", "/api/boards", {"name": "x"}),
        ("PATCH", f"/api/boards/{board['id']}", {"name": "x", "version": 1}),
        ("DELETE", f"/api/boards/{board['id']}?version=1", None),
        ("POST", f"/api/boards/{board['id']}/columns", {"name": "x"}),
        ("PATCH", f"/api/columns/{column['id']}", {"name": "x", "version": 1}),
        ("DELETE", f"/api/columns/{column['id']}?version=1&cards=delete", None),
        ("POST", f"/api/boards/{board['id']}/card-types", {"name": "x", "color": "red"}),
        ("PATCH", f"/api/card-types/{card_type['id']}", {"name": "x", "version": 1}),
        ("DELETE", f"/api/card-types/{card_type['id']}?version=1", None),
        ("POST", f"/api/columns/{column['id']}/cards", {"title": "x"}),
        ("PATCH", f"/api/cards/{card['id']}", {"title": "x", "version": 1}),
        ("DELETE", f"/api/cards/{card['id']}?version=1", None),
        ("POST", "/api/auth/logout", None),
    ]
    before = snapshot(engine)

    for method, url, body in requests:
        for headers in ({}, {"X-CSRF": "0"}):
            response = client.request(method, url, json=body, headers=headers)
            assert response.status_code == 403, (method, url)

    assert snapshot(engine) == before
    assert api.get("/api/me").status_code == 200


def test_criterion_3_anonymous_without_csrf_header_is_rejected(app: FastAPI) -> None:
    with TestClient(app) as client:
        assert client.post("/api/boards", json={"name": "x"}).status_code in {401, 403}


# Development login (offline sandbox): off by default, loopback only.
LOCAL_CLIENT = ("127.0.0.1", 50000)


@pytest.fixture
def dev_app(settings: Settings, google: FakeGoogle, engine: Engine) -> FastAPI:
    return create_app(replace(settings, dev_login=True), identity_provider=google, engine=engine)


def test_dev_login_does_not_exist_by_default(app: FastAPI) -> None:
    with TestClient(app, client=LOCAL_CLIENT) as client:
        response = client.get("/api/auth/dev-login", follow_redirects=False)

    assert response.status_code == 404


def test_dev_login_signs_in_the_dev_user_and_reuses_it(dev_app: FastAPI, engine: Engine) -> None:
    with TestClient(dev_app, client=LOCAL_CLIENT) as client:
        response = client.get("/api/auth/dev-login", follow_redirects=False)
        assert response.status_code == 302
        assert response.headers["location"] == "/"
        assert "HttpOnly" in response.headers["set-cookie"]
        me = client.get("/api/me").json()
        client.get("/api/auth/dev-login", follow_redirects=False)

    assert me["email"] == "dev@localhost"
    assert me["name"] == "Dev User"
    assert count_rows(engine, "users") == 1


def test_dev_login_refuses_non_loopback_clients(dev_app: FastAPI, engine: Engine) -> None:
    with TestClient(dev_app, client=("192.168.1.20", 50000)) as client:
        response = client.get("/api/auth/dev-login", follow_redirects=False)

    assert response.status_code == 403
    assert count_rows(engine, "sessions") == 0


def test_dev_login_is_not_in_the_openapi_schema(dev_app: FastAPI) -> None:
    assert "/api/auth/dev-login" not in dev_app.openapi()["paths"]
