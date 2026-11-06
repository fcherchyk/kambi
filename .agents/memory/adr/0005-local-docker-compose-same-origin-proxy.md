---
id: 0005
titulo: Local-only deployment with docker compose and a same-origin /api proxy
status: aceptado
fecha: 2026-11-06
aprobado_por: usuario (gate de arquitectura)
reemplaza:
---

## Contexto

Kambi runs on the user's machine only, like mapa-mental (its ADR 0005), and secrets must not live in code.

## Decisión

Run `db`, `api` and `web` with docker compose. Publish ports only on 127.0.0.1. Vite proxies `/api` to the API so the browser sees a single origin. Secrets live in a git-ignored `.env`, with an `.env.example` in the repo.

## Consecuencias

No CORS setup is needed and nothing is exposed to the network. Deployment beyond local is out of scope for slice 1.
