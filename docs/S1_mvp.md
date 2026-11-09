# Slice 1: MVP

Slice 1 is the minimum usable Kambi: a local, single-person, Trello-style kanban board.

## What it delivers

- **Sign-in:** Google, with the BFF pattern. The server runs the OAuth flow, and the browser only gets an `HttpOnly` session cookie; no Google token is stored. Offline, an opt-in dev login replaces it.
- **Boards:** create, rename and delete. New boards start with "To Do", "In Progress", "Done" and a yellow "Task" type.
- **Columns:** create at any position, rename and reorder. They can be archived and restored with their cards, or deleted, either moving their cards elsewhere or deleting them. The last active column is protected.
- **Card types:** per board, with a name and a palette color. Deleting a type in use reassigns its cards.
- **Cards:** title, plain-text description and type. They are created inline, edited in a dialog with its own URL, and move freely between any columns.
- **Use:** with the mouse (including drag and drop) or the keyboard. Every shortcut also has a visible button.
- **Robustness:** optimistic updates with rollback, versioned writes (`409` on conflicts), per-user isolation and CSRF protection.
- **Running it:** locally with Docker (`run-docker.sh`), or offline without Docker (`run-sandbox.sh`).

**Not in slice 1:** swimlanes (slice 2), subtasks (3), checklists in tasks and subtasks (4), column types (5), estimation (6) and a velocity report (7). Later: archiving single cards, filters, search, real-time sync, deployment beyond localhost and mobile. See the README roadmap.

## Acceptance criteria

Each criterion is named `S1_ACn`. Every test of the API (pytest) and the web app (Vitest) carries its criterion in its name:
- pytest: `test_S1_ACn_…`;
- Vitest: `"S1_ACn: …"`. A test that covers two criteria names both, e.g. `"S1_AC5, S1_AC7: …"`.

`api/tests/test_acceptance_docs.py` keeps this list and the tests in sync. It fails if:
- a criterion has no test;
- a test listed here does not exist, or exists and is not listed;
- a test has no criterion, or names one that is not defined here.

### S1_AC1: Local stack and configuration

Given the repo and a `.env` copied from `.env.example`, when the stack is configured, then `api` is published only on `127.0.0.1:8001`, `web` only on `127.0.0.1:5174` (Vite with `strictPort`, proxying `/api` to `http://localhost:8001` or `API_URL`, and able to compile the SPA with every plugin) and `db` is not published. `.env.example` lists every variable the app reads, with no real values. Settings are read from the environment, missing required ones fail with their names, and database URLs use psycopg 3.

**Tests (13):**

- `api/tests/test_compose.py::test_S1_AC1_compose_publishes_only_on_localhost`
- `api/tests/test_compose.py::test_S1_AC1_env_example_lists_every_variable_without_real_values`
- `api/tests/test_compose.py::test_S1_AC1_compose_reads_only_variables_listed_in_env_example`
- `api/tests/test_config_and_schema.py::test_S1_AC1_settings_from_env_with_defaults`
- `api/tests/test_config_and_schema.py::test_S1_AC1_settings_from_env_reads_optional_values`
- `api/tests/test_config_and_schema.py::test_S1_AC1_settings_from_env_reports_missing_variables`
- `api/tests/test_config_and_schema.py::test_S1_AC1_parse_bool`
- `api/tests/test_config_and_schema.py::test_S1_AC1_database_urls_use_psycopg_3`
- `web/src/test/config.test.ts` › "S1_AC1: Vite serves on 5174 with strictPort and proxies /api to localhost:8001 by default"
- `web/src/test/config.test.ts` › "S1_AC1: API_URL=http://api:8001 sends the proxy to the api service"
- `web/src/test/config.test.ts` › "S1_AC1: the web service builds ./web, publishes 127.0.0.1:5174 and keeps node_modules in a volume"
- `web/src/test/config.test.ts` › "S1_AC1: the dev server compiles a component with every plugin (their dependencies are installed)"
- `web/src/test/config.test.ts` › "S1_AC1: the Dockerfile uses a fixed pnpm store and CI=true"

### S1_AC2: Google sign-in

