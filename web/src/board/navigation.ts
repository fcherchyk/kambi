/** Pure helpers for the selected-card keyboard model and for drag-and-drop drops. */
import type { BoardDetail, Card, Column } from "../api/client";
import { cardsOf, orderedColumns } from "./boardState";

export type Direction = "left" | "right" | "up" | "down";

interface Position {
  columnIndex: number;
  cardIndex: number;
}

function grid(board: BoardDetail): Card[][] {
  return orderedColumns(board).map((column) => cardsOf(board, column.id));
}

export function locate(
  board: BoardDetail,
  cardId: string | null,
): Position | null {
  if (!cardId) return null;
  const columns = grid(board);
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const cardIndex = (columns[columnIndex] as Card[]).findIndex(
      (card) => card.id === cardId,
    );
    if (cardIndex >= 0) return { columnIndex, cardIndex };
  }
  return null;
}

/** The card selected after pressing an arrow. Empty columns are skipped sideways. */
export function nextSelection(
  board: BoardDetail,
  selectedId: string | null,
  direction: Direction,
): string | null {
  const columns = grid(board);
  const here = locate(board, selectedId);
  if (!here) return columns.find((cards) => cards.length > 0)?.[0]?.id ?? null;
  if (direction === "up" || direction === "down") {
    const cards = columns[here.columnIndex] as Card[];
    const index = Math.min(
      Math.max(here.cardIndex + (direction === "up" ? -1 : 1), 0),
      cards.length - 1,
    );
    return (cards[index] as Card).id;
  }
  const step = direction === "left" ? -1 : 1;
  for (
    let index = here.columnIndex + step;
    index >= 0 && index < columns.length;
    index += step
  ) {
    const cards = columns[index] as Card[];
    if (cards.length > 0)
      return (cards[Math.min(here.cardIndex, cards.length - 1)] as Card).id;
  }
  return selectedId;
}

export interface CardTarget {
  columnId: string;
  afterId: string | null;
}

/** Where Shift+Arrow sends the card, or null when it cannot move that way. */
export function shiftTarget(
  board: BoardDetail,
  card: Card,
  direction: Direction,
): CardTarget | null {
  const columns = orderedColumns(board);
  const here = locate(board, card.id);
  if (!here) return null;
  if (direction === "left" || direction === "right") {
    const target = columns[here.columnIndex + (direction === "left" ? -1 : 1)];
    if (!target) return null;
    return {
      columnId: target.id,
      afterId: cardsOf(board, target.id).at(-1)?.id ?? null,
    };
  }
  const cards = cardsOf(board, card.column_id);
  const index = here.cardIndex + (direction === "up" ? -1 : 1);
  if (index < 0 || index >= cards.length) return null;
  const afterId =
    direction === "down"
      ? (cards[index] as Card).id
      : (cards[index - 1]?.id ?? null);
  return { columnId: card.column_id, afterId };
}

/** Where a dragged card lands: before or after the card under it, or at the end of a column. */
export function cardDropTarget(
  board: BoardDetail,
  card: Card,
  over: { kind: "card"; cardId: string } | { kind: "column"; columnId: string },
): CardTarget | null {
  if (over.kind === "column") {
    const others = cardsOf(board, over.columnId).filter(
      (other) => other.id !== card.id,
    );
    return { columnId: over.columnId, afterId: others.at(-1)?.id ?? null };
  }
  if (over.cardId === card.id) return null;
  const overCard = board.cards.find((other) => other.id === over.cardId);
  if (!overCard) return null;
  const siblings = cardsOf(board, overCard.column_id);
  const movingDown =
    overCard.column_id === card.column_id &&
    siblings.findIndex((other) => other.id === card.id) <
      siblings.findIndex((other) => other.id === overCard.id);
  const others = siblings.filter((other) => other.id !== card.id);
  const overIndex = others.findIndex((other) => other.id === overCard.id);
  const afterIndex = movingDown ? overIndex : overIndex - 1;
  return {
    columnId: overCard.column_id,
    afterId: others[afterIndex]?.id ?? null,
  };
}

/** The `after_id` that drops column `moving` onto the place of column `over`. */
export function columnDropAfterId(
  columns: Column[],
  movingId: string,
  overId: string,
): string | null | undefined {
  const from = columns.findIndex((column) => column.id === movingId);
  const to = columns.findIndex((column) => column.id === overId);
  if (from < 0 || to < 0 || from === to) return undefined;
  if (to > from) return overId;
  return columns[to - 1]?.id ?? null;
}

/** True when the card already sits right after `afterId` in that column. */
export function isSamePlace(
  board: BoardDetail,
  card: Card,
  target: CardTarget,
): boolean {
  if (target.columnId !== card.column_id) return false;
  const cards = cardsOf(board, card.column_id);
  const index = cards.findIndex((other) => other.id === card.id);
  return (cards[index - 1]?.id ?? null) === target.afterId;
}
