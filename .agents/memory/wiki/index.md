# Project wiki

Kambi is a Trello-style kanban board for one person, run locally with docker compose. It mirrors mapa-mental's architecture and usability so the two can later link ideas to tasks.

## Components

- `api/`: FastAPI + SQLAlchemy + Alembic (Python 3.12, uv), one package per domain (`auth`, `boards`, `columns`, `card_types`, `cards`).
- `web/`: React/TypeScript SPA (Vite, pnpm) with a same-origin `/api` proxy.
- PostgreSQL 16 in the `db` service. Everything is published only on 127.0.0.1.

## Model

A board has columns (the workflow steps and the card state), card types (name and color) and cards (title, description, type, column). New boards get "To Do", "In Progress", "Done" and a yellow "Task" type. Archiving a column archives its cards.

## How to run

- `docker compose up` (secrets in `.env`, see `.env.example`).
- Setup: `uv sync --directory api && pnpm --dir web install --frozen-lockfile`.
- Tests: pytest with coverage in `api/`, then `vitest run --coverage` in `web/`. The test DB comes from `TEST_DATABASE_URL`, testcontainers or `pgserver`.

Details: `.agents/memory/arquitectura.md` and the ADRs.