Given an anonymous user, any route shows the login screen, whose "Sign in with Google" points to `/api/auth/login`. The server runs the OAuth flow (BFF) with minimal scopes, `state` and `nonce`: after the callback exactly one user row exists per Google `sub` (reused on later logins), the session cookie is `HttpOnly` and `SameSite=Lax` (`Secure` from settings), and no Google token is stored. A wrong or missing `state`, `code` or login cookie, a wrong `nonce`, an invalid ID token or a provider error returns `400` and creates no session.

**Tests (18):**

- `api/tests/test_auth.py::test_S1_AC2_login_creates_user_and_httponly_lax_session`
- `api/tests/test_auth.py::test_S1_AC2_second_login_reuses_the_user_row`
- `api/tests/test_auth.py::test_S1_AC2_no_table_stores_google_tokens`
- `api/tests/test_auth.py::test_S1_AC2_wrong_state_returns_400_without_session`
- `api/tests/test_auth.py::test_S1_AC2_callback_without_login_cookie_returns_400`
- `api/tests/test_auth.py::test_S1_AC2_callback_without_code_returns_400`
- `api/tests/test_auth.py::test_S1_AC2_callback_without_state_returns_400`
- `api/tests/test_auth.py::test_S1_AC2_tampered_login_cookie_returns_400`
- `api/tests/test_auth.py::test_S1_AC2_wrong_nonce_returns_400_without_session`
- `api/tests/test_auth.py::test_S1_AC2_provider_error_returns_400`
- `api/tests/test_auth.py::test_S1_AC2_secure_cookie_flag_comes_from_settings`
- `api/tests/test_google_client.py::test_S1_AC2_authorization_url_asks_for_minimal_scopes_with_state_and_nonce`
- `api/tests/test_google_client.py::test_S1_AC2_fetch_identity_exchanges_the_code_and_verifies_the_id_token`
- `api/tests/test_google_client.py::test_S1_AC2_fetch_identity_rejects_invalid_claims`
- `api/tests/test_google_client.py::test_S1_AC2_fetch_identity_rejects_a_token_signed_with_another_key`
- `api/tests/test_google_client.py::test_S1_AC2_fetch_identity_without_id_token_fails`
- `api/tests/test_google_client.py::test_S1_AC2_network_errors_become_identity_errors`
- `web/src/test/session.test.tsx` › "S1_AC2: %s shows the login screen when /api/me answers 401"

### S1_AC3: Sessions, logout and CSRF

Requests without a valid session (missing, invalid or expired cookie) get `401` on `/api/me` and every board, column, card type and card endpoint, and the SPA then shows the login screen. "Log out" sends `POST /api/auth/logout` and the old cookie gets `401` afterwards. Every `POST`, `PATCH` and `DELETE` without `X-CSRF: 1` gets `403` and changes nothing; the SPA's client sends the header on every mutation and reports API errors readably.

**Tests (15):**

- `api/tests/test_auth.py::test_S1_AC3_anonymous_requests_get_401`
- `api/tests/test_auth.py::test_S1_AC3_invalid_session_cookie_gets_401`
- `api/tests/test_auth.py::test_S1_AC3_expired_session_cookie_gets_401`
- `api/tests/test_auth.py::test_S1_AC3_logout_invalidates_the_cookie`
- `api/tests/test_auth.py::test_S1_AC3_logout_without_session_is_harmless`
- `api/tests/test_auth.py::test_S1_AC3_mutations_without_csrf_header_get_403_and_change_nothing`
- `api/tests/test_auth.py::test_S1_AC3_anonymous_without_csrf_header_is_rejected`
- `web/src/test/client.test.ts` › "S1_AC3: every mutation of each resource carries X-CSRF: 1, and GETs do not need it"
- `web/src/test/client.test.ts` › "S1_AC3: column actions send the version in the body or the query"
- `web/src/test/client.test.ts` › "S1_AC3: raises ApiError with the server's message and status"
- `web/src/test/client.test.ts` › "S1_AC3: reports validation errors and non-JSON failures readably"
- `web/src/test/optimistic.test.tsx` › "S1_AC3, S1_AC7: a 401 during a mutation shows the login screen"
- `web/src/test/session.test.tsx` › "S1_AC3: Log out sends POST /api/auth/logout and shows the login screen"
- `web/src/test/session.test.tsx` › "S1_AC3: a 401 on a later call shows the login screen"
- `web/src/test/session.test.tsx` › "S1_AC3: shows an error notice when the server cannot be reached"

### S1_AC4: Offline sandbox and dev login

