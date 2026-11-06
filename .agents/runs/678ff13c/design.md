<!-- claude-readonly · claude-opus-5-5 · familia anthropic -->

## Open decisions

**1. Login**
- A) Google, the same BFF pattern as mapa-mental (ADR 0006): the server handles OAuth, the browser only gets an `HttpOnly` cookie, scopes `openid email profile`. Costs a Google OAuth client and `.env` setup, but users already match mapa-mental's.
- B) No login: a single local user created at startup. Faster to build, but adding login later means migrating data ownership and redoing the API's isolation tests.
- **I recommend A**, because linking ideas to tasks later needs the same identity on both sides, and `auth/` can be copied almost as-is.

**2. How users are shared with mapa-mental later** (only if 1A)
- A) Each app keeps its own PostgreSQL and its own `users` table. The two are linked later by `google_sub`. No coupling today.
- B) One shared PostgreSQL instance with a database per app. Less RAM, but the two compose stacks end up depending on each other.
- C) A shared auth service now. Single sign-on, but it is a third app to build and run.
- **I recommend A**: it is the simplest option, and `google_sub` is already a stable key both apps store. `[standard candidate]`: "each app owns its database; cross-app identity is the Google `sub`".

**3. Ports, so it can run next to mapa-mental**
- A) Different ports on 127.0.0.1: web `5174`, API `8001`, and the DB not published (or `5433`). Both apps run at the same time. The Google redirect becomes `http://localhost:5174/api/auth/callback`.
- B) The same ports as mapa-mental, so only one app runs at a time.
- **I recommend A**, since the two apps are meant to be used together. `[standard candidate]`: a port registry in the workspace (one line per project).

**4. Card title**
- A) A short title (1–200 chars) shown on the board, plus a plain-text description (up to 10,000 chars) shown when the card is opened.
- B) Description only, with the board showing its first lines. The model is simpler, but the board gets harder to scan.
- **I recommend A**. It is the Trello convention, and mapa-mental ideas also have a title, which makes future links read well.

**5. Where a card is opened and edited**
- A) A modal dialog with its own URL, `/b/:boardId/c/:cardId`, so reload, back and links work (mapa-mental keeps focus in the URL too).
- B) A side panel without a URL.
- C) Inline editing on the board only.
- **I recommend A**: it is consistent with mapa-mental's URL-driven state, and a card URL is what a mind-map node will link to later.

**6. Archived columns**
- A) An "Archived" view (`/b/:boardId/archive`) that lists archived columns with their cards, read-only, with "Restore" (back to the column's original position) and "Delete". Cards inside an archived column cannot be moved or edited until the column is restored.
- B) Just hidden, with no way to restore yet.
- **I recommend A**. Archiving without restore is effectively a delete, and the view is small.

**7. Deleting a column that has cards**
- A) A dialog, like mapa-mental's delete dialog, with focus on "Cancel" and three choices: "Move N cards to…" (pick a column), "Delete the column and its N cards", or "Cancel". An empty column is deleted without asking.
- B) Blocked until the column is empty (`409`).
- C) Always cascade, after a confirmation that shows the count.
- **I recommend A**: same pattern and wording as mapa-mental's cascade/reparent dialog (`?cards=move&target=…` or `?cards=delete`).
- In every option, the last active column of a board cannot be deleted or archived (`422`), so cards always have somewhere to live. Do you agree?

**8. Deleting a card type, and the default type**
- A) If cards use the type, a dialog asks which type to reassign them to. The last type cannot be deleted (`422`). New cards get the board's first type in list order ("Task" at the start).
- B) Blocked while any card uses the type.
- C) Cards become typeless (`type_id` nullable, drawn in neutral grey).
- **I recommend A**: every card always has a type, and the dialog reuses the pattern from 7A.

**9. Deleting a card**
- A) Always a small confirmation dialog.
- B) No confirmation, plus a 5-second "Undo" toast. This needs a soft delete or keeping a copy on the client.
- C) No confirmation (like a mapa-mental leaf).
- **I recommend A**. A card can hold a long description, and A needs no soft delete.

