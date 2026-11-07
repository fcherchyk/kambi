"""S1_AC20: the test database chain and its safety rules (no database needed)."""

import pytest

from tests.db_chain import (
    DEFAULT_STARTERS,
    NoDatabaseError,
    UnsafeDatabaseError,
    choose_database,
)

PG_URL = "postgresql://test@localhost/test"


def unavailable(reason: str):
    def start() -> tuple[str, object]:
        raise RuntimeError(reason)

    return start


def available(url: str, stops: list):
    def start() -> tuple[str, object]:
        return url, lambda: stops.append(url)

    return start


def test_S1_AC20_test_database_url_wins_over_every_starter() -> None:
    started: list = []

    chosen = choose_database(
        {"TEST_DATABASE_URL": PG_URL}, [("testcontainers", available("postgresql://x", started))]
    )

    assert (chosen.source, chosen.url) == ("TEST_DATABASE_URL", PG_URL)
    assert started == []


def test_S1_AC20_testcontainers_is_tried_before_pgserver() -> None:
    stops: list = []
    starters = [
        ("testcontainers", available("postgresql://container", stops)),
        ("pgserver", available("postgresql://pgserver", stops)),
    ]

    chosen = choose_database({}, starters)
    chosen.stop()

    assert chosen.source == "testcontainers"
    assert stops == ["postgresql://container"]


def test_S1_AC20_pgserver_is_used_when_docker_is_missing() -> None:
    starters = [
        ("testcontainers", unavailable("Docker is not running")),
        ("pgserver", available("postgresql://pgserver", [])),
    ]

    assert choose_database({}, starters).source == "pgserver"


def test_S1_AC20_no_backend_raises_with_every_reason() -> None:
    starters = [
        ("testcontainers", unavailable("no docker")),
        ("pgserver", unavailable("no binaries")),
    ]

    with pytest.raises(NoDatabaseError, match="no docker.*no binaries"):
        choose_database({}, starters)


def test_S1_AC20_never_runs_against_sqlite() -> None:
    with pytest.raises(UnsafeDatabaseError):
        choose_database({"TEST_DATABASE_URL": "sqlite:///test.db"}, [])


def test_S1_AC20_never_runs_against_the_development_database() -> None:
    env = {"TEST_DATABASE_URL": PG_URL, "DATABASE_URL": PG_URL}

    with pytest.raises(UnsafeDatabaseError):
        choose_database(env, [])


def test_S1_AC20_default_chain_order() -> None:
    assert [source for source, _ in DEFAULT_STARTERS] == ["testcontainers", "pgserver"]