With `DEV_LOGIN=true` (set only by `run-sandbox.sh`), `GET /api/auth/dev-login` signs in a fixed local user (`dev@localhost`), reusing it on later logins; the route answers only loopback clients (`403` otherwise), is not in the OpenAPI schema, and does not exist (`404`) when the flag is off. The login screen offers "Sign in as dev user" only when `VITE_DEV_LOGIN` is true. The sandbox database helper only accepts plain database names.

**Tests (7):**

- `api/tests/test_auth.py::test_S1_AC4_dev_login_does_not_exist_by_default`
- `api/tests/test_auth.py::test_S1_AC4_dev_login_signs_in_the_dev_user_and_reuses_it`
- `api/tests/test_auth.py::test_S1_AC4_dev_login_refuses_non_loopback_clients`
- `api/tests/test_auth.py::test_S1_AC4_dev_login_is_not_in_the_openapi_schema`
- `api/tests/test_sandbox_db.py::test_S1_AC4_create_database_sql_for_a_plain_name`
- `api/tests/test_sandbox_db.py::test_S1_AC4_create_database_sql_rejects_unsafe_names`
- `web/src/test/session.test.tsx` › "S1_AC4: offers the dev login only when VITE_DEV_LOGIN is true"

### S1_AC5: Boards

Creating a board trims its name and seeds the columns "To Do", "In Progress" and "Done" and a yellow "Task" type, atomically. A board can be renamed (its `version` goes up by 1) and deleted with every row it owns, after a confirmation that shows its column and card counts. Names are 1 to 100 characters after trimming; the SPA validates them before sending. The list shows only the caller's boards.

**Tests (17):**

- `api/tests/test_boards.py::test_S1_AC5_new_board_is_trimmed_and_gets_default_columns_and_type`
- `api/tests/test_boards.py::test_S1_AC5_failed_seeding_leaves_no_rows`
- `api/tests/test_boards.py::test_S1_AC5_rename_increments_version`
- `api/tests/test_boards.py::test_S1_AC5_invalid_board_names_return_422`
- `api/tests/test_boards.py::test_S1_AC5_name_of_100_chars_after_trim_is_valid`
- `api/tests/test_boards.py::test_S1_AC5_delete_removes_every_row_of_the_board`
- `api/tests/test_boards.py::test_S1_AC5_list_returns_only_the_callers_boards`
- `api/tests/test_boards.py::test_S1_AC5_archive_of_a_board_without_archived_columns_is_empty`
- `web/src/test/boards.test.tsx` › "S1_AC5: creating a board lists it, and opening it shows the three default columns"
- `web/src/test/boards.test.tsx` › "S1_AC5: renaming a board shows the new name"
- `web/src/test/boards.test.tsx` › "S1_AC5: creating a board with exactly 100 characters succeeds"
- `web/src/test/boards.test.tsx` › "S1_AC5: a %s board name shows a validation message and sends nothing"
- `web/src/test/boards.test.tsx` › "S1_AC5: an invalid rename shows a validation message and sends nothing"
- `web/src/test/boards.test.tsx` › "S1_AC5: pressing Escape on delete confirmation cancels and keeps the board"
- `web/src/test/boards.test.tsx` › "S1_AC5: deleting a board confirms with its column and card counts"
- `web/src/test/boards.test.tsx` › "S1_AC5, S1_AC7: restores the list and shows an error when the API rejects a change"
- `web/src/test/boards.test.tsx` › "S1_AC5, S1_AC7: reloads the list with a notice on a 409"

### S1_AC6: Per-user isolation

Given user A's board, any read or change by user B of A's boards, columns, types or cards returns `404`, and A's ids inside B's bodies or query strings (`target`, `replace_with`, `column_id`, `type_id`, `after_id`) return `422`. Nobody's rows change.

**Tests (2):**

- `api/tests/test_isolation.py::test_S1_AC6_foreign_entities_in_the_path_return_404`
- `api/tests/test_isolation.py::test_S1_AC6_foreign_ids_in_body_or_query_return_422`

### S1_AC7: Optimistic versioning, rollback and 409

Every mutation carries the entity's `version`: a stale or future one returns `409` and changes nothing, the current one succeeds and increments it. In the SPA changes show at once, roll back with an error notice when the API rejects them, and a `409` reloads the board (or list) with a notice saying it changed elsewhere.

