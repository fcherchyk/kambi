"""The offline sandbox's database helper: only the SQL it builds, without starting PostgreSQL."""

import pytest

from scripts.sandbox_db import create_database_sql


def test_S1_AC4_create_database_sql_for_a_plain_name() -> None:
    assert create_database_sql("kambi") == (
        "SELECT 1 FROM pg_database WHERE datname = 'kambi'",
        "CREATE DATABASE kambi",
    )


@pytest.mark.parametrize("name", ["Kambi", "kambi; DROP TABLE users", "1kambi", ""])
def test_S1_AC4_create_database_sql_rejects_unsafe_names(name: str) -> None:
    with pytest.raises(ValueError, match="Invalid database name"):
        create_database_sql(name)
