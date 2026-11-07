#!/usr/bin/env bash
# Start the app with no Docker and no network: embedded PostgreSQL (pgserver) with its data in
# `.sandbox/`, the API on 127.0.0.1:8001 and the web app on http://localhost:5174.
# Google sign-in is replaced by "Sign in as dev user" (DEV_LOGIN). `.env` is not read.
# Dependencies must already be in the uv and pnpm caches (see README, "Offline sandbox").
set -euo pipefail
cd "$(dirname "$0")"
export UV_OFFLINE=1

for port in 8001 5174; do
  if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
    echo "Port $port is already in use (is ./run-docker.sh running? stop it with 'docker compose down')." >&2
    exit 1
  fi
done

uv sync --directory api --frozen
pnpm --dir web install --frozen-lockfile --offline

sandbox="$PWD/.sandbox"
mkdir -p "$sandbox"
if [ ! -s "$sandbox/session_secret" ]; then
  (umask 077 && uv run --directory api --frozen python -c \
    "import secrets; print(secrets.token_urlsafe(48))" >"$sandbox/session_secret")
fi

api_pid=""
cleanup() {
  if [ -n "$api_pid" ]; then kill "$api_pid" 2>/dev/null || true; fi
  uv run --directory api --frozen python -m scripts.sandbox_db stop "$sandbox/pg" || true
}
trap cleanup EXIT

DATABASE_URL="$(uv run --directory api --frozen python -m scripts.sandbox_db start "$sandbox/pg" kambi)"
SESSION_SECRET="$(cat "$sandbox/session_secret")"
export DATABASE_URL SESSION_SECRET
export GOOGLE_CLIENT_ID=offline GOOGLE_CLIENT_SECRET=offline COOKIE_SECURE=false
export DEV_LOGIN=true VITE_DEV_LOGIN=true

uv run --directory api --frozen alembic upgrade head
uv run --directory api --frozen uvicorn --factory app.main:create_app \
  --host 127.0.0.1 --port 8001 --reload &
api_pid=$!

echo "Kambi (sandbox): http://localhost:5174 - press Ctrl-C to stop."
pnpm --dir web dev
