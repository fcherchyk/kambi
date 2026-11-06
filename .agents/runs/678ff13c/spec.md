<!-- claude-readonly · claude-opus-5-5 · familia anthropic -->

# Spec: Kambi slice 1 (MVP)

## Context

Kambi is a local, single-person Trello-style kanban board. It mirrors mapa-mental's architecture and usability so the two apps can later link ideas to tasks. This slice delivers the minimum usable board: Google login, boards with editable columns and card types, and cards you can create, edit, move and reorder with the mouse or the keyboard.

> **Assumption:** this spec takes the architect's recommended option for each open design decision 1–13 (1A, 2A, 3A, 4A, 5A, 6A, 7A, 8A, 9A, 10A, 11A, 12A, 13A). `decisiones.md` notes that these were not recorded as ADRs. See open question Q1.

## Scope

### Included

- **Infrastructure**
  - Docker compose with three services, `db` (PostgreSQL 16), `api` and `web`. Ports are published only on 127.0.0.1: web `5174`, API `8001`.
  - `.env.example`, MIT `LICENSE` and a `README.md` with the required sections.
  - `.agents/project.yaml`, with `setup_command` and `test_command` (80% coverage gate on pytest and on Vitest).
- **Auth**
  - Google OAuth with the BFF pattern (copied from mapa-mental), the `HttpOnly` session cookie, `X-CSRF: 1` on every mutation, `/api/me` and logout.
- **Boards**
  - Create, rename and delete.
  - Each new board is seeded with "To Do", "In Progress", "Done" and a yellow "Task" type.
- **Columns**
  - Create (after a given column), rename and reorder.
  - Archive and restore, with an archive view.
  - Delete, with "move cards to…" or "delete cards".
  - The last active column cannot be deleted or archived.
- **Card types**
  - Create, rename, recolor (fixed palette) and delete, with reassignment of the cards that use it.
  - Names are unique per board, case-insensitive.
  - The last type cannot be deleted.
