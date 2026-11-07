"""Print the API's OpenAPI schema as JSON, for generating the SPA's TypeScript client.

Run from `api/`: `uv run python -m scripts.export_openapi > ../web/openapi.json`, or
`uv run pytest tests/test_openapi_export.py --write-openapi`.
No database or Google connection is opened: the settings below are placeholders.
"""

import json
import sys

from app.config import Settings
from app.main import create_app

PLACEHOLDER_SETTINGS = Settings(
    database_url="postgresql+psycopg://openapi@localhost/openapi",
    google_client_id="openapi",
    google_client_secret="openapi",
    session_secret="openapi",
)


def render_schema() -> str:
    """Return the OpenAPI schema as stable, pretty-printed JSON."""
    schema = create_app(PLACEHOLDER_SETTINGS).openapi()
    return json.dumps(schema, indent=2, sort_keys=True) + "\n"


def main() -> None:
    sys.stdout.write(render_schema())


if __name__ == "__main__":
    main()
