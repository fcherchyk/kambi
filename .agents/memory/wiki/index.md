# Project wiki

Kambi is a Trello-style kanban board for one person, run locally with docker compose. It mirrors mapa-mental's architecture and usability so the two can later link ideas to tasks.

Status: slice 1 is built: backend (run bb717706) and frontend in `web/` (run 678ff13c). Open items are in the README roadmap.

## Components

- `api/`: FastAPI + SQLAlchemy 2 + Alembic (Python 3.12, uv). One package per domain: `auth`, `boards`, `columns`, `card_types`, `cards`. Shared modules: `config.py`, `db.py`, `errors.py`, `schemas.py`, `ordering.py`, `main.py` (app factory, CSRF check). `scripts/export_openapi.py` writes the schema the SPA's client is generated from.
- `web/`: React 19 + strict TypeScript SPA (Vite, pnpm), served on 5174 with a same-origin `/api` proxy to the API. Modules: `session.tsx` (`/api/me`, logout, 401 handling), `board/` (board state, columns, cards, card types, dialogs), `keyboard/` (shortcut registry and `?` panel), `pages/` (login, boards, board, archive), `api/` (fetch wrapper that adds `X-CSRF: 1`, and `schema.ts` generated from `openapi.json`). React Router holds the state in the URL; @dnd-kit does drag and drop.
- PostgreSQL 16 in the `db` service, not published. `api` is on 127.0.0.1:8001, `web` on 127.0.0.1:5174.

## Auth and API rules

- Google login is server-side (BFF): `/api/auth/login` and `/api/auth/callback`, with state and nonce in a signed short-lived cookie. The session cookie is `HttpOnly`, `SameSite=Lax`. Only a SHA-256 of the session token is stored; no Google token is stored.
- The SPA signs in with a full-page navigation to `/api/auth/login`. A `401` on any call returns it to the login screen.
- Every `POST`, `PATCH` and `DELETE` needs `X-CSRF: 1` (else `403`). The SPA's client adds it to every mutation.
- Ownership is per user: another user's path id gives `404`; another board's id in a body or query gives `422`.
- Every mutation of an existing row takes `version`: in the body for `PATCH`, move, archive and restore, and as `?version=` for `DELETE`. A stale one gives `409`; the SPA reloads the board and shows a notice.
- Sort keys are fractional text under the `"C"` collation. A move updates one row. `web/src/ordering.ts` is a port of the API's.

## Model

A board has columns (the workflow steps and the card state), card types (name and color from a fixed 10-key palette) and cards (title, description, type, column). New boards get "To Do", "In Progress", "Done" and a yellow "Task" type. Archiving a column archives its cards, which are read-only until restored. The last active column and the last type cannot be deleted.

## How to run

- Secrets: copy `.env.example` to `.env` (git-ignored).
- Stack: `docker compose up --build`, then open http://localhost:5174 and sign in with Google.
- Without Docker: `uv sync --directory api`, `pnpm --dir web install --frozen-lockfile`, then `pnpm --dir web dev` (the proxy target is `API_URL`, default http://localhost:8001).
- After an API change: `pnpm --dir web gen:api` regenerates `web/openapi.json` and `web/src/api/schema.ts`. Commit both.
- API tests: `uv run --directory api pytest -q --cov=app --cov-report=term-missing --cov-fail-under=80`. The DB comes from `TEST_DATABASE_URL`, then testcontainers, then `pgserver`; only DB tests are skipped if none works. Never SQLite, never the dev DB. The same run fails if `web/openapi.json` is stale.
- Web tests: `pnpm --dir web exec vitest run --coverage` (Vitest + Testing Library against the in-memory fake `web/src/test/fakeApi.ts`; fails below 80% line coverage). Typecheck: `pnpm --dir web typecheck`.
- Each frontend acceptance criterion has tests named `AC1: …` to `AC18: …`.

Details: `.agents/memory/arquitectura.md`, the ADRs in `.agents/memory/adr/`, and the README.
