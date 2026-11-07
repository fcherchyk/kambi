<!-- antigravity · gemini-3.8-flash-high · familia google -->

I have launched the full test suite (`pytest` for `api/` and `vitest --coverage` for `web/`) and am waiting for it to complete.
I am waiting for the test suite execution to finish.
I am waiting for vitest to finish running as part of the test command.
I have executed the project test command (`pytest` and `vitest --coverage`) and am waiting for the execution to finish.
I am waiting for the test suite to finish running.
I am waiting for vitest to complete.
Se implementaron y ejecutaron los tests automatizados a partir de los criterios de aceptación (AC1–AC18) definidos en la especificación, cubriendo casos normales, casos borde (longitudes exactas, límites de límites) y entradas inválidas (textos vacíos, duplicados, longitudes que exceden los límites, cancelaciones con Escape y restricciones de navegación).

No se modificó código de producción; únicamente se incorporaron y ampliaron los casos de prueba en [`web/src/test/`](file:///Users/negro/hworkspace/projects/kambi/web/src/test). Todos los tests pasaron exitosamente.

### Cobertura y verificación de tipos

- **Vitest**: 101 tests pasaron en `web/` (15 archivos de test).
- **Cobertura de líneas en frontend**: 99.57% (umbral configurado: ≥ 80%).
- **TypeScript strict**: `tsc --noEmit` pasa sin errores ni diagnósticos pendientes.
- **Suite completa del workspace** (`pytest` + `vitest`): 191 tests de backend y 101 tests de frontend pasando.

---

### Tabla de Criterios de Aceptación, Tests y Resultados

| Criterio | Test | Archivo | Resultado |
| :--- | :--- | :--- | :--- |
| **AC1: Dev server and proxy** | `AC1: Vite serves on 5174 with strictPort and proxies /api to localhost:8001 by default` | [config.test.ts](file:///Users/negro/hworkspace/projects/kambi/web/src/test/config.test.ts) | PASSED |
| | `AC1: API_URL=http://api:8001 sends the proxy to the api service` | [config.test.ts](file:///Users/negro/hworkspace/projects/kambi/web/src/test/config.test.ts) | PASSED |
| | `AC1: the web service builds ./web, publishes 127.0.0.1:5174 and keeps node_modules in a volume` | [config.test.ts](file:///Users/negro/hworkspace/projects/kambi/web/src/test/config.test.ts) | PASSED |
| | `AC1: the Dockerfile uses a fixed pnpm store and CI=true` | [config.test.ts](file:///Users/negro/hworkspace/projects/kambi/web/src/test/config.test.ts) | PASSED |
| **AC2: CSRF header on mutations** | `AC2: every mutation of each resource carries X-CSRF: 1, and GETs do not need it` | [client.test.ts](file:///Users/negro/hworkspace/projects/kambi/web/src/test/client.test.ts) | PASSED |
| | `AC2: column actions send the version in the body or the query` | [client.test.ts](file:///Users/negro/hworkspace/projects/kambi/web/src/test/client.test.ts) | PASSED |
| | `AC2: raises ApiError with the server's message and status` | [client.test.ts](file:///Users/negro/hworkspace/projects/kambi/web/src/test/client.test.ts) | PASSED |
| | `AC2: reports validation errors and non-JSON failures readably` | [client.test.ts](file:///Users/negro/hworkspace/projects/kambi/web/src/test/client.test.ts) | PASSED |
| **AC3: Session and login** | `AC3: / shows the login screen when /api/me answers 401` | [session.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/session.test.tsx) | PASSED |
| | `AC3: /b/b1 shows the login screen when /api/me answers 401` | [session.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/session.test.tsx) | PASSED |
| | `AC3: /b/b1/c/card9 shows the login screen when /api/me answers 401` | [session.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/session.test.tsx) | PASSED |
| | `AC3: Log out sends POST /api/auth/logout and shows the login screen` | [session.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/session.test.tsx) | PASSED |
| | `AC3: a 401 on a later call shows the login screen` | [session.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/session.test.tsx) | PASSED |
| | `AC3: shows an error notice when the server cannot be reached` | [session.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/session.test.tsx) | PASSED |
| | `AC3, AC17: a 401 during a mutation shows the login screen` | [optimistic.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/optimistic.test.tsx) | PASSED |
| **AC4: Boards list** | `AC4: creating a board lists it, and opening it shows the three default columns` | [boards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/boards.test.tsx) | PASSED |
| | `AC4: renaming a board shows the new name` | [boards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/boards.test.tsx) | PASSED |
| | `AC4: creating a board with exactly 100 characters succeeds` | [boards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/boards.test.tsx) | PASSED |
| | `AC4: a empty board name shows a validation message and sends nothing` | [boards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/boards.test.tsx) | PASSED |
| | `AC4: a too long board name shows a validation message and sends nothing` | [boards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/boards.test.tsx) | PASSED |
| | `AC4: an invalid rename shows a validation message and sends nothing` | [boards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/boards.test.tsx) | PASSED |
| | `AC4: pressing Escape on delete confirmation cancels and keeps the board` | [boards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/boards.test.tsx) | PASSED |
| | `AC4: deleting a board confirms with its column and card counts` | [boards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/boards.test.tsx) | PASSED |
| | `AC4, AC17: restores the list and shows an error when the API rejects a change` | [boards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/boards.test.tsx) | PASSED |
| | `AC4, AC17: reloads the list with a notice on a 409` | [boards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/boards.test.tsx) | PASSED |
| **AC5: Columns: add, rename, reorder** | `AC5: a column added after To Do shows in second position` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| | `AC5: a column added at the end is appended` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| | `AC5: a column added with exactly 100 characters succeeds` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| | `AC5: renaming a column shows the new name` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| | `AC5: ◀ moves Done before In Progress with one move request` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| | `AC5: ▶ moves a column right, and the ends are disabled` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| | `AC5: dragging a column sends the same move request as ◀` | [dragAndDrop.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/dragAndDrop.test.tsx) | PASSED |
| | `AC5: shows Board not found for an unknown board` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| | `AC5: rejects an invalid column name (empty or >100 chars) without sending anything` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| **AC6: Delete-column dialog** | `AC6: the delete dialog offers move, delete and cancel, with focus on Cancel` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| | `AC6: Move 2 cards to Done sends cards=move and puts them at the end of Done in order` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| | `AC6: Delete the column and its 2 cards sends cards=delete and removes them` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| | `AC6: Cancel closes the dialog and sends nothing` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| | `AC6: Escape closes the dialog and sends nothing` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| | `AC6: an empty column is deleted without a dialog` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| | `AC6: the delete dialog for a column with 1 card shows singular card text and excludes the column itself from targets` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| **AC7: The last active column is protected** | `AC7: the last active column cannot be archived or deleted` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| | `AC7: the last active column cannot be archived or deleted even when archived columns exist` | [columns.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/columns.test.tsx) | PASSED |
| **AC8: Archive view** | `AC8: archiving Doing moves it with its 2 cards to the read-only archive view` | [archive.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/archive.test.tsx) | PASSED |
| | `AC8: Restore brings the column back to its original position with both cards` | [archive.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/archive.test.tsx) | PASSED |
| | `AC8: Delete in the archive view uses the delete-column dialog` | [archive.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/archive.test.tsx) | PASSED |
| | `AC8: Delete the column and its cards works from the archive, and a 409 reloads it` | [archive.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/archive.test.tsx) | PASSED |
| | `AC8: canceling the delete dialog in the archive view leaves the column and sends nothing` | [archive.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/archive.test.tsx) | PASSED |
| | `AC8, AC17: rolls back and shows an error when restoring fails` | [archive.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/archive.test.tsx) | PASSED |
| | `AC8: shows Board not found for an unknown board's archive` | [archive.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/archive.test.tsx) | PASSED |
| **AC9: Card types** | `AC9: adding Bug with red lists it, and the color picker offers the 10 palette keys` | [cardTypes.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cardTypes.test.tsx) | PASSED |
| | `AC9: recoloring and renaming a type updates every card of that type` | [cardTypes.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cardTypes.test.tsx) | PASSED |
| | `AC9: a duplicate name shows a client-side error and sends nothing` | [cardTypes.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cardTypes.test.tsx) | PASSED |
| | `AC9: an empty name shows a client-side error and sends nothing` | [cardTypes.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cardTypes.test.tsx) | PASSED |
| | `AC9: a too long name shows a client-side error and sends nothing` | [cardTypes.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cardTypes.test.tsx) | PASSED |
| | `AC9: renaming a type to an invalid or duplicate name shows a client-side error and sends nothing` | [cardTypes.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cardTypes.test.tsx) | PASSED |
| | `AC9: the API's 422 is shown as an error notice` | [cardTypes.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cardTypes.test.tsx) | PASSED |
| **AC10: Deleting a type** | `AC10: deleting a type in use asks for a replacement among the other types` | [cardTypes.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cardTypes.test.tsx) | PASSED |
| | `AC10: an unused type is deleted without a dialog, and the last type cannot be deleted` | [cardTypes.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cardTypes.test.tsx) | PASSED |
| | `AC10: a type used only by archived cards opens the replacement dialog after the API's 422` | [cardTypes.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cardTypes.test.tsx) | PASSED |
| | `AC10: canceling the replacement dialog leaves the type intact and sends nothing` | [cardTypes.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cardTypes.test.tsx) | PASSED |
| **AC11: Creating a card** | `AC11: Enter creates a trimmed card at the end with the first type, and keeps an empty input focused` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| | `AC11: Escape closes the input and an empty title sends nothing` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| | `AC11: a card title longer than 200 characters shows an error and sends nothing` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| **AC12: Card dialog** | `AC12: the card dialog opens directly from the URL and saves edits with one PATCH` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| | `AC12: rendering /b/:boardId/c/:cardId directly shows the dialog over the board` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| | `AC12: an unknown card id shows Card not found and returns to the board` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| | `AC12: an empty or invalid title, or description > 10000 chars in the dialog shows an error and sends nothing` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| **AC13: Plain-text rendering** | `AC13: the boards list shows markup in names as literal text` | [plainText.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/plainText.test.tsx) | PASSED |
| | `AC13: the board view and the card dialog show markup as literal text` | [plainText.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/plainText.test.tsx) | PASSED |
| | `AC13: the archive shows markup as literal text` | [plainText.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/plainText.test.tsx) | PASSED |
| **AC14: Moving a card** | `AC14: Move to… places the selected card after a given card with one move request` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| | `AC14: Move to… from the card dialog can put a card at the top` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| | `AC14: Shift+→ moves the selected card to the end of the next column` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| | `AC14: Shift+↑ and Shift+↓ swap the card with its neighbor` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| | `AC14: Shift+Arrow at boundaries (first/last column, bottom card) sends no requests` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| | `AC14: dragging a card to another column sends the same move request` | [dragAndDrop.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/dragAndDrop.test.tsx) | PASSED |
| | `AC14: dropping a card on a card below it in the same column places it after that card` | [dragAndDrop.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/dragAndDrop.test.tsx) | PASSED |
| **AC15: Deleting a card** | `AC15: the Delete key asks for confirmation before deleting` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| | `AC15: the delete button asks for confirmation before deleting` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| | `AC15: a card can be deleted from its dialog` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| | `AC15: pressing Escape on the delete confirmation cancels and keeps the card` | [cards.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/cards.test.tsx) | PASSED |
| **AC16: Keyboard model and help panel** | `AC16: arrows move the selection across and within columns, skipping empty columns` | [keyboard.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/keyboard.test.tsx) | PASSED |
| | `AC16: Enter opens the card dialog and Escape closes it` | [keyboard.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/keyboard.test.tsx) | PASSED |
| | `AC16: F2 renames the selected card inline` | [keyboard.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/keyboard.test.tsx) | PASSED |
| | `AC16: N opens the add-card input in the selected column` | [keyboard.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/keyboard.test.tsx) | PASSED |
| | `AC16: shortcuts are ignored while focus is in a text input` | [keyboard.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/keyboard.test.tsx) | PASSED |
| | `AC16: ? and the ? button open a panel that lists every shortcut` | [keyboard.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/keyboard.test.tsx) | PASSED |
| | `AC16: every registered shortcut is in the help panel and has a visible button` | [keyboard.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/keyboard.test.tsx) | PASSED |
| | `AC16: each toolbar button runs its action` | [keyboard.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/keyboard.test.tsx) | PASSED |
| | `AC16: maps keys to shortcuts and ignores modified keys` | [keyboard.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/keyboard.test.tsx) | PASSED |
| | `AC16: ? opens the help panel on the boards list too` | [keyboard.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/keyboard.test.tsx) | PASSED |
| **AC17: Optimistic update, rollback and 409** | `AC17: a failed card move shows the new position, then rolls back with an error notice` | [optimistic.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/optimistic.test.tsx) | PASSED |
| | `AC17: a 409 on a rename reloads the board and says so` | [optimistic.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/optimistic.test.tsx) | PASSED |
| | `AC17: rolls back a failed column rename, archive and delete` | [optimistic.test.tsx](file:///Users/negro/hworkspace/projects/kambi/web/src/test/optimistic.test.tsx) | PASSED |
| **AC18: Test and coverage gate** | `AC18: tsc --noEmit passes with strict` | [typecheck.test.ts](file:///Users/negro/hworkspace/projects/kambi/web/src/test/typecheck.test.ts) | PASSED |
| | `Vitest coverage line threshold: >= 80% (Current: 99.57%)` | [vite.config.ts](file:///Users/negro/hworkspace/projects/kambi/web/vite.config.ts) | PASSED |