**10. Ordering and drag and drop**
- A) Cards and columns are ordered by a fractional `sort_key`, like mapa-mental. Drag and drop for both ships in slice 1 with `@dnd-kit` (keyboard-accessible, about 15 kB).
- B) Same ordering, but slice 1 moves things only with buttons and the keyboard (card menu "Move to…", column "◀ ▶"). Drag and drop comes in slice 2.
- C) No manual order: cards sorted by creation date.
- **I recommend A**. On a kanban board, dragging is the main interaction, not polish, and dnd-kit brings keyboard dragging with screen-reader announcements. The buttons from B stay as the visible alternatives either way.

**11. Keyboard model on the board**
- A) A selected card, like mapa-mental's selected node:
  - Arrow keys move between cards (←→ across columns, ↑↓ within a column).
  - Shift+Arrow moves the selected card.
  - `N` creates a card in the selected column.
  - Enter opens the card, F2 renames it, Delete deletes it.
  - `?` opens the help panel and Escape closes dialogs.
  - Every action also has a visible button.
- B) Global shortcuts only (`N`, `?`, Escape), with no card selection.
- **I recommend A**, for parity with mapa-mental, so the same muscle memory works in both apps.

**12. Card type colors**
- A) A fixed palette of about 10 named colors (`yellow`, `blue`, …), stored as a key, with contrast checked for the title text.
- B) Any hex color from `<input type="color">`.
- **I recommend A**: validation is trivial, the text stays readable, and hex can be added later because the column is plain text.

**13. Name uniqueness**
- A) Card type names unique per board (case-insensitive). Column and board names may repeat.
- B) Nothing unique.
- C) Everything unique per parent.
- **I recommend A**: two identical types in a picker are confusing, while repeated column names are harmless.

**14. What to promote to `decisiones.md`** `[standard candidate]`
- a) Local web stack: docker compose with `db`/`api`/`web`, ports only on 127.0.0.1, a same-origin `/api` proxy from Vite, secrets in `.env` with an `.env.example`.
- b) Web login: BFF OAuth with an `HttpOnly` cookie, a CSRF header and minimal, incremental scopes. This is mapa-mental's pending decision 14, and it is not yet in `decisiones.md`.
- c) Test DB chain: `TEST_DATABASE_URL` → testcontainers → `pgserver`. This extends the `codigo.md` rule that only names testcontainers.
- d) UI: every keyboard shortcut also has a visible button, plus a "?" shortcuts panel.
- e) Manual ordering with a fractional `sort_key` (text).
- f) MIT license with `LICENSE` at the root.
- Options: A) all six; B) only a–c (infrastructure); C) none.
- **I recommend A**, since kambi is the second project to repeat every one of them.

## Summary

Kambi is a Trello-style kanban board for one person, running locally with docker compose. It deliberately mirrors mapa-mental's architecture and usability, so the two can later link ideas to tasks.

- A user creates boards. Each new board starts with "To Do", "In Progress" and "Done", and with a yellow "Task" card type.
- A card has a title, a plain-text description, a type and a column. The column is the card's state, and cards move freely between columns.
- Columns and card types are fully editable, and columns can be archived together with their cards.

## Components

```
[React/TS SPA (Vite) :5174] --same origin /api + session cookie--> [FastAPI :8001] --> [PostgreSQL 16]
                                                                         |
                                                                         +--> Google OAuth (login)
                                                                         +--> (future) mapa-mental links
```

**Repo layout**, like mapa-mental: `api/` (uv, Python 3.12, since `pgserver` needs ≤ 3.12), `web/` (pnpm), `docker-compose.yml`, `.env.example`, `LICENSE` (MIT) and `README.md`. The root `pyproject.toml` and `.coveragerc` from the template move into `api/`.

**Docker compose**
- `db`: PostgreSQL 16 with the `db-data` volume.
- `api`: runs the Alembic migrations, then uvicorn with reload.
- `web`: Vite, proxying `/api` to `api:8001`, with `node_modules` in a volume.
- Everything is published only on 127.0.0.1.

