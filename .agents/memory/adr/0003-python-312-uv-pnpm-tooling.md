---
id: 0003
titulo: Tooling: Python 3.12, uv, pnpm, ruff, strict TypeScript, 80% coverage
status: aceptado
fecha: 2026-11-06
aprobado_por: usuario (gate de arquitectura)
reemplaza:
---

## Contexto

The workspace code standards fix the tooling. The `pgserver` test fallback needs Python 3.12 or older.

## Decisión

Pin Python to 3.12 with uv (`pyproject.toml` and `uv.lock` in `api/`), use pnpm with a lockfile in `web/`, ruff, TypeScript strict, pytest-cov and Vitest, with an 80% line threshold on both sides.

## Consecuencias

`setup_command` installs both projects and `test_command` runs pytest with `--cov-fail-under=80`, then Vitest with coverage. Python cannot move past 3.12 until `pgserver` supports it.
