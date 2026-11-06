---
id: 0001
titulo: FastAPI API and React/TypeScript SPA (Vite)
status: aceptado
fecha: 2026-11-06
aprobado_por: usuario (gate de arquitectura)
reemplaza:
---

## Contexto

Kambi is a web app that must mirror mapa-mental so both can work together later. The workspace standard for web projects is a Python API plus a separate TypeScript SPA.

## Decisión

Use FastAPI for the backend and a React/TypeScript SPA built with Vite for the frontend, in separate `api/` and `web/` directories.

## Consecuencias

The backend stays in the default language and a future mobile app can reuse the same API. The root `pyproject.toml` and `.coveragerc` from the template move into `api/`.
