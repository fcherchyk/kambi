---
id: 0011
titulo: Justified dependencies
status: aceptado
fecha: 2026-11-06
aprobado_por: usuario (gate de arquitectura)
reemplaza:
---

## Contexto

The workspace prefers the standard library before adding a dependency.

## Decisión

Backend: FastAPI, SQLAlchemy and Alembic, Authlib (if login is Google), and in dev pytest, pytest-cov, httpx, testcontainers and pgserver. Frontend: React Router (state in the URL) and @dnd-kit (if drag and drop ships in slice 1).

## Consecuencias

Any other dependency needs its own justification in a spec or ADR.
