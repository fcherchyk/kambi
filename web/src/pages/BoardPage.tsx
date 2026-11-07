import {
  closestCenter,
  DndContext,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useMatch, useNavigate, useParams } from "react-router";
import {
  api,
  type BoardDetail,
  type Card,
  type CardChanges,
  type Column,
} from "../api/client";
import {
  afterIdForStep,
  cardsOf,
  orderedColumns,
  orderedTypes,
  placeCard,
  placeColumn,
  removeCard,
  removeColumn,
  removeType,
  upsertCard,
  upsertColumn,
  upsertType,
} from "../board/boardState";
import { CardDialog } from "../board/CardDialog";
import { CardTypesPanel } from "../board/CardTypesPanel";
import {
  ColumnView,
  columnDragId,
  type ColumnActions,
} from "../board/ColumnView";
import { DeleteColumnDialog } from "../board/DeleteColumnDialog";
import { MoveCardDialog } from "../board/MoveCardDialog";
import {
  cardDropTarget,
  columnDropAfterId,
  isSamePlace,
  nextSelection,
  shiftTarget,
  type CardTarget,
  type Direction,
} from "../board/navigation";
import { useBoard } from "../board/useBoard";
import { ConfirmDialog } from "../components/Dialog";
import { InlineInput } from "../components/InlineInput";
import {
  matchShortcut,
  SHORTCUTS,
  shouldIgnoreShortcut,
  type ShortcutId,
} from "../keyboard/shortcuts";
import { useNotify } from "../notices";
import { nameError } from "../validation";

type OpenDialog =
  | { kind: "delete-column"; column: Column }
  | { kind: "delete-card"; card: Card }
  | { kind: "move-card"; card: Card }
  | { kind: "types" }
  | null;

let tempCounter = 0;
const tempId = () => `temp-${++tempCounter}`;
const now = () => new Date().toISOString();

/** Cards are dropped on cards first, then on a column's card area; columns on columns. */
const collisionDetection: CollisionDetection = (args) => {
  const kind = args.active.data.current?.kind;
  const only = (kinds: string[]) =>
    args.droppableContainers.filter((container) =>
      kinds.includes(container.data.current?.kind),
    );
  if (kind === "column")
    return closestCenter({ ...args, droppableContainers: only(["column"]) });
  const onCard = pointerWithin({
    ...args,
    droppableContainers: only(["card"]),
  });
  if (onCard.length > 0) return onCard;
  return pointerWithin({
    ...args,
    droppableContainers: only(["zone", "column"]),
  });
};

