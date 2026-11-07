# Kambi

Kambi is a Trello-style kanban board for one person, run locally with Docker Compose. You
sign in with Google, create boards, shape each board's workflow with columns, and track
cards of different types as they move across them. It mirrors the architecture of
mapa-mental (FastAPI, PostgreSQL, a React SPA behind a same-origin `/api` proxy), so the two
apps can later link ideas to tasks. This repository currently holds the **backend** of slice 1.
The web UI (`web/`) arrives in the next iteration.

## Features

- Google sign-in with the BFF pattern: the server runs the OAuth flow and the browser only
  gets an `HttpOnly`, `SameSite=Lax` session cookie. No Google token is stored.
- CSRF protection: every `POST`, `PATCH` and `DELETE` requires the `X-CSRF: 1` header.
- Boards: list, create, rename and delete. New boards start with the columns "To Do",
  "In Progress" and "Done" and a yellow "Task" card type.
- Columns: create at any position, rename, reorder, archive and restore (with their cards),
  and delete, either moving the cards to another column or deleting them. Archived columns
  are read-only until restored.
- Card types per board: name (unique per board, case-insensitive) and a palette color.
  Deleting a type in use reassigns its cards to another type.
- Cards: title, plain-text description and type. They move freely between any columns.
- Manual ordering with fractional sort keys: a move updates a single row.
- Optimistic concurrency: every change carries a `version`, and a stale one returns `409`.
- Per-user isolation: another user's ids in the URL answer `404`; ids from another board
  inside a body or query string answer `422`.
- An OpenAPI schema at `/openapi.json`, for generating the TypeScript client.

## Installation

### Requirements