**Tests (11):**

- `api/tests/test_versioning.py::test_S1_AC7_stale_version_returns_409_and_current_one_succeeds`
- `api/tests/test_versioning.py::test_S1_AC7_restore_checks_the_version`
- `api/tests/test_versioning.py::test_S1_AC7_version_must_be_positive`
- `api/tests/test_versioning.py::test_S1_AC7_future_version_returns_409`
- `web/src/test/archive.test.tsx` › "S1_AC10, S1_AC7: rolls back and shows an error when restoring fails"
- `web/src/test/boards.test.tsx` › "S1_AC5, S1_AC7: restores the list and shows an error when the API rejects a change"
- `web/src/test/boards.test.tsx` › "S1_AC5, S1_AC7: reloads the list with a notice on a 409"
- `web/src/test/optimistic.test.tsx` › "S1_AC7: a failed card move shows the new position, then rolls back with an error notice"
- `web/src/test/optimistic.test.tsx` › "S1_AC7: a 409 on a rename reloads the board and says so"
- `web/src/test/optimistic.test.tsx` › "S1_AC7: rolls back a failed column rename, archive and delete"
- `web/src/test/optimistic.test.tsx` › "S1_AC3, S1_AC7: a 401 during a mutation shows the login screen"

### S1_AC8: Fractional ordering

Sort keys generated before, between or after existing keys (including 50 inserts at the same position) sort strictly between their neighbors in PostgreSQL's `C` collation, with no renumbering, and the SPA generates the same keys as the API. Moving a column or a card changes the `sort_key` of exactly one row.

**Tests (13):**

- `api/tests/test_ordering.py::test_S1_AC8_key_between_sorts_strictly_between_neighbors`
- `api/tests/test_ordering.py::test_S1_AC8_fifty_inserts_at_the_same_position`
- `api/tests/test_ordering.py::test_S1_AC8_random_inserts_match_postgres_c_collation`
- `api/tests/test_ordering.py::test_S1_AC8_sort_key_columns_use_the_c_collation`
- `api/tests/test_ordering.py::test_S1_AC8_keys_after_and_anchor_helpers`
- `api/tests/test_ordering.py::test_S1_AC8_invalid_keys_are_rejected`
- `api/tests/test_ordering.py::test_S1_AC8_moving_a_column_changes_exactly_one_row`
- `api/tests/test_ordering.py::test_S1_AC8_moving_a_column_after_another_changes_exactly_one_row`
- `api/tests/test_ordering.py::test_S1_AC8_moving_a_card_changes_sort_key_of_exactly_one_row`
- `web/src/ordering.test.ts` › "S1_AC8: generates keys strictly between their neighbors"
- `web/src/ordering.test.ts` › "S1_AC8: matches the API's keys for appends"
- `web/src/ordering.test.ts` › "S1_AC8: rejects neighbors in the wrong order"
- `web/src/ordering.test.ts` › "S1_AC8: places an item after a sibling, first, or last when the sibling is unknown"

### S1_AC9: Columns: create, rename, move

A column can be created at any position (after a given column, first, or appended), renamed with the 1–100 character rule, and moved with ◀/▶ or by dragging, sending a single move request that persists. Invalid names are rejected by the SPA before sending.

**Tests (16):**

- `api/tests/test_columns.py::test_S1_AC9_column_created_after_to_do_is_second`
- `api/tests/test_columns.py::test_S1_AC9_column_without_after_id_is_appended_and_null_is_first`
- `api/tests/test_columns.py::test_S1_AC9_rename_follows_the_name_rule`
- `api/tests/test_columns.py::test_S1_AC9_invalid_column_names_return_422`
- `api/tests/test_columns.py::test_S1_AC9_name_of_100_chars_after_trim_is_valid`
- `api/tests/test_columns.py::test_S1_AC9_move_to_the_end_persists`
- `api/tests/test_columns.py::test_S1_AC9_move_after_itself_or_unknown_column_returns_422`
- `web/src/test/columns.test.tsx` › "S1_AC9: a column added after To Do shows in second position"
- `web/src/test/columns.test.tsx` › "S1_AC9: a column added at the end is appended"
- `web/src/test/columns.test.tsx` › "S1_AC9: a column added with exactly 100 characters succeeds"
- `web/src/test/columns.test.tsx` › "S1_AC9: renaming a column shows the new name"
- `web/src/test/columns.test.tsx` › "S1_AC9: ◀ moves Done before In Progress with one move request"
- `web/src/test/columns.test.tsx` › "S1_AC9: ▶ moves a column right, and the ends are disabled"
- `web/src/test/columns.test.tsx` › "S1_AC9: shows Board not found for an unknown board"
- `web/src/test/columns.test.tsx` › "S1_AC9: rejects an invalid column name (empty or >100 chars) without sending anything"
- `web/src/test/dragAndDrop.test.tsx` › "S1_AC9: dragging a column sends the same move request as ◀"