export function BoardPage() {
  const { boardId = "" } = useParams();
  const cardMatch = useMatch("/b/:boardId/c/:cardId");
  const openCardId = cardMatch?.params.cardId ?? null;
  const navigate = useNavigate();
  const notify = useNotify();
  const { board, loadState, mutate } = useBoard(boardId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renamingCardId, setRenamingCardId] = useState<string | null>(null);
  const [addingCardIn, setAddingCardIn] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const columns = useMemo(() => (board ? orderedColumns(board) : []), [board]);
  const types = useMemo(() => (board ? orderedTypes(board) : []), [board]);
  const typeMap = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);
  const findCard = (id: string | null) =>
    board?.cards.find((card) => card.id === id);
  const selectedCard = findCard(selectedId);
  const openCard = findCard(openCardId);
  const boardPath = `/b/${boardId}`;

  // Navigation is a transition, so a card deleted from its dialog can vanish before the URL changes.
  const deletedCardId = useRef<string | null>(null);

  useEffect(() => {
    if (openCardId === deletedCardId.current) return;
    if (
      board &&
      openCardId &&
      !board.cards.some((card) => card.id === openCardId)
    ) {
      notify("Card not found.", "error");
      navigate(boardPath, { replace: true });
    }
  }, [board, openCardId, boardPath, navigate, notify]);

  // --- cards ---

  function moveCard(card: Card, target: CardTarget) {
    if (!board || isSamePlace(board, card, target)) return;
    void mutate({
      apply: (b) => placeCard(b, card, target.columnId, target.afterId),
      call: () => api.moveCard(card, target.columnId, target.afterId),
      commit: upsertCard,
      errorMessage: "Could not move the card",
    });
  }

  function updateCard(card: Card, changes: CardChanges) {
    void mutate({
      apply: (b) => upsertCard(b, { ...card, ...changes } as Card),
      call: () => api.updateCard(card, changes),
      commit: upsertCard,
      errorMessage: "Could not save the card",
    });
  }

  function addCard(column: Column, value: string): boolean {
    const title = value.trim();
    if (!title) return false;
    const problem = nameError("card", title);
    if (problem) {
      notify(problem, "error");
      return false;
    }
    const id = tempId();
    const last = cardsOf(board as BoardDetail, column.id).at(-1)?.id ?? null;
    const draft: Card = {
      id,
      board_id: boardId,
      column_id: column.id,
      type_id: types[0]?.id ?? "",
      title,
      description: "",
      sort_key: "",
      version: 1,
      created_at: now(),
      updated_at: now(),
    };
    void mutate({
      apply: (b) => placeCard(b, draft, column.id, last),
      call: () => api.createCard(column.id, title),
      commit: (b, saved) => upsertCard(removeCard(b, id), saved),
      errorMessage: "Could not create the card",
    });
    return true;
  }

  function deleteCard(card: Card) {
    setDialog(null);
    deletedCardId.current = card.id;
    if (selectedId === card.id && board) {
      const next = nextSelection(board, card.id, "down");
      setSelectedId(
        next === card.id ? nextSelection(board, card.id, "up") : next,
      );
    }
    void mutate({
      apply: (b) => removeCard(b, card.id),
      call: () => api.deleteCard(card),
      errorMessage: "Could not delete the card",
    });
  }

  function renameCard(card: Card, value: string): boolean {
    const problem = nameError("card", value);
    if (problem) {
      notify(problem, "error");
      return false;
    }
    setRenamingCardId(null);
    if (value.trim() !== card.title) updateCard(card, { title: value.trim() });
    return false;
  }

  // --- columns ---

  function renameColumn(column: Column, value: string): boolean {
    const problem = nameError("column", value);
    if (problem) {
      notify(problem, "error");
      return false;
    }
    const name = value.trim();
    if (name !== column.name) {
      void mutate({
        apply: (b) => upsertColumn(b, { ...column, name }),
        call: () => api.renameColumn(column, name),
        commit: upsertColumn,
        errorMessage: "Could not rename the column",
      });
    }
    return true;
  }

  function moveColumn(column: Column, afterId: string | null) {
    void mutate({
      apply: (b) => placeColumn(b, column, afterId),
      call: () => api.moveColumn(column, afterId),
      commit: upsertColumn,
      errorMessage: "Could not move the column",
    });
  }

  function addColumn(value: string, afterId?: string | null): boolean {
    const problem = nameError("column", value);
    if (problem) {
      notify(problem, "error");
      return false;
    }
    const name = value.trim();
    const id = tempId();
    const draft: Column = {
      id,
      board_id: boardId,
      name,
      sort_key: "",
      archived_at: null,
      version: 1,
    };
    const anchor =
      afterId === undefined ? (columns.at(-1)?.id ?? null) : afterId;
    void mutate({
      apply: (b) => placeColumn(b, draft, anchor),
      call: () => api.createColumn(boardId, name, afterId),
      commit: (b, saved) =>
        upsertColumn(
          { ...b, columns: b.columns.filter((c) => c.id !== id) },
          saved,
        ),
      errorMessage: "Could not add the column",
    });
    return true;
  }

  function archiveColumn(column: Column) {
    void mutate({
      apply: (b) => ({
        ...b,
        columns: b.columns.filter((c) => c.id !== column.id),
        cards: b.cards.filter((card) => card.column_id !== column.id),
      }),
      call: () => api.archiveColumn(column),
      errorMessage: "Could not archive the column",
    });
  }

  function deleteColumn(
    column: Column,
    targetId: string | null,
    withCards: boolean,
  ) {
    setDialog(null);
    void mutate({
      apply: (b) => removeColumn(b, column.id, targetId),
      call: () =>
        api.deleteColumn(
          column,
          !withCards
            ? undefined
            : targetId
              ? { cards: "move", target: targetId }
              : { cards: "delete" },
        ),
      reloadAfter: targetId !== null,
      errorMessage: "Could not delete the column",
    });
  }

  function requestDeleteColumn(column: Column) {
    if (!board) return;
    if (cardsOf(board, column.id).length === 0)
      deleteColumn(column, null, false);
    else setDialog({ kind: "delete-column", column });
  }

  // --- keyboard ---

  function runShortcut(id: ShortcutId) {
    if (!board) return;
    const direction = id.split("-")[1] as Direction;
    if (id.startsWith("select-")) {
      setSelectedId(nextSelection(board, selectedId, direction));
      return;
    }
    if (id === "add-card") {
      setAddingCardIn(selectedCard?.column_id ?? columns[0]?.id ?? null);
      return;
    }
    if (!selectedCard) return;
    if (id.startsWith("move-")) {
      const target = shiftTarget(board, selectedCard, direction);
      if (target) moveCard(selectedCard, target);
    } else if (id === "open") {
      navigate(`${boardPath}/c/${selectedCard.id}`);
    } else if (id === "rename") {
      setRenamingCardId(selectedCard.id);
    } else if (id === "delete") {
      setDialog({ kind: "delete-card", card: selectedCard });
    }
  }

  const shortcutRef = useRef(runShortcut);
  shortcutRef.current = runShortcut;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreShortcut(event)) return;
      const id = matchShortcut(event);
      if (!id || id === "help") return;
      event.preventDefault();
      shortcutRef.current(id);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- drag and drop ---

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!board || !over) return;
    const dragged = active.data.current;
    const target = over.data.current as
      { kind: string; cardId?: string; columnId: string } | undefined;
    if (!dragged || !target) return;
    if (dragged.kind === "column") {
      const column = columns.find((c) => c.id === dragged.columnId);
      const afterId = columnDropAfterId(
        columns,
        dragged.columnId,
        target.columnId,
      );
      if (column && afterId !== undefined) moveColumn(column, afterId);
      return;
    }
    const card = findCard(dragged.cardId);
    if (!card) return;
    const drop =
      target.kind === "card" && target.cardId
        ? cardDropTarget(board, card, { kind: "card", cardId: target.cardId })
        : cardDropTarget(board, card, {
            kind: "column",
            columnId: target.columnId,
          });
    if (drop) moveCard(card, drop);
  }

  if (loadState === "not-found") {
    return (
      <section className="board-missing">
        <p>Board not found.</p>
        <Link to="/">Back to your boards</Link>
      </section>
    );
  }
  if (loadState === "failed")
    return <p className="error">Could not load the board.</p>;
  if (!board) return <p>Loading…</p>;

  const actions: ColumnActions = {
    rename: renameColumn,
    move: (column, step) => {
      const afterId = afterIdForStep(columns, columns.indexOf(column), step);
      if (afterId !== undefined) moveColumn(column, afterId);
    },
    addAfter: (column, name) => addColumn(name, column.id),
    archive: archiveColumn,
    remove: requestDeleteColumn,
    select: setSelectedId,
    openCard: (cardId) => navigate(`${boardPath}/c/${cardId}`),
    renameCard,
    stopRenamingCard: () => setRenamingCardId(null),
    addCard,
    stopAddingCard: () => setAddingCardIn(null),
    startAddingCard: (column) => setAddingCardIn(column.id),
  };

  return (
    <section className="board">
      <header className="board-header">
        <h1>{board.name}</h1>
        <button type="button" onClick={() => setDialog({ kind: "types" })}>
          Card types
        </button>
        <Link to={`${boardPath}/archive`}>Archive</Link>
      </header>
      <div className="toolbar" role="toolbar" aria-label="Selected card">
        {SHORTCUTS.filter((item) => item.scope === "board").map((item) => (
          <button
            key={item.id}
            type="button"
            data-shortcut={item.id}
            aria-label={item.description}
            title={`${item.description} (${item.keys})`}
            disabled={
              !selectedCard &&
              !item.id.startsWith("select-") &&
              item.id !== "add-card"
            }
            onClick={() => runShortcut(item.id)}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          disabled={!selectedCard}
          onClick={() =>
            selectedCard && setDialog({ kind: "move-card", card: selectedCard })
          }
        >
          Move to…
        </button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragEnd={handleDragEnd}
      >
        <div className="columns">
          <SortableContext
            items={columns.map((c) => columnDragId(c.id))}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column, index) => (
              <ColumnView
                key={column.id}
                column={column}
                cards={cardsOf(board, column.id)}
                types={typeMap}
                index={index}
                columnCount={columns.length}
                selectedId={selectedId}
                renamingCardId={renamingCardId}
                addingCard={addingCardIn === column.id}
                actions={actions}
              />
            ))}
          </SortableContext>
          <div className="add-column">
            {addingColumn ? (
              <InlineInput
                label="New column name"
                onSubmit={(value) => {
                  if (addColumn(value)) setAddingColumn(false);
                  return false;
                }}
                onCancel={() => setAddingColumn(false)}
              />
            ) : (
              <button type="button" onClick={() => setAddingColumn(true)}>
                + Add column
              </button>
            )}
          </div>
        </div>
      </DndContext>
      {openCard && (
        <CardDialog
          key={`${openCard.id}:${openCard.version}`}
          card={openCard}
          types={types}
          onClose={() => navigate(boardPath)}
          onSave={(changes) => {
            navigate(boardPath);
            if (Object.keys(changes).length > 0) updateCard(openCard, changes);
          }}
          onMove={() => setDialog({ kind: "move-card", card: openCard })}
          onDelete={() => setDialog({ kind: "delete-card", card: openCard })}
        />
      )}
      {dialog?.kind === "delete-card" && (
        <ConfirmDialog
          title="Delete card?"
          message={`Delete “${dialog.card.title}”? This cannot be undone.`}
          confirmLabel="Delete card"
          onConfirm={() => {
            if (openCardId === dialog.card.id) navigate(boardPath);
            deleteCard(dialog.card);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "move-card" && (
        <MoveCardDialog
          board={board}
          card={findCard(dialog.card.id) ?? dialog.card}
          onCancel={() => setDialog(null)}
          onMove={(columnId, afterId) => {
            setDialog(null);
            if (openCardId) navigate(boardPath);
            moveCard(findCard(dialog.card.id) ?? dialog.card, {
              columnId,
              afterId,
            });
          }}
        />
      )}
      {dialog?.kind === "delete-column" && (
        <DeleteColumnDialog
          column={dialog.column}
          cardCount={cardsOf(board, dialog.column.id).length}
          targets={columns.filter((c) => c.id !== dialog.column.id)}
          onMove={(targetId) => deleteColumn(dialog.column, targetId, true)}
          onDeleteCards={() => deleteColumn(dialog.column, null, true)}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "types" && (
        <CardTypesPanel
          types={types}
          usage={(typeId) =>
            board.cards.filter((card) => card.type_id === typeId).length
          }
          onClose={() => setDialog(null)}
          onAdd={(name, color) => {
            const id = tempId();
            void mutate({
              apply: (b) =>
                upsertType(b, {
                  id,
                  board_id: boardId,
                  name,
                  color,
                  sort_key: "~",
                  version: 1,
                }),
              call: () => api.createCardType(boardId, name, color),
              commit: (b, saved) =>
                upsertType(
                  { ...b, card_types: b.card_types.filter((t) => t.id !== id) },
                  saved,
                ),
              errorMessage: "Could not add the type",
            });
          }}
          onUpdate={(cardType, changes) => {
            void mutate({
              apply: (b) => upsertType(b, { ...cardType, ...changes }),
              call: () => api.updateCardType(cardType, changes),
              commit: upsertType,
              errorMessage: "Could not update the type",
            });
          }}
          onDelete={(cardType, onInUse) => {
            void mutate({
              apply: (b) => removeType(b, cardType.id, null),
              call: () => api.deleteCardType(cardType),
              onInvalid: onInUse,
              errorMessage: "Could not delete the type",
            });
          }}
          onReplace={(cardType, replaceWith) => {
            void mutate({
              apply: (b) => removeType(b, cardType.id, replaceWith),
              call: () => api.deleteCardType(cardType, replaceWith),
              reloadAfter: true,
              errorMessage: "Could not delete the type",
            });
          }}
        />
      )}
    </section>
  );
}