- Docker with Compose v2 (OrbStack or Docker Desktop on macOS).
- For development and tests: [uv](https://docs.astral.sh/uv/). It installs Python 3.12
  itself.

### 1. Google OAuth setup

1. Open the [Google Cloud console](https://console.cloud.google.com/) and create a project,
   or pick an existing one (mapa-mental's project works too).
2. Go to **APIs & Services → OAuth consent screen** (called **Google Auth Platform** in newer
   consoles):
   - User type: **External**.
   - Fill in the app name (for example "Kambi") and your email addresses.
   - Scopes: add only `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
   - Leave the app in **Testing** mode and add your Google account under **Test users**.
3. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized JavaScript origins: `http://localhost:5174`.
   - Authorized redirect URIs: `http://localhost:5174/api/auth/callback`.
4. Copy the **Client ID** and **Client secret** from the client's details. In the next step,
   the Client ID goes in `GOOGLE_CLIENT_ID` and the secret in `GOOGLE_CLIENT_SECRET`.

If you reuse mapa-mental's OAuth client, just add the redirect URI above to it.

### 2. Configure

```sh
cp .env.example .env
```

Edit `.env`:

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: from step 1.
- `SESSION_SECRET`: a long random string, for example from
  `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`.
- `POSTGRES_PASSWORD`: any password. Use the same one inside `DATABASE_URL`.
- `OAUTH_REDIRECT_URI`: leave the default, `http://localhost:5174/api/auth/callback`.
- `COOKIE_SECURE`: keep `false` for `http://localhost`.

`.env` is git-ignored. Never commit it.

### 3. Run

Until the `web/` app exists, start only the database and the API:

```sh
docker compose up --build db api
```

The API listens on `http://127.0.0.1:8001` and applies the database migrations on startup.
Once `web/` lands, `docker compose up --build` also starts the SPA on
`http://localhost:5174`, which proxies `/api` to the API.

All ports are published on `127.0.0.1` only. The database port is not published at all.

> **Warning:** your data lives in the `db-data` Docker volume.
> `docker compose down -v` deletes that volume and **all your boards**. Use
> `docker compose down` (without `-v`) to stop the app and keep the data.

## Usage

Sign-in needs the `web` service on port 5174: Google redirects to
`http://localhost:5174/api/auth/callback`, and the SPA's proxy forwards it to the API. So
the login flow completes once `web/` exists. Until then, the API is reachable on its own,
and its interactive docs are at `http://127.0.0.1:8001/docs`.

Mutations need the `X-CSRF: 1` header. Changes to an existing entity send the `version` the
client last saw: in the body for `PATCH` and the `move`/`archive`/`restore` actions, and as
`?version=` for `DELETE`.

For example, creating a board, with a session cookie from the login flow:

```sh
curl -s -X POST http://127.0.0.1:8001/api/boards \
  -H 'Content-Type: application/json' -H 'X-CSRF: 1' \
  -b 'kambi_session=<session cookie value>' \
  -d '{"name": "Home"}'
```

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/auth/login` | Start the Google sign-in |
| `GET` | `/api/auth/callback` | Google redirect target (opens the session) |
| `POST` | `/api/auth/logout` | Close the session |
| `GET` | `/api/me` | The signed-in user |
| `GET`, `POST` | `/api/boards` | List or create boards |
| `GET`, `PATCH`, `DELETE` | `/api/boards/{id}` | The active board (columns, types, cards), rename, delete |
| `GET` | `/api/boards/{id}/archive` | Archived columns with their cards |
| `POST` | `/api/boards/{id}/columns` | Create a column (`after_id`: a column, `null` for first, omitted to append) |
| `PATCH`, `DELETE` | `/api/columns/{id}` | Rename; delete with `?cards=move&target={id}` or `?cards=delete` |
| `POST` | `/api/columns/{id}/move` | Reorder (`after_id`, `null` for first) |
| `POST` | `/api/columns/{id}/archive`, `/restore` | Archive or restore a column with its cards |
| `POST` | `/api/boards/{id}/card-types` | Create a card type |
| `PATCH`, `DELETE` | `/api/card-types/{id}` | Rename or recolor; delete with `?replace_with={id}` |
| `POST` | `/api/columns/{id}/cards` | Create a card at the end of a column |
| `PATCH`, `DELETE` | `/api/cards/{id}` | Edit title, description or type; delete |
| `POST` | `/api/cards/{id}/move` | Move to any column (`column_id`, `after_id`) |

Palette colors: `yellow`, `orange`, `red`, `pink`, `purple`, `blue`, `teal`, `green`,
`gray`, `brown`.

Status codes: `401` without a session, `403` without `X-CSRF: 1`, `404` for anything that is
not yours, `409` for a stale `version`, and `422` for invalid input, such as an id from
another board, deleting the last active column or the last type, or touching cards in an
archived column.

## Tests

```sh
uv sync --directory api
uv run --directory api pytest -q --cov=app --cov-report=term-missing --cov-fail-under=80
```

This is the `test_command` of `.agents/project.yaml` for the API part. The frontend part is
added once `web/` exists.

The tests run against a real PostgreSQL, never SQLite and never the development database.
They pick the first available option:

1. `TEST_DATABASE_URL`, if set (it must differ from `DATABASE_URL`);
2. an ephemeral `postgres:16-alpine` container via testcontainers, if Docker is running;
3. an embedded server via `pgserver`.

If none of them works, only the database tests are skipped, with the reason. Google is
replaced by a fake, so the tests need no network. The command fails if line coverage of
`app` is below 80%.

The suite covers each acceptance criterion of the slice 1 backend spec, with test names that
state the criterion. In short: the compose and `.env.example` rules, the Google login and
its state and nonce checks, `401` and `403` handling, board, column, card type and card
rules, per-user isolation, optimistic versions, fractional ordering, and the database chain.

Lint and format with `uv run --directory api ruff check .` and
`uv run --directory api ruff format .`.

## Structure

```
api/
  app/
    auth/         Google OAuth (BFF), sessions, /api/me, logout
    boards/       boards, the full board load and the archive view
    columns/      columns: placement, archive/restore, deletion with cards
    card_types/   card types and deletion with replacement
    cards/        cards: create, edit, move, delete
    config.py     settings read from environment variables
    db.py         engine, sessions and the declarative base
    errors.py     shared HTTP errors and the version check
    schemas.py    shared field types (names, versions, palette)
    ordering.py   fractional sort keys
    main.py       app factory and the CSRF check
  migrations/     Alembic migrations
  tests/          pytest suite (fake Google, database chain)
docker-compose.yml  db, api and web services (127.0.0.1 only)
.env.example        every setting, with placeholder values
```

## Roadmap

- [x] Slice 1, backend: skeleton, docker compose, Google login (BFF), the REST API for
  boards, columns, card types and cards, and the tests.
- [ ] Slice 1, frontend: the React/TypeScript SPA in `web/`, with its proxy, a client
  generated from the OpenAPI schema, drag and drop, keyboard shortcuts with visible buttons,
  a `?` help panel, the card dialog and the archive view.
- [ ] Make `test_command` fail when every database test is skipped.
- [ ] Verify `docker compose up` end to end, including building the API image.
- [ ] Slice 2: archive single cards, filter the board by card type, search card titles.
- [ ] Slice 3: link cards to mapa-mental ideas in both directions, keyed by the Google `sub`.
- [ ] Slice 4: deployment beyond localhost, and a mobile or PWA view on the same API.
- [ ] Open: account deletion and a `pg_dump` backup script.

## License

[MIT](LICENSE)
