"""Settings parsing, and the migration matching the ORM models."""

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import Engine

from app.config import DEFAULT_REDIRECT_URI, Settings, parse_bool
from app.db import Base, normalize_database_url

REQUIRED = {
    "DATABASE_URL": "postgresql://kambi@db/kambi",
    "GOOGLE_CLIENT_ID": "id",
    "GOOGLE_CLIENT_SECRET": "secret",
    "SESSION_SECRET": "session",
}


def test_settings_from_env_with_defaults() -> None:
    settings = Settings.from_env(REQUIRED)

    assert settings.database_url == REQUIRED["DATABASE_URL"]
    assert settings.oauth_redirect_uri == DEFAULT_REDIRECT_URI
    assert settings.cookie_secure is False
    assert settings.dev_login is False


def test_settings_from_env_reads_optional_values() -> None:
    env = {
        **REQUIRED,
        "COOKIE_SECURE": "true",
        "OAUTH_REDIRECT_URI": "https://k.example/cb",
        "DEV_LOGIN": "true",
    }

    settings = Settings.from_env(env)

    assert settings.cookie_secure is True
    assert settings.oauth_redirect_uri == "https://k.example/cb"
    assert settings.dev_login is True


def test_settings_from_env_reports_missing_variables() -> None:
    with pytest.raises(RuntimeError, match="SESSION_SECRET"):
        Settings.from_env({k: v for k, v in REQUIRED.items() if k != "SESSION_SECRET"})


@pytest.mark.parametrize(("value", "expected"), [("1", True), (" Yes ", True), ("off", False)])
def test_parse_bool(value: str, expected: bool) -> None:
    assert parse_bool(value) is expected


@pytest.mark.parametrize(
    "url",
    ["postgresql://u@h/d", "postgres://u@h/d", "postgresql+psycopg2://u@h/d"],
)
def test_database_urls_use_psycopg_3(url: str) -> None:
    assert normalize_database_url(url) == "postgresql+psycopg://u@h/d"


def test_migrations_match_the_models(engine: Engine) -> None:
    with engine.connect() as connection:
        context = MigrationContext.configure(connection)
        differences = compare_metadata(context, Base.metadata)

    assert differences == []