- **Cards**
  - Create (title, in a column, with the board's first type).
  - Edit title, description and type in a dialog at `/b/:boardId/c/:cardId`.
  - Delete with confirmation.
  - Move and reorder across any columns.
- **Ordering and moving**
  - Ordering by fractional `sort_key` for columns, cards and types.
  - Drag and drop with `@dnd-kit` for cards and columns, with visible button alternatives ("Move to…", ◀ ▶).
- **Keyboard**
  - Selected-card model: arrows, Shift+Arrow, `N`, Enter, F2, Delete, Escape.
  - A "?" help panel. Every shortcut also has a visible button.
- **API conventions**
  - `version` on every mutation (`409` when stale), `404` for other users' data, `422` for validation errors.
  - Optimistic updates with rollback in the SPA, and a typed client generated from OpenAPI.

### Out of scope

- Archiving single cards, filtering, search (slice 2).
- Links to mapa-mental and `external_refs` (slice 3).
- Deployment beyond local, mobile or PWA (slice 4).
- Shared or multi-user boards, custom fields (`props` exists but is unused), hex colors, rich text or Markdown in descriptions, attachments, due dates, comments.

## Acceptance criteria

### Infrastructure and auth

1. **Ports are local only**
   - **Given** the repo with a filled-in `.env`,
   - **When** `docker compose config` is run,
   - **Then** `web` is published only on `127.0.0.1:5174`, `api` only on `127.0.0.1:8001`, and `db` is not published on `0.0.0.0`.
2. **Anonymous requests are rejected**
   - **Given** a request with no session cookie,
   - **When** it calls any `/api/boards*` endpoint,
   - **Then** it gets `401`, and the SPA redirects to the login page.
3. **Mutations require the CSRF header**
   - **Given** a valid session,
   - **When** a `POST`, `PATCH` or `DELETE` is sent without `X-CSRF: 1`,
   - **Then** the API returns `403` and changes nothing.
4. **OAuth callback**
   - **Given** a Google OAuth callback with a valid `state` and `nonce` (the Google client is mocked),
   - **When** it is processed,
   - **Then** a `users` row exists with that `google_sub`, the session cookie is `HttpOnly` and `SameSite=Lax`, and no Google token is stored.

### Boards

5. **Board creation seeds defaults**
   - **Given** an authenticated user,
   - **When** they create a board named "Home",
   - **Then** in the same transaction the board gets the active columns "To Do", "In Progress" and "Done" in that order, and a single card type "Task" with color `yellow`.
6. **Rename and delete boards**
   - **Given** a board with columns, types and cards,
   - **When** the owner renames it to a valid name (1–100 chars, trimmed), the name changes.
   - **When** the owner deletes it after the confirmation that shows column and card counts, the board and all its rows are gone.
   - **Then** an empty or over-length name returns `422`.
7. **Per-user isolation**
   - **Given** user A's board,
   - **When** user B calls any read or mutation on it, or on its columns, types or cards (including passing A's ids as `target`, `replace_with`, `column_id` or `type_id`),
   - **Then** the API returns `404`, and nothing of A's changes.
8. **Stale versions**
   - **Given** any entity at `version` n,
   - **When** a mutation is sent with `version` n−1,
   - **Then** the API returns `409`, and the SPA reloads the board and shows a notice.

### Columns

9. **Create, rename and reorder columns**
   - **Given** a board with 3 columns,
   - **When** a column is created after "To Do", it appears in second position.
   - **When** a column is renamed, its name changes.
   - **When** a column is moved with ◀ ▶ or by drag, the order persists after a reload.
   - **Then** each move updates exactly one `board_columns` row.
10. **Archive and restore a column**
    - **Given** a column "Doing" with 2 cards,
    - **When** it is archived,
    - **Then** it and its cards disappear from `GET /api/boards/{id}` and appear in `GET /api/boards/{id}/archive`. The archive view shows them read-only, and any edit or move of those cards returns `422`.
    - **When** it is restored, the column returns to its original position with both cards unchanged.
11. **Delete a column with cards**
    - **Given** a column with N > 0 cards,
    - **When** it is deleted with `?cards=move&target=X`, all N cards end up at the end of X, in their relative order.
    - **When** it is deleted with `?cards=delete`, the column and the N cards are deleted.
    - **Then** with no `cards` parameter, or with a `target` from another board, the API returns `422`. The SPA dialog shows N and starts with focus on "Cancel". An empty column is deleted without a dialog.
12. **The last active column is protected**
    - **Given** a board with exactly one active column,
    - **When** a request deletes or archives it,
    - **Then** the API returns `422`, and the UI disables those actions.

### Card types

13. **Create, rename and recolor types**
    - **Given** a board,
    - **When** a type is created with a name and a color from the palette, it is listed.
    - **When** it is renamed or recolored, the change is reflected on its cards.
    - **Then** a color outside the palette, an empty name, a name over 50 chars, or a duplicate name (case-insensitive) in the same board returns `422`.
14. **Delete a type**
    - **Given** type "Bug" used by N cards and another type "Task",
    - **When** "Bug" is deleted with `?replace_with=<Task>`,
    - **Then** the N cards have type "Task" and "Bug" no longer exists.
    - **And** with N > 0 and no `replace_with` the API returns `422`, deleting the board's last type returns `422`, and an unused type is deleted without a dialog.

### Cards

15. **Create a card**
    - **Given** a column,
    - **When** a card is created from the inline input with title "Buy milk",
    - **Then** it appears at the end of that column with the board's first type, an empty description, and its title trimmed. An empty title or a title over 200 chars returns `422`. Enter creates the card and opens a new input, and Escape cancels.
16. **Edit a card**
    - **Given** a card,
    - **When** `/b/:boardId/c/:cardId` is opened directly in the browser,
    - **Then** the card dialog shows its title, description and type.
    - **And** editing them persists the change. A description over 10,000 chars or a `type_id` from another board returns `422`.
    - **And** a title or description containing `<script>` is rendered as literal text.
17. **Move a card**
    - **Given** a card in "To Do",
    - **When** it is moved to "Done" (any column), after a given card, by drag, by Shift+Arrow or with "Move to…",
    - **Then** it shows in that position after a reload, and only that card's row changes.
    - **And** a `column_id` from another board returns `404` or `422`.
18. **Delete a card**
    - **Given** a card,
    - **When** Delete is pressed or the delete button is clicked,
    - **Then** a confirmation dialog appears. Confirming deletes the card, and canceling leaves it untouched.
19. **Optimistic rollback**
    - **Given** the SPA with a fake API that fails a card move,
    - **When** the user moves a card,
    - **Then** the card first shows in the new position, then returns to the original one, and an error notice is shown.

### Keyboard and help

20. **Keyboard model**
    - **Given** a board with a selected card,
    - **When** the user presses ← → or ↑ ↓, the selection moves across or within columns.
    - **When** they press Enter, the card dialog opens. F2 starts renaming the card, and `N` opens the add-card input in the selected column.
    - **When** they press Escape, the open dialog closes.
    - **Then** each of these actions also has a visible button.
21. **Help panel**
    - **Given** any page,
    - **When** "?" is pressed or the "?" button is clicked,
    - **Then** a panel lists every shortcut that exists, and a test fails if a registered shortcut is missing from the panel.

### Quality

22. **Test and coverage gate**
    - **Given** a machine with no Docker and no `TEST_DATABASE_URL`,
    - **When** `test_command` runs,
    - **Then** the backend tests run against `pgserver`, and the command fails if line coverage drops below 80% in `api/` or in `web/`.

## Risks and open questions

- **Q1 – Decisions 1–13 are not recorded.** `decisiones.md` assumes they were approved with the recommendations, but there is no ADR for login, card title, archive view, column and type deletion, drag and drop, keyboard model, palette or uniqueness. This spec takes the recommendations. Should they become ADRs (for example 0012–0016) before implementation starts?
- **Q2 – Palette.** The exact list of about 10 colors (keys, hex values, text contrast) is not defined. Who fixes it, and is the yellow "Task" type's key `yellow`?
- **Q3 – Account deletion and `pg_dump`.** The architecture mentions an account-deletion endpoint and a backup script, but the slice 1 list does not include them. Are they in or out?
- **Q4 – Google OAuth client.** Reuse mapa-mental's Google Cloud project with a second redirect URI, or create a separate one? This affects the `.env.example` instructions.
- **Q5 – CSP.** The architecture says the SPA is served with a CSP, but Vite's dev server is what serves it locally. Where is the header set, and is it tested?
- **Q6 – Archive and positions.** Restoring a column "to its original position" relies on its `sort_key`. If a column was created or moved next to it in the meantime, the final position may not match the user's expectation. Is "same `sort_key`" an acceptable definition?
- **Q7 – Inactive card dialog.** If `/b/:boardId/c/:cardId` points to a card in an archived column, what should happen: a read-only dialog, or a redirect to the archive view?
- **Risk – slice size.** Auth, columns, types, cards, drag and drop, keyboard and archive together make a large first slice. If it needs to shrink, drag and drop (10B) is the natural part to defer, since the button alternatives already exist.
- **Risk – drag and drop tests.** Testing `@dnd-kit` in jsdom is brittle. The proposal is to cover moves through the keyboard and button paths, and test dragging only with a pointer-event smoke test.
- **Risk – rule conflict.** `codigo.md` still names only testcontainers for test databases, while ADR 0006 and `decisiones.md` add `pgserver` and skipping. This spec follows the ADR. Should `codigo.md` be updated to match?
