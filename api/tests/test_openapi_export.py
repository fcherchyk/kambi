"""The SPA's versioned OpenAPI schema must match the API, so its generated client never drifts."""

from pathlib import Path

import pytest

from scripts.export_openapi import render_schema

SCHEMA_FILE = Path(__file__).resolve().parents[2] / "web" / "openapi.json"


def test_web_openapi_schema_matches_the_api(request: pytest.FixtureRequest) -> None:
    current = render_schema()
    if request.config.getoption("--write-openapi"):
        SCHEMA_FILE.write_text(current)
    assert SCHEMA_FILE.exists(), "Run `pnpm --dir web gen:api` to create web/openapi.json"
    assert SCHEMA_FILE.read_text() == current, (
        "web/openapi.json is stale: run `pnpm --dir web gen:api` and commit the result"
    )
