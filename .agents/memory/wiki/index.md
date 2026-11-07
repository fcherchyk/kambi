# Project wiki

Kambi is a Trello-style kanban board for one person, run locally with docker compose. It mirrors mapa-mental's architecture and usability so the two can later link ideas to tasks.

Status: slice 1 backend is built (run bb717706). `web/` does not exist yet; it is the next run.

## Components

- `api/`: FastAPI + SQLAlchemy 2 + Alembic (Python 3.12, uv). One package per domain: `auth`, `boards`, `columns`, `card_types`, `cards`. Shared modules: `config.py`, `db.py`, `errors.py`, `schemas.py`, `ordering.py`, `main.py` (app factory, CSRF check).
- `web/`: React/TypeScript SPA (Vite, pnpm) with a same-origin `/api` proxy. Not built yet.
- PostgreSQL 16 in the `db` service, not published. `api` is on 127.0.0.1:8001, `web` on 127.0.0.1:5174.

## Auth and API rules

- Google login is server-side (BFF): `/api/auth/login` and `/api/auth/callback`, with state and nonce in a signed short-lived cookie. The session cookie is `HttpOnly`, `SameSite=Lax`. Only a SHA-256 of the session token is stored; no Google token is stored.
- Every `POST`, `PATCH` and `DELETE` needs `X-CSRF: 1` (else `403`).
- Ownership is per user: another user's path id gives `404`; another board's id in a body or query gives `422`.
- Every mutation of an existing row takes `version`: in the body for `PATCH`, move, archive and restore, and as `?version=` for `DELETE`. A stale one gives `409`.
- Sort keys are fractional text under the `"C"` collation. A move updates one row.

## Model

A board has columns (the workflow steps and the card state), card types (name and color from a fixed 10-key palette) and cards (title, description, type, column). New boards get "To Do", "In Progress", "Done" and a yellow "Task" type. Archiving a column archives its cards, which are read-only until restored. The last active column and the last type cannot be deleted.

## How to run

- Secrets: copy `.env.example` to `.env` (git-ignored).
- Stack: `docker compose up --build db api` until `web/` exists; then `docker compose up --build`.
- Setup: `uv sync --directory api`. Add `pnpm --dir web install --frozen-lockfile` once `web/` exists.
- Tests: `uv run --directory api pytest -q --cov=app --cov-report=term-missing --cov-fail-under=80`. The DB comes from `TEST_DATABASE_URL`, then testcontainers, then `pgserver`; only DB tests are skipped if none works. Never SQLite, never the dev DB.
- Frontend tests (later): `vitest run --coverage` in `web/`.

Details: `.agents/memory/arquitectura.md`, the ADRs in `.agents/memory/adr/`, and the README.
