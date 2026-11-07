<!-- claude · claude-opus-5-5 · familia anthropic -->

The slice 1 backend is in place. The test command passes: 174 tests, 99% line coverage of `app`, and ruff is clean. I haven't run `docker compose up` or built the API image. The compose file is only checked through `docker compose config` inside the tests. Nothing is committed.

## Files touched
- **Root:** `docker-compose.yml`, `.env.example`, `LICENSE` (MIT), `.gitignore` (extended) and `README.md` (rewritten). I deleted the root `pyproject.toml` and `.coveragerc`, because their replacements now live in `api/`.
- **`api/`:** `pyproject.toml`, `uv.lock`, `.python-version`, `.coveragerc`, `Dockerfile`, `.dockerignore`, `alembic.ini`, and `migrations/` with the initial revision `0001_initial.py`.
- **`api/app/`:**
  - `config.py`, `db.py`, `errors.py`, `schemas.py`, `ordering.py` and `main.py` (the app factory, which also enforces `X-CSRF: 1`).
  - One package per domain (`auth`, `boards`, `columns`, `card_types`, `cards`), each with its models, schemas, service and router.
- **`api/tests/`:** the database fallback chain, the fake Google and test helpers, plus one test file per area. Test names say which acceptance criterion (1–17) they cover.
- **`.agents/progress.md`.**

## Decisions
- **`joserfc` instead of Authlib.** Authlib's `authlib.jose` raises a deprecation warning and points to `joserfc`, from the same author. I use it only to verify Google's ID token. The calls to Google use the standard library (`urllib`), so `httpx` stays a dev-only dependency.
- **`itsdangerous` isn't needed.** The login `state` and `nonce` live in a short-lived cookie signed with stdlib HMAC.
- **Sessions:** only a SHA-256 hash of the session token is stored, and no Google token is kept.
- **Versions:** sent in the body for `PATCH`, `move`, `archive` and `restore`, and as `?version=` on `DELETE` (spec Q4). Board deletion doesn't check the versions of the rows it removes with the board.
- **404 vs 422:** another user's id in the URL gets `404`; another board's id in the body or query string gets `422` (spec Q6).
- **Palette:** the 10 keys proposed in spec Q3.
- **Archived columns are read-only:** their cards can't be edited, moved or deleted (`422`), and the column itself can't be renamed or moved until it's restored.
- **Restore keeps the original position.** New column positions also skip keys held by archived columns, so a restored column never ties with one created after it.
- **Creating a column:** `after_id` set to a column inserts after it, `null` puts it first, and omitting it appends at the end.
- **The DB session commits before the response is sent,** so a failed commit can't come back as a success.
- **The `web` service builds from `web/`.** `docker compose config` accepts that even though the folder doesn't exist yet. Until it does, the README says to run `docker compose up db api` (spec Q5).

## Proposed ADRs (I didn't edit `.agents/memory/`)
1. Amend ADR 0011:
   - replace Authlib with `joserfc`;
   - add `psycopg[binary]` and `uvicorn` as runtime dependencies;
   - add `ruff` as a dev dependency.
   - This answers spec Q2, with no `itsdangerous` or `pydantic-settings`.
2. Spec Q1 is still open: `project.yaml` has `preflight: docker info`, but ADR 0006 says no Docker preflight is needed. I didn't change `project.yaml`.

## Open issues
- The permission checker rejected the literal `setup_command` because of its `{ … }` group. I ran `uv sync --directory api`, which is equivalent while `web/` doesn't exist. Other commands it rejected are listed in `progress.md`: `git mv`, `git rm`, `uv run python -c`, and reading `../mapa-mental`. Because I couldn't read mapa-mental, the auth code is written from scratch rather than copied from it.
- The test command still passes if every database test is skipped. That risk from the spec remains.

## How to try it
```sh
uv sync --directory api
uv run --directory api pytest -q --cov=app --cov-report=term-missing --cov-fail-under=80
cp .env.example .env    # fill in the Google client ID/secret (README has the steps), SESSION_SECRET and POSTGRES_PASSWORD
docker compose up --build db api   # API on http://127.0.0.1:8001/docs
```
