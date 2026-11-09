#!/usr/bin/env bash
# Start the app with no Docker (and no network once the dependencies are cached): embedded
# PostgreSQL (pgserver) with its data in `.sandbox/`, the API on 127.0.0.1:8001 and the web app
# on http://localhost:5174.
# Google sign-in is replaced by "Sign in as dev user" (DEV_LOGIN). `.env` is not read.
# Dependencies come from the uv and pnpm caches, from the network if they are missing, or from a
# fallback if the lockfiles' versions cannot be installed (see sandbox-deps.sh and README,
# "Offline sandbox").
set -euo pipefail
cd "$(dirname "$0")"
source ./sandbox-deps.sh

for port in 8001 5174; do
  if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
    echo "Port $port is already in use (is ./run-docker.sh running? stop it with 'docker compose down')." >&2
    exit 1
  fi
done

install_dependencies

sandbox="$PWD/.sandbox"
mkdir -p "$sandbox"
if [ ! -s "$sandbox/session_secret" ]; then
  (umask 077 && api_run python -c \
    "import secrets; print(secrets.token_urlsafe(48))" >"$sandbox/session_secret")
fi

api_pid=""
cleanup() {
  # api_pid is the subshell running api_run, so stop its children (uv and uvicorn) as well.
  if [ -n "$api_pid" ]; then
    pkill -TERM -P "$api_pid" 2>/dev/null || true
    kill "$api_pid" 2>/dev/null || true
  fi
  api_run python -m scripts.sandbox_db stop "$sandbox/pg" || true
}
trap cleanup EXIT

DATABASE_URL="$(api_run python -m scripts.sandbox_db start "$sandbox/pg" kambi)"
SESSION_SECRET="$(cat "$sandbox/session_secret")"
export DATABASE_URL SESSION_SECRET
export GOOGLE_CLIENT_ID=offline GOOGLE_CLIENT_SECRET=offline COOKIE_SECURE=false
export DEV_LOGIN=true VITE_DEV_LOGIN=true

api_run alembic upgrade head
api_run uvicorn --factory app.main:create_app \
  --host 127.0.0.1 --port 8001 --reload &
api_pid=$!

echo "Kambi (sandbox): http://localhost:5174 - press Ctrl-C to stop."
pnpm --dir web dev
