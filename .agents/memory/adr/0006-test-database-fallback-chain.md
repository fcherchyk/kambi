---
id: 0006
titulo: Test database chain: TEST_DATABASE_URL, testcontainers, pgserver
status: aceptado
fecha: 2026-11-06
aprobado_por: usuario (gate de arquitectura)
reemplaza:
---

## Contexto

Backend tests need a real PostgreSQL, never the development database and never SQLite. Docker may not be available everywhere.

## Decisión

Tests use `TEST_DATABASE_URL` if set, else an ephemeral PostgreSQL through testcontainers, else `pgserver`, else they are skipped. This is the same chain as mapa-mental.

## Consecuencias

Tests run with or without Docker, so `project.yaml` needs no Docker `preflight`. `pgserver` and `testcontainers` are dev dependencies.
