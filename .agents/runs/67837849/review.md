<!-- openrouter · nvidia/nemotron-3-ultra-550b-a55b:free · familia nvidia -->

Veredicto: REVISAR
Criterios cubiertos:
- AC1 (dev server/proxy): configuración Vite + docker-compose + Dockerfile correctos
- AC2 (CSRF header): wrapper en `api/client.ts` agrega `X-CSRF: 1` a mutaciones
- Parcial: OpenAPI export script + test anti-drift, ESLint/Prettier defaults, React Router base

Riesgos:
- **Implementación faltante**: el diff solo tiene scaffolding (config, tipos, cliente generado, rutas vacías). No hay UI de login, tableros, columnas, tarjetas, tipos, archivo, atajos, updates optimistas, ni tests. La spec pide la implementación completa del slice 1 frontend.
- **Tests y cobertura**: no hay tests Vitest ni fake API en memoria; `coverage.thresholds.lines: 80` no configurado en `vitest.config.ts`.
- **README y wiki**: no actualizados (sección Usage, shortcuts, Tests, Structure).
- **Q2/Q3/Q5/Q6/Q7 abiertos**: cuentas de borrado de tablero, tipos en tarjetas archivadas, tarjeta en columna archivada, semántica Shift+↑/↓ y F2, valores hex de paleta — sin resolver en el código.

Sugerencias:
- Completar toda la UI y lógica según los 18 criterios de aceptación antes de marcar OK.
- Agregar `vitest.config.ts` con `coverage.thresholds.lines: 80` y fake API en `src/test/fakeApi.ts`.
- Resolver Q2–Q7 (notar decisiones en resumen o ADR).
- Ejecutar `pnpm --dir web exec vitest run --coverage` y `tsc --noEmit` como gate final.
