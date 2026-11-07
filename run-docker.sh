#!/usr/bin/env bash
# Start the whole stack with docker compose (PostgreSQL, API, web) and Google sign-in.
# Extra arguments go to `docker compose up`, e.g. `./run-docker.sh -d`.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Missing .env: copy .env.example to .env and fill it in (see README, \"Google OAuth setup\")." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not answering (start Docker or OrbStack), or use ./run-sandbox.sh." >&2
  exit 1
fi

docker compose up --build "$@"
