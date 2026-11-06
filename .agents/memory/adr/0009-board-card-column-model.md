---
id: 0009
titulo: Board, column and card model of the first slice
status: aceptado
fecha: 2026-11-06
aprobado_por: usuario (gate de arquitectura)
reemplaza:
---

## Contexto

The request defines how boards, columns and cards relate.

## Decisión

A new board is created with the columns "To Do", "In Progress" and "Done" and a yellow "Task" card type, in the same transaction. A card belongs to exactly one column, which is its state, and cards move between any columns without restrictions. Archiving a column archives its cards with it.

## Consecuencias

The card's archived state comes from its column, so restoring the column restores its cards untouched. Moves need no flow validation.
