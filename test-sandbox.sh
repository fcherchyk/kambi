#!/usr/bin/env bash
# Run the API and web test suites with no Docker and no network: the API tests use an embedded
# PostgreSQL (pgserver) in a temporary directory. Dependencies must already be in the uv and
# pnpm caches (see README, "Offline sandbox"). Extra arguments go to pytest.
set -euo pipefail
cd "$(dirname "$0")"
export UV_OFFLINE=1

uv sync --directory api --frozen
pnpm --dir web install --frozen-lockfile --offline

# A short path: PostgreSQL's Unix socket lives inside the data directory.
pg_dir="$(mktemp -d /tmp/kambi-test-XXXXXX)"
cleanup() {
  uv run --directory api --frozen python -m scripts.sandbox_db stop "$pg_dir" || true
  rm -rf "$pg_dir"
}
trap cleanup EXIT

TEST_DATABASE_URL="$(uv run --directory api --frozen python -m scripts.sandbox_db start "$pg_dir" kambi_test)"
export TEST_DATABASE_URL

uv run --directory api --frozen pytest -q --cov=app --cov-report=term-missing --cov-fail-under=80 "$@"
pnpm --dir web exec vitest run --coverage
