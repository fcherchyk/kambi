"""S1_AC4: the sandbox's database helper (SQL, file ownership, log), without starting PostgreSQL."""

from pathlib import Path

import pytest

from scripts.sandbox_db import chown_tree, create_database_sql, log_tail


def test_S1_AC4_create_database_sql_for_a_plain_name() -> None:
    assert create_database_sql("kambi") == (
        "SELECT 1 FROM pg_database WHERE datname = 'kambi'",
        "CREATE DATABASE kambi",
    )


@pytest.mark.parametrize("name", ["Kambi", "kambi; DROP TABLE users", "1kambi", ""])
def test_S1_AC4_create_database_sql_rejects_unsafe_names(name: str) -> None:
    with pytest.raises(ValueError, match="Invalid database name"):
        create_database_sql(name)


def test_S1_AC4_chown_tree_hands_every_path_to_the_new_owner(tmp_path: Path) -> None:
    (tmp_path / "base").mkdir()
    (tmp_path / "base" / "1").write_text("")
    (tmp_path / "PG_VERSION").write_text("16")
    calls: list[tuple[Path, int, int]] = []

    changed = chown_tree(tmp_path, 4242, 4242, chown=lambda *args: calls.append(args))

    assert changed == 4
    assert {path for path, _, _ in calls} == {
        tmp_path,
        tmp_path / "base",
        tmp_path / "base" / "1",
        tmp_path / "PG_VERSION",
    }
    assert {(uid, gid) for _, uid, gid in calls} == {(4242, 4242)}


def test_S1_AC4_chown_tree_skips_paths_that_already_have_the_owner(tmp_path: Path) -> None:
    (tmp_path / "PG_VERSION").write_text("16")
    stat = tmp_path.stat()

    changed = chown_tree(tmp_path, stat.st_uid, stat.st_gid, chown=lambda *args: None)

    assert changed == 0


def test_S1_AC4_log_tail_shows_the_end_of_the_postgres_log(tmp_path: Path) -> None:
    log = tmp_path / "log"
    log.write_text("\n".join(f"line {n}" for n in range(1, 31)))

    assert log_tail(log, 3) == "line 28\nline 29\nline 30"
    assert log_tail(tmp_path / "missing") == f"(no PostgreSQL log at {tmp_path / 'missing'})"
