#!/usr/bin/env bash
# Run the API and web test suites with no Docker: the API tests use an embedded PostgreSQL
# (pgserver) in a temporary directory. Dependencies come from the uv and pnpm caches, from the
# network if they are missing, or from a fallback if the lockfiles' versions cannot be installed
# (see sandbox-deps.sh and README, "Offline sandbox"). Extra arguments go to pytest.
set -euo pipefail
cd "$(dirname "$0")"
source ./sandbox-deps.sh

install_dependencies

# A short path: PostgreSQL's Unix socket lives inside the data directory.
pg_dir="$(mktemp -d /tmp/kambi-test-XXXXXX)"
cleanup() {
  api_run python -m scripts.sandbox_db stop "$pg_dir" || true
  rm -rf "$pg_dir"
}
trap cleanup EXIT

TEST_DATABASE_URL="$(api_run python -m scripts.sandbox_db start "$pg_dir" kambi_test)"
export TEST_DATABASE_URL

api_run pytest -q --cov=app --cov-report=term-missing --cov-fail-under=80 "$@"
pnpm --dir web exec vitest run --coverage
