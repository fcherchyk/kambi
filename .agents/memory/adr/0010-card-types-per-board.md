---
id: 0010
titulo: Card types belong to the board
status: aceptado
fecha: 2026-11-06
aprobado_por: usuario (gate de arquitectura)
reemplaza:
---

## Contexto

Cards need a type with a name and a color, and different boards may want different types.

## Decisión

Card types belong to a board. Each has a name and a color, and can be added, renamed, recolored and deleted.

## Consecuencias

Types are managed per board, and deleting a type must handle the cards that use it.