### S1_AC10: Archive and restore a column

Archiving a column hides it and its cards from the board and shows them in the read-only archive view (`/b/:boardId/archive`); its cards cannot be edited, moved or used as targets (`422`). Restoring it brings the column back at its original position with its cards unchanged. A column can also be deleted from the archive.

**Tests (13):**

- `api/tests/test_columns.py::test_S1_AC10_archived_column_and_cards_move_to_the_archive`
- `api/tests/test_columns.py::test_S1_AC10_cards_in_an_archived_column_are_read_only`
- `api/tests/test_columns.py::test_S1_AC10_restore_brings_back_column_and_cards_untouched`
- `api/tests/test_columns.py::test_S1_AC10_restoring_an_active_column_returns_422`
- `api/tests/test_columns.py::test_S1_AC10_creating_column_after_archived_column_returns_422`
- `api/tests/test_columns.py::test_S1_AC10_new_columns_never_reuse_an_archived_columns_key`
- `web/src/test/archive.test.tsx` › "S1_AC10: archiving Doing moves it with its 2 cards to the read-only archive view"
- `web/src/test/archive.test.tsx` › "S1_AC10: Restore brings the column back to its original position with both cards"
- `web/src/test/archive.test.tsx` › "S1_AC10: Delete in the archive view uses the delete-column dialog"
- `web/src/test/archive.test.tsx` › "S1_AC10: Delete the column and its cards works from the archive, and a 409 reloads it"
- `web/src/test/archive.test.tsx` › "S1_AC10: canceling the delete dialog in the archive view leaves the column and sends nothing"
- `web/src/test/archive.test.tsx` › "S1_AC10, S1_AC7: rolls back and shows an error when restoring fails"
- `web/src/test/archive.test.tsx` › "S1_AC10: shows Board not found for an unknown board's archive"

### S1_AC11: Delete a column

Deleting a column with cards requires a choice: move them to the end of another active column of the board, in their relative order, or delete them with the column. The dialog offers both plus Cancel (focused first, also Escape), and invalid requests return `422` and change nothing. An empty column is deleted without a dialog.

**Tests (11):**

- `api/tests/test_columns.py::test_S1_AC11_delete_moves_cards_to_the_end_of_target`
- `api/tests/test_columns.py::test_S1_AC11_delete_with_cards_delete_removes_them`
- `api/tests/test_columns.py::test_S1_AC11_invalid_delete_requests_return_422_and_change_nothing`
- `api/tests/test_columns.py::test_S1_AC11_empty_column_is_deleted_without_parameters`
- `api/tests/test_columns.py::test_S1_AC11_archived_column_can_be_deleted_from_the_archive`
- `web/src/test/columns.test.tsx` › "S1_AC11: the delete dialog offers move, delete and cancel, with focus on Cancel"
- `web/src/test/columns.test.tsx` › "S1_AC11: Move 2 cards to Done sends cards=move and puts them at the end of Done in order"
- `web/src/test/columns.test.tsx` › "S1_AC11: Delete the column and its 2 cards sends cards=delete and removes them"
- `web/src/test/columns.test.tsx` › "S1_AC11: %s closes the dialog and sends nothing"
- `web/src/test/columns.test.tsx` › "S1_AC11: an empty column is deleted without a dialog"
- `web/src/test/columns.test.tsx` › "S1_AC11: the delete dialog for a column with 1 card shows singular card text and excludes the column itself from targets"

### S1_AC12: The last active column is protected

A board's last active column cannot be deleted or archived: the API returns `422` and the SPA disables both buttons, even when archived columns exist.

**Tests (3):**

