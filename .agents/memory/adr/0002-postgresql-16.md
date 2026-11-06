---
id: 0002
titulo: PostgreSQL 16 as the database
status: aceptado
fecha: 2026-11-06
aprobado_por: usuario (gate de arquitectura)
reemplaza:
---

## Contexto

The workspace default database is PostgreSQL. Kambi needs relational data, with jsonb for future extensions.

## Decisión

Use PostgreSQL 16, run by docker compose in the `db` service with a `db-data` volume.

## Consecuencias

Relational integrity, jsonb and migrations (Alembic) are available. `docker compose down -v` deletes all data, and the README must say so.
