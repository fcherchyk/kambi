- 20:36:00 · corrida creada en kambi · rama agent/678ff13c · flujo arquitectura · complejidad M
  > A Trello-style kanban board web app, built as an MVP and designed to be as close as possible to mapa-mental in architecture and usability, since the two will probably work together later (same user, linking ideas to tasks).
  > 
  > Platform and constraints:
  > - Web, hosted locally (docker compose), entirely in English (UI, code, docs), MIT license (`LICENSE` at the root).
  > - Python backend with a simple architecture. Reuse mapa-mental's decisions wherever they fit: FastAPI + PostgreSQL + React/TypeScript SPA with Vite, same-origin `/api` proxy, ports on 127.0.0.1, uv/pnpm, testcontainers with the no-Docker fallback (TEST_DATABASE_URL, testcontainers, pgserver), keyboard shortcuts plus visible buttons and a shortcuts help panel. Read `../mapa-mental` (its README, `.agents/memory/arquitectura.md` and ADRs) for reference; do not modify it.
  > 
  > First slice (MVP):
  > - A user can create several boards (create, rename, delete).
  > - A new board is born with 3 columns, "To Do", "In Progress" and "Done", and one default card type, "Task", colored yellow.
  > - Columns are the workflow steps and the card's state: a card belongs to exactly one column, and cards can move freely between any columns (no flow restrictions).
  > - Columns can be added, renamed, deleted, reordered and archived. Archiving a column archives it together with all its cards.
  > - Card types belong to the board: each has a name and a color, and can be added, renamed, recolored and deleted.
  > - Cards can be created, edited and deleted. A card has a plain-text description, a type and its column (state).
  > 
  > Open points to decide with the user (my recommendations in brackets):
  > - Login: Google, with the same BFF pattern as mapa-mental [recommended, so both apps share users later], or no login for a single local user.
  > - Card title: a short title shown on the board plus the description shown when opening it [recommended], or description only.
  > - Archived columns: a view to see and restore them with their cards [recommended], or just hidden for now.
  > - What happens to cards when their column is deleted, and to cards whose type is deleted.
  > - Card ordering inside a column and drag and drop for cards and columns.
  > 
  > How to work:
  > - Produce the initial architecture and the first-slice spec, iterating with the user on everything the workspace standards and mapa-mental do not already settle.
  > - Propose as workspace standards the decisions that would serve other projects.
- 20:36:00 · paso design
- 20:38:27 · design hecho por claude-readonly/claude-opus-5-5
- 20:38:27 · design: ⚠ claude-readonly no pudo ejecutar 2 comandos: `cd ../mapa-mental && ls -a && ls .agents .agents/memory .agents/memory/* 2>/dev/null | head -80 && cat README.md && cat…`, `cat /Users/negro/hworkspace/projects/mapa-mental/.agents/memory/adr/00{01,04,05,06,07,13}*.md`