**Backend (FastAPI, SQLAlchemy 2, Alembic)**, one package per domain like mapa-mental:
- `auth/`: copied from mapa-mental. Google OAuth (Authlib), sessions, the CSRF header (`X-CSRF: 1`), `/me` and logout.
- `boards/`:
  - list, create, rename and delete;
  - `GET /api/boards/{id}`: the whole active board in one response (columns, types, cards). Boards are small, so there is no pagination;
  - `GET /api/boards/{id}/archive`: archived columns with their cards.
  - Creating a board seeds its 3 columns and the "Task" type in the same transaction.
- `columns/`: create (with `after_id`), rename, move, archive, restore, and delete with `?cards=move&target=…` or `?cards=delete`.
- `card_types/`: create, rename, recolor, and delete with `?replace_with=…`.
- `cards/`: create in a column, edit (title, description, type), move (`column_id` plus `after_id`, with the server computing the `sort_key`), and delete.
- `ordering.py`: fractional keys, the same algorithm as mapa-mental's `sort_keys`.

Every mutation takes a `version` and returns `409` when it is stale. Validation errors return `422`. Anything that belongs to another user returns `404`.

**Frontend (React Router, `useReducer` with optimistic updates and rollback, client types generated from OpenAPI)**
- Routes:
  - `/`: the board list (create, rename and delete, with a confirmation that shows counts);
  - `/b/:boardId`: the board;
  - `/b/:boardId/c/:cardId`: the card dialog (5A);
  - `/b/:boardId/archive`: the archived columns (6A).
- Components: `BoardsPage`, `BoardPage`, `Column` (header menu: rename, ◀ ▶, archive, delete), `CardTile` (type color strip and title), `AddCard` (inline title input: Enter creates the card and opens another input, Escape cancels), `CardDialog`, `CardTypesPanel`, `ArchivePage`, `DeleteColumnDialog`, `DeleteTypeDialog`, `ConfirmDialog`, `ShortcutsHelp` ("?"), `LoginPage` and `NotFound`.
- Drag and drop with `@dnd-kit/core` and `@dnd-kit/sortable` (if 10A).
- Tests: Vitest and Testing Library against `web/src/test/fakeApi.ts`, with an 80% line threshold.

**`.agents/project.yaml`** follows mapa-mental's commands:
- `setup_command`: `uv sync --directory api && pnpm --dir web install --frozen-lockfile`;
- `test_command`: pytest with `--cov=app --cov-fail-under=80`, then `vitest run --coverage`;
- no Docker `preflight`, thanks to the fallback chain.

## Data model

- **users**, **sessions**: identical to mapa-mental (`google_sub` unique, `settings` jsonb).
- **boards**: `id` (uuid), `owner_id`, `name` (1–100), `version`, `created_at`, `updated_at`. Index on `(owner_id, created_at)`.
- **board_columns** (named this way because `columns` reads badly in SQL): `id`, `board_id`, `name` (1–100), `sort_key` (text), `archived_at` (nullable timestamp), `version` and timestamps. Index on `(board_id, archived_at, sort_key)`.
- **card_types**: `id`, `board_id`, `name` (1–50), `color` (text palette key), `sort_key`, `version` and timestamps. Unique on `(board_id, lower(name))` (13A).
- **cards**: `id`, `board_id` (denormalized for isolation and the one-query board load), `column_id`, `type_id`, `title` (1–200, trimmed), `description` (text, ≤ 10,000, default `''`), `sort_key`, `props` (jsonb, `{}`), `version` and timestamps. Index on `(column_id, sort_key)`. The foreign keys use `ON DELETE RESTRICT` on `column_id` and `type_id`: the service moves or deletes the cards explicitly inside one transaction.

**Archiving**: a card's archived state comes from its column, so restoring a column brings its cards back untouched, and there is no per-card flag to keep in sync.

**Growing without painful migrations**:
- archiving single cards: add a nullable `cards.archived_at`;
- per-type custom fields: `cards.props`, validated per type later, like mapa-mental's `kind`/`props`;
- links to mapa-mental ideas and other services: a new table `external_refs` (`card_id`, `provider`, `external_id`, `url`, `metadata` jsonb) with the same shape as mapa-mental's;
- shared or multi-user boards: a `board_members` table, with `owner_id` kept as the creator;
- colors beyond the palette: the `color` column is already text, so hex values fit.

