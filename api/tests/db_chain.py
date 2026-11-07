"""Test database chain (ADR 0006): TEST_DATABASE_URL, then testcontainers, then pgserver."""

import tempfile
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field

Stop = Callable[[], None]
# A starter returns (url, stop) or raises when its backend is unavailable.
Starter = Callable[[], tuple[str, Stop]]


@dataclass
class ChosenDatabase:
    source: str
    url: str
    stop: Stop = field(default=lambda: None)


class NoDatabaseError(Exception):
    pass


class UnsafeDatabaseError(Exception):
    pass


def choose_database(
    env: Mapping[str, str], starters: Sequence[tuple[str, Starter]]
) -> ChosenDatabase:
    """Return the first available database, in the order of the chain."""
    if env.get("TEST_DATABASE_URL"):
        chosen = ChosenDatabase("TEST_DATABASE_URL", env["TEST_DATABASE_URL"])
    else:
        chosen = _first_started(starters)
    check_safe(chosen.url, env)
    return chosen


def check_safe(url: str, env: Mapping[str, str]) -> None:
    """Never run against SQLite or the development database."""
    if not url.startswith(("postgresql", "postgres://")):
        raise UnsafeDatabaseError(f"Tests need PostgreSQL, got {url.split(':', 1)[0]}")
    if env.get("DATABASE_URL") and url == env["DATABASE_URL"]:
        raise UnsafeDatabaseError("TEST_DATABASE_URL must not be the development DATABASE_URL")


def _first_started(starters: Sequence[tuple[str, Starter]]) -> ChosenDatabase:
    reasons = []
    for source, start in starters:
        try:
            url, stop = start()
        except Exception as error:  # any failure means "try the next backend"
            reasons.append(f"{source}: {error}")
            continue
        return ChosenDatabase(source, url, stop)
    raise NoDatabaseError("No PostgreSQL available for tests (" + "; ".join(reasons) + ")")


def start_testcontainer() -> tuple[str, Stop]:
    from testcontainers.community.postgres import PostgresContainer

    container = PostgresContainer("postgres:16-alpine", driver="psycopg")
    container.start()
    return container.get_connection_url(), container.stop


def start_pgserver() -> tuple[str, Stop]:
    import pgserver

    # A short path: the server's Unix socket lives inside the data directory.
    data_dir = tempfile.mkdtemp(prefix="kambi-pg-", dir="/tmp")
    server = pgserver.get_server(data_dir, cleanup_mode="delete")
    return server.get_uri(), server.cleanup


DEFAULT_STARTERS: Sequence[tuple[str, Starter]] = (
    ("testcontainers", start_testcontainer),
    ("pgserver", start_pgserver),
)
