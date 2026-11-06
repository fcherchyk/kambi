---
id: 0008
titulo: Optimistic updates, version checks, per-user isolation and CSRF header
status: aceptado
fecha: 2026-11-06
aprobado_por: usuario (gate de arquitectura)
reemplaza:
---

## Contexto

Kambi reuses mapa-mental's API conventions so the two apps behave the same and code can be shared.

## Decisión

The SPA applies optimistic updates with rollback. Every mutation carries a `version` and a stale one returns 409. Data owned by another user returns 404. Mutations require the `X-CSRF: 1` header. The TypeScript client is generated from the OpenAPI schema.

## Consecuencias

Lost updates are detected and cross-user access is isolated. Every query must be scoped through the board owner, with tests for each case, and the SPA reloads the board on 409.