- `api/tests/test_columns.py::test_S1_AC12_last_active_column_cannot_be_deleted_or_archived`
- `web/src/test/columns.test.tsx` › "S1_AC12: the last active column cannot be archived or deleted"
- `web/src/test/columns.test.tsx` › "S1_AC12: the last active column cannot be archived or deleted even when archived columns exist"

### S1_AC13: Card types

A type has a name (1–50 characters, unique per board ignoring case) and one of the 10 palette colors. New types are listed after "Task"; renaming or recoloring a type updates every card of that type. Invalid names or colors are rejected by the SPA and by the API (`422`).

**Tests (12):**

- `api/tests/test_card_types.py::test_S1_AC13_new_type_is_listed_after_task`
- `api/tests/test_card_types.py::test_S1_AC13_rename_and_recolor_are_reflected_in_the_board`
- `api/tests/test_card_types.py::test_S1_AC13_renaming_a_type_to_its_own_name_in_another_case_is_allowed`
- `api/tests/test_card_types.py::test_S1_AC13_every_palette_color_is_accepted`
- `api/tests/test_card_types.py::test_S1_AC13_name_of_50_chars_is_accepted`
- `api/tests/test_card_types.py::test_S1_AC13_invalid_types_return_422`
- `api/tests/test_card_types.py::test_S1_AC13_invalid_type_updates_return_422`
- `web/src/test/cardTypes.test.tsx` › "S1_AC13: adding Bug with red lists it, and the color picker offers the 10 palette keys"
- `web/src/test/cardTypes.test.tsx` › "S1_AC13: recoloring and renaming a type updates every card of that type"
- `web/src/test/cardTypes.test.tsx` › "S1_AC13: %s shows a client-side error and sends nothing"
- `web/src/test/cardTypes.test.tsx` › "S1_AC13: renaming a type to an invalid or duplicate name shows a client-side error and sends nothing"
- `web/src/test/cardTypes.test.tsx` › "S1_AC13: the API's 422 is shown as an error notice"

### S1_AC14: Delete a card type with replacement

Deleting a type in use asks for a replacement among the board's other types and reassigns every card, including archived ones. An unused type is deleted without parameters, and the board's last type cannot be deleted. Invalid replacements return `422` and change nothing.

**Tests (9):**

- `api/tests/test_card_types.py::test_S1_AC14_delete_with_replacement_reassigns_every_card`
- `api/tests/test_card_types.py::test_S1_AC14_invalid_type_deletions_return_422_and_change_nothing`
- `api/tests/test_card_types.py::test_S1_AC14_the_last_type_cannot_be_deleted`
- `api/tests/test_card_types.py::test_S1_AC14_last_type_cannot_be_deleted_even_with_replace_with`
- `api/tests/test_card_types.py::test_S1_AC14_unused_type_is_deleted_without_parameters`
- `web/src/test/cardTypes.test.tsx` › "S1_AC14: deleting a type in use asks for a replacement among the other types"
- `web/src/test/cardTypes.test.tsx` › "S1_AC14: an unused type is deleted without a dialog, and the last type cannot be deleted"
- `web/src/test/cardTypes.test.tsx` › "S1_AC14: a type used only by archived cards opens the replacement dialog after the API's 422"
- `web/src/test/cardTypes.test.tsx` › "S1_AC14: canceling the replacement dialog leaves the type intact and sends nothing"

### S1_AC15: Cards: create, dialog, edit, delete

Typing a title in the column's inline input and pressing Enter creates a trimmed card at the end of the column with the board's first type, keeping an empty input focused (Escape cancels). The card dialog has its own URL (`/b/:boardId/c/:cardId`) and saves title, description and type with one `PATCH`. Titles are 1–200 characters and descriptions up to 10,000. Deleting a card asks for confirmation (Delete key, button or dialog).

**Tests (17):**

