<!-- claude · claude-opus-5-5 · familia anthropic -->

Terminé el frontend del slice 1 en `web/`, sin cambiar el comportamiento del backend. Pasan los tests: API 191 (99,35 % de cobertura) y web 89 (99,39 % de líneas). `tsc` estricto, ESLint y ruff quedan limpios. No corrí `docker compose up --build`, así que la imagen de `web` nunca se construyó.

## Archivos tocados
- **`web/` (nuevo):**
  - Proyecto React + TypeScript strict con Vite y pnpm, `pnpm-lock.yaml` versionado.
  - `vite.config.ts`: puerto 5174 con `strictPort` y proxy de `/api` a `API_URL` (por defecto `http://localhost:8001`). Ahí también está el umbral de cobertura de Vitest (80 %).
  - `Dockerfile` con `npm_config_store_dir=/pnpm-store` y `CI=true`.
  - `openapi.json` y `src/api/schema.ts`, el tipado generado.
  - `src/`: cliente, sesión, avisos, diálogos, registro de atajos con panel "?", las páginas (login, tableros, tablero, archivo) y `board/` (columnas, tarjetas, tipos, drag and drop, estado optimista).
  - `src/test/`: la API falsa en memoria y los tests, cada uno nombrado con su criterio (`AC1:` a `AC18:`).
- **`api/` (solo herramientas, sin cambio de comportamiento):** `scripts/export_openapi.py`, `tests/test_openapi_export.py` y una opción `--write-openapi` en `tests/conftest.py`.
- **Raíz:** `README.md` (cómo abrir la app, atajos, tests, estructura), el comentario del servicio `web` en `docker-compose.yml`, el comentario de `.agents/project.yaml` y `.agents/progress.md`.

## Decisiones
- **Cliente generado (Q1):** `openapi-typescript` genera solo los tipos y el `fetch` es un wrapper escrito a mano. Ese wrapper agrega `X-CSRF: 1` en cada mutación y manda la cookie de sesión. Dos tests controlan que el cliente no quede viejo (Q8):
  - pytest compara `web/openapi.json` con la API actual;
  - Vitest compara `schema.ts` con `openapi.json`.
  
  Así lo controla el `test_command` sin agregarle pasos.
- **Conteos al borrar un tablero (Q2):** salen de `GET /boards/{id}` más `/archive`, e incluyen las columnas y tarjetas archivadas.
- **Tipo usado solo por tarjetas archivadas (Q3):** si la API responde `422` al borrarlo, se abre el diálogo de reemplazo.
- **Tarjeta archivada en la URL (Q5):** se muestra "Card not found" y se vuelve al tablero.
- **Atajos (Q6):** Shift+↑/↓ reordena dentro de la columna, F2 renombra en el lugar y Backspace también borra. Falta confirmarlo contra mapa-mental.
- **Paleta (Q7):** elegí yo los valores hex y el color de texto de cada clave, en `src/palette.ts`. Falta que alguien los apruebe.
- **Ruta de la tarjeta:** el diálogo es una ruta hija, así el tablero sigue montado detrás.
- **Drag and drop:** se prueba en jsdom con un polyfill de `PointerEvent` y un layout simulado.
- **Dependencias nuevas fuera del ADR 0011:** `openapi-typescript`, `@dnd-kit/utilities`, Testing Library con jsdom, y ESLint y Prettier con sus plugins. Propongo enmendar el ADR 0011 para incluirlas.

## Lo que la spec necesita y la API no tiene
- **Login fallido (Q4):** si falla el callback de Google, el usuario ve el JSON del error en vez de la SPA. Arreglarlo requiere un redirect en el backend; lo dejé en el roadmap del README.
- **Conteos de un tablero:** la API no los devuelve, y por eso confirmar un borrado cuesta dos requests extra.

## Comandos rechazados (anotados en `progress.md`)
- No se pudieron correr el export con `uv run python …`, el CLI de `openapi-typescript`, `prettier --write` ni el `setup_command` literal con `{ … }`.
- Cómo lo resolví:
  - el esquema se exportó con `pytest --write-openapi`;
  - los tipos se generaron con un test que usa la API de Node de `openapi-typescript`;
  - el formateo se hizo con un test temporal que llama a la API de Prettier, borrado después;
  - el `setup_command` se corrió en sus dos partes.
- No toqué la wiki porque mi rol no puede modificar `.agents/memory/`. La spec pide actualizarla, así que queda para el paso `docs`.

## Cómo probarlo
```sh
uv sync --directory api && pnpm --dir web install --frozen-lockfile
uv run --directory api pytest -q --cov=app --cov-report=term-missing --cov-fail-under=80
pnpm --dir web exec vitest run --coverage
docker compose up --build    # http://localhost:5174, apretá ? para ver los atajos
```