## Integrations

- **Google OAuth (if 1A)**: the server-side Authorization Code flow with `state` and `nonce`, scopes `openid email profile` only, and the app in *Testing* mode.
  - Redirect URI: `http://localhost:5174/api/auth/callback`.
  - The OAuth client can be the same Google Cloud project as mapa-mental's, with a second redirect URI, or a separate one. Either works.
- No other integrations in slice 1. Linking to mapa-mental comes later, through the `external_refs` table and an API call between the apps keyed by `google_sub` (2A).

## Security and data

- **Data**: stays in the local PostgreSQL, in the `db-data` volume. From Google, only `sub`, email, name and avatar are stored. A `pg_dump` script is included for manual backups. `docker compose down -v` deletes everything, and the README says so.
- **Secrets**: in `.env`, which is git-ignored, with an `.env.example` in the repo: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `POSTGRES_PASSWORD` and `DATABASE_URL`. No Google tokens are stored in slice 1.
- **Session**: an `HttpOnly`, `SameSite=Lax` cookie, with `Secure` set through an environment variable. Every mutation requires `X-CSRF: 1`.
- **Risks**:
  - **IDOR** (access to other users' data): every query is scoped through `boards.owner_id`, including references inside request bodies (`target`, `replace_with`, `column_id`, `type_id` must belong to the same board, or the API returns `404`/`422`). Specific tests cover each case.
  - **XSS**: titles and descriptions are always rendered as text (`white-space: pre-wrap`, never as HTML), and the SPA is served with a CSP.
  - **Mass deletions**: deleting a board, a column with cards, or a type in use shows the affected counts first, and the work happens in one transaction.
  - **Lost updates**: `version` checks return `409`, and the SPA reloads the board and shows a notice.
  - **Exposure**: ports are published only on 127.0.0.1.
- **Privacy**: an endpoint deletes the account with all its boards.

## Delivery slices

1. **MVP**: login, boards (create, rename, delete), the default columns and type, full column management including archive and restore, card types, cards (create, edit, delete, move, reorder with drag and drop or the keyboard), the shortcuts help panel, and docker compose.
2. Archive single cards, plus filtering the board by card type and searching card titles.
3. Link cards to mapa-mental ideas in both directions (`external_refs` and a shared identity by `google_sub`).
4. Deployment beyond local and a mobile-friendly view or PWA on the same API.

## Decisions made

- **FastAPI + React/TypeScript SPA (Vite)** (standard, `decisiones.md`).
- **PostgreSQL 16** (standard).
- **Python 3.12, uv and pnpm with lockfiles, ruff, TypeScript strict, 80% coverage, Vitest** (`codigo.md`). Python is pinned to 3.12 so the `pgserver` fallback works.
- **Everything versioned in English, MIT `LICENSE` at the root** (standard and request).
- **Local only with docker compose, a same-origin `/api` proxy, ports on 127.0.0.1, secrets in `.env`** (request, reusing mapa-mental ADR 0005).
- **Test DB chain `TEST_DATABASE_URL` → testcontainers → `pgserver` → skip** (request, reusing mapa-mental). It never runs against the development database and never uses SQLite.
- **Keyboard shortcuts plus visible buttons and a "?" help panel** (request, reusing mapa-mental).
- **Optimistic updates with rollback, `version` + `409`, `404` for other users' data, the CSRF header, typed client generated from OpenAPI** (reused from mapa-mental).
- **A new board gets "To Do", "In Progress", "Done" and the yellow "Task" type; a card belongs to exactly one column; moves are unrestricted; archiving a column archives its cards** (request).
- **Card types are per board, with a name and a color** (request).
- **Justified dependencies**:
  - backend: FastAPI, SQLAlchemy/Alembic, Authlib (if 1A), and in dev pytest, pytest-cov, httpx, testcontainers and pgserver;
  - frontend: React Router (state in the URL) and `@dnd-kit` (if 10A).