- `api/tests/test_cards.py::test_S1_AC15_new_card_is_trimmed_and_appended_with_the_first_type`
- `api/tests/test_cards.py::test_S1_AC15_edit_persists_title_description_and_type`
- `api/tests/test_cards.py::test_S1_AC15_invalid_cards_return_422`
- `api/tests/test_cards.py::test_S1_AC15_limits_are_inclusive`
- `api/tests/test_cards.py::test_S1_AC15_type_from_another_board_returns_422`
- `api/tests/test_cards.py::test_S1_AC15_unknown_type_id_returns_422`
- `api/tests/test_cards.py::test_S1_AC15_delete_removes_the_card`
- `web/src/test/cards.test.tsx` › "S1_AC15: Enter creates a trimmed card at the end with the first type, and keeps an empty input focused"
- `web/src/test/cards.test.tsx` › "S1_AC15: Escape closes the input and an empty title sends nothing"
- `web/src/test/cards.test.tsx` › "S1_AC15: a card title longer than 200 characters shows an error and sends nothing"
- `web/src/test/cards.test.tsx` › "S1_AC15: the card dialog opens directly from the URL and saves edits with one PATCH"
- `web/src/test/cards.test.tsx` › "S1_AC15: rendering /b/:boardId/c/:cardId directly shows the dialog over the board"
- `web/src/test/cards.test.tsx` › "S1_AC15: an unknown card id shows Card not found and returns to the board"
- `web/src/test/cards.test.tsx` › "S1_AC15: an empty or invalid title, or description > 10000 chars in the dialog shows an error and sends nothing"
- `web/src/test/cards.test.tsx` › "S1_AC15: the %s asks for confirmation before deleting"
- `web/src/test/cards.test.tsx` › "S1_AC15: a card can be deleted from its dialog"
- `web/src/test/cards.test.tsx` › "S1_AC15: pressing Escape on the delete confirmation cancels and keeps the card"

### S1_AC16: Move a card

A card can move to any column and position with "Move to…", Shift+arrows or drag and drop, sending one move request with `column_id`, `after_id` and `version`; there is no flow validation. Only the moved row changes, and an `after_id` outside the target column, or an unknown column, returns `422`.

**Tests (13):**

- `api/tests/test_cards.py::test_S1_AC16_move_after_a_card_updates_only_the_moved_row`
- `api/tests/test_cards.py::test_S1_AC16_moves_need_no_flow_validation`
- `api/tests/test_cards.py::test_S1_AC16_move_first_and_within_the_same_column`
- `api/tests/test_cards.py::test_S1_AC16_after_id_outside_the_target_column_returns_422`
- `api/tests/test_cards.py::test_S1_AC16_move_to_empty_column_with_null_after_id`
- `api/tests/test_cards.py::test_S1_AC16_move_to_unknown_column_returns_422`
- `web/src/test/cards.test.tsx` › "S1_AC16: Move to… places the selected card after a given card with one move request"
- `web/src/test/cards.test.tsx` › "S1_AC16: Move to… from the card dialog can put a card at the top"
- `web/src/test/cards.test.tsx` › "S1_AC16: Shift+→ moves the selected card to the end of the next column"
- `web/src/test/cards.test.tsx` › "S1_AC16: Shift+↑ and Shift+↓ swap the card with its neighbor"
- `web/src/test/cards.test.tsx` › "S1_AC16: Shift+Arrow at boundaries (first/last column, bottom card) sends no requests"
- `web/src/test/dragAndDrop.test.tsx` › "S1_AC16: dragging a card to another column sends the same move request"
- `web/src/test/dragAndDrop.test.tsx` › "S1_AC16: dropping a card on a card below it in the same column places it after that card"

### S1_AC17: Plain text

Titles and descriptions containing markup such as `<script>` are stored unchanged and shown as literal text in the boards list, board, card dialog and archive; no element is created from them.

**Tests (4):**

- `api/tests/test_cards.py::test_S1_AC17_html_in_titles_is_stored_unchanged`
- `web/src/test/plainText.test.tsx` › "S1_AC17: the boards list shows markup in names as literal text"
- `web/src/test/plainText.test.tsx` › "S1_AC17: the board view and the card dialog show markup as literal text"
- `web/src/test/plainText.test.tsx` › "S1_AC17: the archive shows markup as literal text"

### S1_AC18: Keyboard model and help panel

Arrows move the selection across and within columns, Enter opens the card dialog, F2 renames inline, `N` opens the add-card input and Escape closes dialogs; shortcuts are ignored while typing. Every shortcut has a visible button, and `?` (key or button) opens a panel listing them all.

**Tests (10):**

