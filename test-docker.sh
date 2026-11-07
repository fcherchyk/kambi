#!/usr/bin/env bash
# Run the API and web test suites on this machine; the API tests get PostgreSQL from Docker
# (testcontainers). Extra arguments go to pytest, e.g. `./test-docker.sh -k boards`.
set -euo pipefail
cd "$(dirname "$0")"

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not answering (start Docker or OrbStack), or use ./test-sandbox.sh." >&2
  exit 1
fi

uv sync --directory api --frozen
pnpm --dir web install --frozen-lockfile

uv run --directory api pytest -q --cov=app --cov-report=term-missing --cov-fail-under=80 "$@"
pnpm --dir web exec vitest run --coverage
