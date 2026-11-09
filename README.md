# Kambi

Kambi is a Trello-style kanban board for one person, run locally with Docker Compose. You
sign in with Google, create boards, shape each board's workflow with columns, and track
cards of different types as they move across them. It is built with FastAPI, PostgreSQL and
a React SPA behind a same-origin `/api` proxy. This repository holds slice 1: the API in
`api/` and the web UI in `web/`.

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
- An OpenAPI schema at `/openapi.json`, from which the SPA's TypeScript client is generated.
- Web UI (React + TypeScript): a boards list, a board view with drag and drop for columns and
  cards, a card dialog with its own URL, per-board card types, and an archive view.
- Keyboard first: every shortcut also has a visible button, and `?` lists them all.
- Optimistic updates: changes show at once and roll back on errors; if the board changed
  elsewhere (`409`), it is reloaded with a notice.
- User text is always shown as plain text, never as HTML.

## Installation

### Requirements

- Docker with Compose v2 (OrbStack or Docker Desktop on macOS).
- For development and tests: [uv](https://docs.astral.sh/uv/) (it installs Python 3.12
  itself), and Node.js 22+ with [pnpm](https://pnpm.io/) 10 (`corepack enable`).

### 1. Google OAuth setup

1. Open the [Google Cloud console](https://console.cloud.google.com/) and create a project,
   or pick an existing one.
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

If you reuse an existing OAuth client, just add the origin and redirect URI above to it.

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
- `DEV_LOGIN`: keep `false`. Only `./run-sandbox.sh` turns it on (see "Offline sandbox").

`.env` is git-ignored. Never commit it.

### 3. Run

```sh
./run-docker.sh               # docker compose up --build, after checking .env and Docker
```

This starts three services:

- `db`: PostgreSQL 16 (not published).
- `api`: listens on `http://127.0.0.1:8001` and applies the database migrations on startup.
- `web`: the Vite dev server on `http://localhost:5174`, which proxies `/api` to the API.
  Its `node_modules` lives in the `web-node-modules` volume, and pnpm uses a fixed store
  inside the image, so a changed lockfile is reinstalled quickly on start.

To run the SPA outside Docker (with the API on `localhost:8001`):

```sh
pnpm --dir web install
pnpm --dir web dev            # http://localhost:5174, /api -> http://localhost:8001
```

Set `API_URL` to point the proxy somewhere else.

All ports are published on `127.0.0.1` only. The database port is not published at all.

### Scripts

| Script | What it does | Needs |
|---|---|---|
| `./run-docker.sh` | Starts `db`, `api` and `web` with docker compose and Google sign-in. Extra arguments go to `docker compose up` (e.g. `-d`). | Docker, `.env` |
| `./run-sandbox.sh` | Starts the app with no Docker and, once the dependencies are cached, no network: embedded PostgreSQL with its data in `.sandbox/`, the API on `127.0.0.1:8001`, the web app on `http://localhost:5174`, and "Sign in as dev user" instead of Google. Ctrl-C stops everything; the data stays. | uv, pnpm, Python 3.12 (see "Offline sandbox") |
| `./test-docker.sh` | Both test suites with coverage; the API tests get PostgreSQL from Docker (testcontainers). Extra arguments go to pytest. | Docker |
| `./test-sandbox.sh` | Both test suites with coverage, without Docker, against a temporary embedded PostgreSQL. Extra arguments go to pytest. | uv, pnpm, Python 3.12 |

The two `run-` scripts use the same ports, so run only one at a time.

> **Warning:** your data lives in the `db-data` Docker volume.
> `docker compose down -v` deletes that volume and **all your boards**. Use
> `docker compose down` (without `-v`) to stop the app and keep the data.

## Usage

Open `http://localhost:5174` and click **Sign in with Google**. Google redirects back to
`http://localhost:5174/api/auth/callback`, which the SPA's proxy forwards to the API.

- **Boards** (`/`): create a board by name; rename or delete it from the list. Deleting asks
  for confirmation and shows how many columns and cards (archived ones included) go with it.
- **Board** (`/b/<board id>`): columns in order with their cards.
  - Columns: ◀ ▶ or drag the ⠿ handle to reorder; **Rename**, **+ Column** (adds one after
    it), **Archive** and **Delete**. Deleting a column with cards asks whether to move them to
    another column or delete them; focus starts on **Cancel**. An empty column is deleted
    straight away. The last active column cannot be archived or deleted.
  - Cards: **+ Add card** at the end of a column (Enter adds and keeps the input open,
    Escape closes it). Click a card to select it, double-click (or Enter) to open it. Drag
    cards between columns, or use the toolbar's **Move to…**.
  - **Card types**: add, rename, recolor (10 palette colors) and delete types. Deleting a type
    in use asks for a replacement type. Each card shows its type's color.
- **Card** (`/b/<board id>/c/<card id>`): edit the title, the plain-text description and the
  type; **Move to…** and **Delete card** are here too. The URL can be bookmarked.
- **Archive** (`/b/<board id>/archive`): archived columns with their cards, read-only, with
  **Restore** and **Delete**.

### Keyboard shortcuts

Press `?` (or the `?` button in the header) for this list. Shortcuts are off while you type
in a field or while a dialog is open. Each one also has a visible button: in the board
toolbar, in the header (`?`), or in the dialog (`×`).

| Key | Action |
| --- | --- |
| `?` | Show keyboard shortcuts |
| `←` `→` | Select a card in the previous or next column |
| `↑` `↓` | Select the card above or below |
| `Enter` | Open the selected card |
| `F2` | Rename the selected card inline |
| `N` | Add a card to the selected column |
| `Shift+←` `Shift+→` | Move the selected card to the end of the previous or next column |
| `Shift+↑` `Shift+↓` | Move the selected card up or down |
| `Delete` / `Backspace` | Delete the selected card (asks first) |
| `Escape` | Close the open dialog |

### API

The API's interactive docs are at `http://127.0.0.1:8001/docs`. Mutations need the
`X-CSRF: 1` header. Changes to an existing entity send the `version` the client last saw: in
the body for `PATCH` and the `move`/`archive`/`restore` actions, and as `?version=` for
`DELETE`.

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
pnpm --dir web install --frozen-lockfile
uv run --directory api pytest -q --cov=app --cov-report=term-missing --cov-fail-under=80
pnpm --dir web exec vitest run --coverage
```

These are the `setup_command` and `test_command` of `.agents/project.yaml`, and what
`./test-docker.sh` runs (`./test-sandbox.sh` runs the same suites without Docker).

### API tests

The tests run against a real PostgreSQL, never SQLite and never the development database.
They pick the first available option:

1. `TEST_DATABASE_URL`, if set (it must differ from `DATABASE_URL`);
2. an ephemeral `postgres:16-alpine` container via testcontainers, if Docker is running;
3. an embedded server via `pgserver`.

If none of them works, only the database tests are skipped, with the reason. Google is
replaced by a fake, so the tests need no network. The command fails if line coverage of
`app` is below 80%.

The slice 1 acceptance criteria are listed in [`docs/S1_mvp.md`](docs/S1_mvp.md), from
`S1_AC1` to `S1_AC20`, each with its tests. Every test names its criterion
(`test_S1_AC5_…` in pytest, `"S1_AC5: …"` in Vitest), and
`tests/test_acceptance_docs.py` fails if the document and the test names disagree or a
criterion has no test.

Lint and format with `uv run --directory api ruff check .` and
`uv run --directory api ruff format .`.

`tests/test_openapi_export.py` fails if `web/openapi.json` no longer matches the API, so the
SPA's client cannot silently drift.

### Offline sandbox (no Docker, no network)

`./test-sandbox.sh` runs both suites, and `./run-sandbox.sh` runs the app, without Docker and,
once the dependencies are cached, without network access, for example from a `git archive` copy:

- Python 3.12 must already be installed. Both scripts install the dependencies through
  `sandbox-deps.sh`, trying in order:
  1. the lockfiles' versions offline, from the uv and pnpm caches (to fill them while online,
     run `uv sync --directory api` and `pnpm --dir web fetch`, or just run a script once);
  2. the lockfiles' versions with network;
  3. if the package index refuses versions the lockfiles pin (a mirror that lags behind, or a
     "minimum release age" policy, which gives `403` or `404` on recent releases): a new
     resolution within the ranges of `pyproject.toml` and `package.json` that skips releases
     newer than 14, 30, 60 or 90 days, offline first. It installs with `uv pip` and with
     pnpm's lockfile turned off, so `uv.lock` and `pnpm-lock.yaml` are never rewritten, and it
     prints a warning, since the versions then differ from the lockfiles. The cutoff that
     worked is remembered in `.sandbox/deps/`, and later runs go straight to it while the
     lockfile stays the same (delete `.sandbox/deps/` to try the lockfile again).

  A failed pnpm install can leave `web/node_modules` half-relinked (the dev server then fails
  with "Cannot find package '@babel/core'"), so every web install is checked for dangling
  links, and `web/node_modules` is removed and relinked from pnpm's store after a failed one.

  If pnpm cannot switch to the version pinned in `web/package.json` (`packageManager`), for
  example because the registry serves it unsigned, the installed pnpm is used, with a warning.
  Settings: `SANDBOX_OFFLINE=1` never uses the network, `SANDBOX_DEPS=locked` never uses
  step 3 (it fails instead), and `SANDBOX_DEPS_MIN_AGE_DAYS="30 60"` changes the cutoffs.
  The installation log goes to a temporary file, whose last lines are shown on failure.
- PostgreSQL comes from the embedded `pgserver` (wheels for Linux x86_64 and macOS, Python
  3.9 to 3.12): a temporary one for the tests (through `TEST_DATABASE_URL`, so Docker is not
  used even if it is running), and a persistent one in `.sandbox/` for the app.
  `api/scripts/sandbox_db.py` starts and stops it.
- Without the Docker CLI, the compose tests check `docker-compose.yml` as text instead of
  running `docker compose config`.
- Google sign-in needs network, so `run-sandbox.sh` sets `DEV_LOGIN=true` and does not read
  `.env`. The login page then also shows "Sign in as dev user", which signs in a fixed local
  user (`dev@localhost`) through `GET /api/auth/dev-login`. That route only exists when
  `DEV_LOGIN` is true, only answers requests from `127.0.0.1`, and is not in the OpenAPI
  schema. Never enable it outside your own machine.

### Web tests

Vitest and Testing Library render the whole SPA against `web/src/test/fakeApi.ts`, a
hand-written in-memory fake of the API with the same rules (`401`, `403` without `X-CSRF`,
`404`, `409` for a stale version, `422`). No server, database or network is needed. The
command fails if line coverage of `web/src` (tests and the generated client excluded) is
below 80%.

Each test names the slice 1 criterion it covers (`"S1_ACn: …"`, see
[`docs/S1_mvp.md`](docs/S1_mvp.md)). Drag and drop has pointer-event smoke tests with a
mocked layout, since jsdom has none.

`src/api/schema.test.ts` regenerates the TypeScript types from `web/openapi.json` and fails
if `src/api/schema.ts` differs. After changing the API, run `pnpm --dir web gen:api` (it
exports the schema with `uv` and regenerates the types) and commit both files.

Lint with `pnpm --dir web lint` and format with `pnpm --dir web format`.

## Structure

```
api/
  app/
    auth/         Google OAuth (BFF), sessions, /api/me, logout, the sandbox dev login
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
  scripts/        export_openapi.py (the schema the SPA's client is generated from) and
                  sandbox_db.py (embedded PostgreSQL for the sandbox scripts)
  tests/          pytest suite (fake Google, database chain, OpenAPI and docs drift checks)
web/
  src/
    main.tsx      entry point
    App.tsx       routes, header, and the global "?" shortcut
    session.tsx   the signed-in user: loads /api/me, handles logout and 401s
    notices.tsx   the notice area (errors, reloads, validation messages)
    api/          client.ts (fetch wrapper, X-CSRF) and schema.ts (generated, do not edit)
    board/        board view: columns, cards, dialogs, card types, state transforms, useBoard
    components/   Dialog, InlineInput
    keyboard/     the shortcut registry (shortcuts.ts) and the "?" help panel
    pages/        login, boards list, board, archive
    test/         the in-memory fake API (fakeApi.ts), render helpers and the test suites
    ordering.ts   fractional sort keys (port of the API's)
    palette.ts    hex values for the 10 palette keys
    validation.ts client-side name checks, using the API's length limits
  openapi.json    the API schema, versioned
  vite.config.ts  dev server (5174, /api proxy) and Vitest settings
  Dockerfile      dev image (pnpm store in /pnpm-store, CI=true)
docs/S1_mvp.md      slice 1: what it delivers and its acceptance criteria with their tests
docker-compose.yml  db, api and web services (127.0.0.1 only)
.env.example        every setting, with placeholder values
run-docker.sh       the app with docker compose
run-sandbox.sh      the app offline, without Docker (embedded PostgreSQL, dev login)
sandbox-deps.sh     dependency setup of the two sandbox scripts (lockfiles, or a fallback)
test-docker.sh      both test suites, PostgreSQL from Docker
test-sandbox.sh     both test suites without Docker, embedded PostgreSQL
```

## Roadmap

- [x] Slice 1, backend: skeleton, docker compose, Google login (BFF), the REST API for
  boards, columns, card types and cards, and the tests.
- [x] Slice 1, frontend: the React/TypeScript SPA in `web/`, with its proxy, a client
  generated from the OpenAPI schema, drag and drop, keyboard shortcuts with visible buttons,
  a `?` help panel, the card dialog and the archive view.
- [ ] Redirect a failed Google callback to the SPA with an error instead of raw JSON.
- [ ] Count a board's columns and cards in the delete confirmation without two extra requests.
- [ ] Decide what happens to a card type used only by archived cards (the API returns `422`).
- [ ] Decide whether a card in an archived column opens read-only or redirects to the archive.
- [ ] Confirm that Shift+↑/↓ reorders and F2 renames inline, and approve the palette's hex
  values.
- [ ] Production build, static hosting and CSP headers.
- [ ] Real-time sync between tabs (today a change made elsewhere is only seen through `409`).
- [ ] Make `test_command` fail when every database test is skipped.
- [ ] Verify `docker compose up` end to end, including building the API image.
- [ ] Slice 2: swimlanes.
- [ ] Slice 3: subtasks.
- [ ] Slice 4: checklists in tasks and subtasks.
- [ ] Slice 5: column types.
- [ ] Slice 6: estimation.
- [ ] Slice 7: velocity report.
- [ ] Later: archive single cards, filter the board by card type, search card titles.
- [ ] Later: deployment beyond localhost, and a mobile or PWA view on the same API.
- [ ] Open: account deletion and a `pg_dump` backup script.

## License

[MIT](LICENSE)