- `web/src/test/keyboard.test.tsx` › "S1_AC18: arrows move the selection across and within columns, skipping empty columns"
- `web/src/test/keyboard.test.tsx` › "S1_AC18: Enter opens the card dialog and Escape closes it"
- `web/src/test/keyboard.test.tsx` › "S1_AC18: F2 renames the selected card inline"
- `web/src/test/keyboard.test.tsx` › "S1_AC18: N opens the add-card input in the selected column"
- `web/src/test/keyboard.test.tsx` › "S1_AC18: shortcuts are ignored while focus is in a text input"
- `web/src/test/keyboard.test.tsx` › "S1_AC18: ? and the ? button open a panel that lists every shortcut"
- `web/src/test/keyboard.test.tsx` › "S1_AC18: every registered shortcut is in the help panel and has a visible button"
- `web/src/test/keyboard.test.tsx` › "S1_AC18: each toolbar button runs its action"
- `web/src/test/keyboard.test.tsx` › "S1_AC18: maps keys to shortcuts and ignores modified keys"
- `web/src/test/keyboard.test.tsx` › "S1_AC18: ? opens the help panel on the boards list too"

### S1_AC19: OpenAPI schema and generated client

The API serves its OpenAPI schema; `web/openapi.json` matches it, and `web/src/api/schema.ts` is generated from that file.

**Tests (3):**

- `api/tests/test_boards.py::test_S1_AC19_openapi_schema_is_exposed`
- `api/tests/test_openapi_export.py::test_S1_AC19_web_openapi_schema_matches_the_api`
- `web/src/api/schema.test.ts` › "S1_AC19: src/api/schema.ts is generated from the API's OpenAPI schema"

### S1_AC20: Test gates

The API tests use, in order, `TEST_DATABASE_URL`, a testcontainers PostgreSQL or `pgserver`, never SQLite nor the development database, and skip only the database tests when none is available. Migrations match the models, the SPA passes a strict `tsc`, and each suite fails below 80% line coverage. Every acceptance criterion in this document has at least one test.

**Tests (12):**

- `api/tests/test_acceptance_docs.py::test_S1_AC20_every_acceptance_criterion_has_tests`
- `api/tests/test_acceptance_docs.py::test_S1_AC20_the_doc_lists_exactly_the_tests_that_exist`
- `api/tests/test_acceptance_docs.py::test_S1_AC20_every_test_names_its_criterion`
- `api/tests/test_config_and_schema.py::test_S1_AC20_migrations_match_the_models`
- `api/tests/test_db_chain.py::test_S1_AC20_test_database_url_wins_over_every_starter`
- `api/tests/test_db_chain.py::test_S1_AC20_testcontainers_is_tried_before_pgserver`
- `api/tests/test_db_chain.py::test_S1_AC20_pgserver_is_used_when_docker_is_missing`
- `api/tests/test_db_chain.py::test_S1_AC20_no_backend_raises_with_every_reason`
- `api/tests/test_db_chain.py::test_S1_AC20_never_runs_against_sqlite`
- `api/tests/test_db_chain.py::test_S1_AC20_never_runs_against_the_development_database`
- `api/tests/test_db_chain.py::test_S1_AC20_default_chain_order`
- `web/src/test/typecheck.test.ts` › "S1_AC20: tsc --noEmit passes with strict"

## Origin

The criteria come from the specs of the harness runs that built slice 1. Each spec numbered its own criteria from 1:
- `.agents/memory/specs/678ff13c.md`: architecture;
- `.agents/memory/specs/bb717706.md`: backend;
- `.agents/memory/specs/67837849.md`: frontend.

S1_AC4 and S1_AC19 cover tests added outside those specs.

| S1 | Backend spec criterion | Frontend spec criterion |
|---|---|---|
| S1_AC1 | 1 | 1 |
| S1_AC2 | 2 | 3 (login screen) |
| S1_AC3 | 3 | 2, 3 |
| S1_AC4 | – | – |
| S1_AC5 | 4, 5 | 4 |
| S1_AC6 | 6 | – |
| S1_AC7 | 7 | 17 |
| S1_AC8 | 8 | – |
| S1_AC9 | 9 | 5 |
| S1_AC10 | 10 | 8 |
| S1_AC11 | 11 | 6 |
| S1_AC12 | 12 | 7 |
| S1_AC13 | 13 | 9 |
| S1_AC14 | 14 | 10 |
| S1_AC15 | 15 | 11, 12, 15 |
| S1_AC16 | 16 | 14 |
| S1_AC17 | 15 (HTML part) | 13 |
| S1_AC18 | – | 16 |
| S1_AC19 | – | 2 (generated client) |
| S1_AC20 | 17 | 18 |
