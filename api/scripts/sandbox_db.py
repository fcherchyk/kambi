"""Embedded PostgreSQL (pgserver) for the offline sandbox scripts, with no Docker or network.

Run from `api/`:
- `uv run python -m scripts.sandbox_db start <dir> [database]` starts the server (or reuses the
  one already running on `<dir>`), creates `database` if missing and prints its URL.
  The server keeps running after this command exits.
- `uv run python -m scripts.sandbox_db stop <dir>` stops it.
"""

import argparse
import re
import sys
from pathlib import Path

DATABASE_NAME = re.compile(r"^[a-z_][a-z0-9_]*$")


def check_database_name(name: str) -> str:
    """Only plain lowercase identifiers, since the name is spliced into SQL."""
    if not DATABASE_NAME.match(name):
        raise ValueError(f"Invalid database name: {name!r}")
    return name


def create_database_sql(name: str) -> tuple[str, str]:
    """Return (query that finds the database, statement that creates it)."""
    name = check_database_name(name)
    return (
        f"SELECT 1 FROM pg_database WHERE datname = '{name}'",
        f"CREATE DATABASE {name}",
    )


def start(data_dir: Path, database: str) -> str:  # pragma: no cover - starts PostgreSQL
    import pgserver

    exists_query, create_statement = create_database_sql(database)
    data_dir.mkdir(parents=True, exist_ok=True)
    server = pgserver.get_server(data_dir, cleanup_mode=None)
    if "1" not in server.psql(exists_query):
        server.psql(create_statement)
    return server.get_uri(database)


def stop(data_dir: Path) -> None:  # pragma: no cover - stops PostgreSQL
    import pgserver

    if (data_dir / "postmaster.pid").exists():
        pgserver.get_server(data_dir, cleanup_mode="stop").cleanup()


def main(argv: list[str] | None = None) -> None:  # pragma: no cover - command-line entry point
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("action", choices=["start", "stop"])
    parser.add_argument("data_dir", type=Path)
    parser.add_argument("database", nargs="?", default="kambi")
    args = parser.parse_args(argv)
    if args.action == "start":
        sys.stdout.write(start(args.data_dir.resolve(), args.database) + "\n")
    else:
        stop(args.data_dir.resolve())


if __name__ == "__main__":  # pragma: no cover
    main()
