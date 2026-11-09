"""Embedded PostgreSQL (pgserver) for the offline sandbox scripts, with no Docker or network.

Run from `api/`:
- `uv run python -m scripts.sandbox_db start <dir> [database]` starts the server (or reuses the
  one already running on `<dir>`), creates `database` if missing and prints its URL.
  The server keeps running after this command exits.
- `uv run python -m scripts.sandbox_db stop <dir>` stops it.

As root, pgserver runs PostgreSQL as a system user it creates (`pgserver`). Where that user does
not survive a restart (a VM or container whose `/etc/passwd` is reset while the data directory is
kept), it comes back with another uid, so the existing data files are handed back to it first.
If PostgreSQL does not start, the end of its log is printed.
"""

import argparse
import os
import re
import subprocess
import sys
import warnings
from collections.abc import Callable
from pathlib import Path

DATABASE_NAME = re.compile(r"^[a-z_][a-z0-9_]*$")
POSTGRES_SYSTEM_USER = "pgserver"  # the user pgserver runs PostgreSQL as when started by root
LOG_LINES = 20

# platformdirs warns when XDG_RUNTIME_DIR is unset (usual for root in a container) and then falls
# back to /tmp/runtime-<uid>, which works: the warning only hides the real errors.
warnings.filterwarnings("ignore", message="XDG_RUNTIME_DIR")


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


def chown_tree(root: Path, uid: int, gid: int, chown: Callable[..., None] = os.lchown) -> int:
    """Give `root` and everything below it to uid:gid; return how many paths were changed."""
    changed = 0
    for path in [root, *root.rglob("*")]:
        stat = path.lstat()
        if (stat.st_uid, stat.st_gid) != (uid, gid):
            chown(path, uid, gid)
            changed += 1
    return changed


def log_tail(log: Path, lines: int = LOG_LINES) -> str:
    """The last lines of PostgreSQL's log, or a note if there is none."""
    if not log.is_file():
        return f"(no PostgreSQL log at {log})"
    return "\n".join(log.read_text(errors="replace").splitlines()[-lines:])


def give_data_to_postgres_user(data_dir: Path) -> None:  # pragma: no cover - needs root
    """As root, hand an existing data directory to the current `pgserver` user."""
    if not hasattr(os, "geteuid") or os.geteuid() != 0 or not (data_dir / "PG_VERSION").exists():
        return
    from pgserver.utils import ensure_user_exists

    user = ensure_user_exists(POSTGRES_SYSTEM_USER)
    changed = chown_tree(data_dir, user.pw_uid, user.pw_gid)
    if changed:
        print(
            f"sandbox_db: gave {changed} files in {data_dir} to {POSTGRES_SYSTEM_USER} "
            f"(uid {user.pw_uid}), which was recreated with a new uid",
            file=sys.stderr,
        )


def get_server(data_dir: Path, cleanup_mode: str | None):  # pragma: no cover - runs PostgreSQL
    import pgserver

    give_data_to_postgres_user(data_dir)
    try:
        return pgserver.get_server(data_dir, cleanup_mode=cleanup_mode)
    except subprocess.CalledProcessError:
        print(f"sandbox_db: PostgreSQL did not start. End of {data_dir / 'log'}:", file=sys.stderr)
        print(log_tail(data_dir / "log"), file=sys.stderr)
        raise SystemExit(1) from None


def start(data_dir: Path, database: str) -> str:  # pragma: no cover - starts PostgreSQL
    exists_query, create_statement = create_database_sql(database)
    data_dir.mkdir(parents=True, exist_ok=True)
    server = get_server(data_dir, cleanup_mode=None)
    if "1" not in server.psql(exists_query):
        server.psql(create_statement)
    return server.get_uri(database)


def stop(data_dir: Path) -> None:  # pragma: no cover - stops PostgreSQL
    if (data_dir / "postmaster.pid").exists():
        get_server(data_dir, cleanup_mode="stop").cleanup()


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
