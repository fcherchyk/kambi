/** Pure transforms of a loaded board, used for optimistic updates. */
import type { BoardDetail, Card, CardType, Column } from "../api/client";
import { bySortKey, keyAfterSibling, keysAfter } from "../ordering";

export function orderedColumns(board: BoardDetail): Column[] {
  return [...board.columns].sort(bySortKey);
}

export function orderedTypes(board: BoardDetail): CardType[] {
  return [...board.card_types].sort(bySortKey);
}

export function cardsOf(board: BoardDetail, columnId: string): Card[] {
  return board.cards
    .filter((card) => card.column_id === columnId)
    .sort(bySortKey);
}

function replaceById<T extends { id: string }>(items: T[], item: T): T[] {
  const exists = items.some((existing) => existing.id === item.id);
  return exists
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [...items, item];
}

export function upsertColumn(board: BoardDetail, column: Column): BoardDetail {
  return { ...board, columns: replaceById(board.columns, column) };
}

export function upsertCard(board: BoardDetail, card: Card): BoardDetail {
  return { ...board, cards: replaceById(board.cards, card) };
}

export function upsertType(
  board: BoardDetail,
  cardType: CardType,
): BoardDetail {
  return { ...board, card_types: replaceById(board.card_types, cardType) };
}

export function removeCard(board: BoardDetail, cardId: string): BoardDetail {
  return { ...board, cards: board.cards.filter((card) => card.id !== cardId) };
}

/** Remove a column; its cards go to the end of `targetId`, or are removed with it. */
export function removeColumn(
  board: BoardDetail,
  columnId: string,
  targetId: string | null,
): BoardDetail {
  const moving = cardsOf(board, columnId);
  const rest = board.cards.filter((card) => card.column_id !== columnId);
  const columns = board.columns.filter((column) => column.id !== columnId);
  if (targetId === null) return { ...board, columns, cards: rest };
  const last = cardsOf(board, targetId).at(-1)?.sort_key ?? null;
  const keys = keysAfter(last, moving.length);
  const moved = moving.map((card, index) => ({
    ...card,
    column_id: targetId,
    sort_key: keys[index] as string,
  }));
  return { ...board, columns, cards: [...rest, ...moved] };
}

/** Delete a type, giving its cards the replacement type. */
export function removeType(
  board: BoardDetail,
  typeId: string,
  replaceWith: string | null,
): BoardDetail {
  return {
    ...board,
    card_types: board.card_types.filter((cardType) => cardType.id !== typeId),
    cards: board.cards.map((card) =>
      card.type_id === typeId && replaceWith
        ? { ...card, type_id: replaceWith }
        : card,
    ),
  };
}

/** Place a column right after `afterId` (or first). */
export function placeColumn(
  board: BoardDetail,
  column: Column,
  afterId: string | null,
): BoardDetail {
  const others = orderedColumns(board).filter(
    (other) => other.id !== column.id,
  );
  return upsertColumn(board, {
    ...column,
    sort_key: keyAfterSibling(others, afterId),
  });
}

/** Place a card in `columnId`, right after `afterId` (or first). */
export function placeCard(
  board: BoardDetail,
  card: Card,
  columnId: string,
  afterId: string | null,
): BoardDetail {
  const others = cardsOf(board, columnId).filter(
    (other) => other.id !== card.id,
  );
  return upsertCard(board, {
    ...card,
    column_id: columnId,
    sort_key: keyAfterSibling(others, afterId),
  });
}

/** The `after_id` that moves item `index` of `items` one step left (-1) or right (+1). */
export function afterIdForStep<T extends { id: string }>(
  items: T[],
  index: number,
  step: -1 | 1,
): string | null | undefined {
  const target = index + step;
  if (target < 0 || target >= items.length) return undefined;
  if (step === 1) return (items[target] as T).id;
  return target === 0 ? null : (items[target - 1] as T).id;
}
