"""Shared fixtures. Database tests use the chain in `db_chain.py` and skip if it is empty."""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from app.config import Settings
from app.db import make_engine, normalize_database_url
from app.main import create_app
from tests.db_chain import DEFAULT_STARTERS, NoDatabaseError, choose_database
from tests.helpers import TABLES, Api, FakeGoogle, login

API_DIR = Path(__file__).resolve().parent.parent


def run_migrations(url: str) -> None:
    config = Config(str(API_DIR / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", normalize_database_url(url).replace("%", "%%"))
    config.attributes["configure_logger"] = False
    command.upgrade(config, "head")


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    try:
        chosen = choose_database(os.environ, DEFAULT_STARTERS)
    except NoDatabaseError as error:
        pytest.skip(str(error))
    try:
        run_migrations(chosen.url)
        yield chosen.url
    finally:
        chosen.stop()


@pytest.fixture(scope="session")
def session_engine(database_url: str) -> Iterator[Engine]:
    engine = make_engine(database_url)
    yield engine
    engine.dispose()


@pytest.fixture
def engine(session_engine: Engine) -> Iterator[Engine]:
    yield session_engine
    with session_engine.begin() as connection:
        connection.execute(text(f"TRUNCATE {', '.join(TABLES)} CASCADE"))


@pytest.fixture
def google() -> FakeGoogle:
    return FakeGoogle()


@pytest.fixture
def settings(database_url: str) -> Settings:
    return Settings(
        database_url=database_url,
        google_client_id="test-client",
        google_client_secret="test-secret",
        session_secret="test-session-secret",
    )


@pytest.fixture
def app(settings: Settings, google: FakeGoogle, engine: Engine) -> FastAPI:
    return create_app(settings, identity_provider=google, engine=engine)


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def api(app: FastAPI, google: FakeGoogle) -> Iterator[Api]:
    """User A, logged in."""
    with TestClient(app) as test_client:
        login(test_client, google, "g-alice")
        yield Api(test_client)


@pytest.fixture
def other_api(app: FastAPI, google: FakeGoogle, api: Api) -> Iterator[Api]:
    """User B, logged in after user A."""
    with TestClient(app) as test_client:
        login(test_client, google, "g-bob")
        yield Api(test_client)
