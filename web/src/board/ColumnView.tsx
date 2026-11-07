import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { Card, CardType, Column } from "../api/client";
import { InlineInput } from "../components/InlineInput";
import { CardView, cardDragId } from "./CardView";

export const columnDragId = (id: string) => `column:${id}`;
export const columnZoneId = (id: string) => `zone:${id}`;

export interface ColumnActions {
  rename: (column: Column, name: string) => boolean;
  move: (column: Column, step: -1 | 1) => void;
  addAfter: (column: Column, name: string) => boolean;
  archive: (column: Column) => void;
  remove: (column: Column) => void;
  select: (cardId: string) => void;
  openCard: (cardId: string) => void;
  renameCard: (card: Card, title: string) => boolean;
  stopRenamingCard: () => void;
  addCard: (column: Column, title: string) => boolean;
  stopAddingCard: () => void;
  startAddingCard: (column: Column) => void;
}

interface ColumnViewProps {
  column: Column;
  cards: Card[];
  types: Map<string, CardType>;
  index: number;
  columnCount: number;
  selectedId: string | null;
  renamingCardId: string | null;
  addingCard: boolean;
  actions: ColumnActions;
}

export function ColumnView(props: ColumnViewProps) {
  const {
    column,
    cards,
    types,
    index,
    columnCount,
    selectedId,
    renamingCardId,
    addingCard,
    actions,
  } = props;
  const [renaming, setRenaming] = useState(false);
  const [addingColumn, setAddingColumn] = useState(false);
  const sortable = useSortable({
    id: columnDragId(column.id),
    data: { kind: "column", columnId: column.id },
  });
  const zone = useDroppable({
    id: columnZoneId(column.id),
    data: { kind: "zone", columnId: column.id },
  });
  const isLast = columnCount <= 1;

  return (
    <section
      ref={sortable.setNodeRef}
      className="column"
      aria-label={column.name}
      data-column-id={column.id}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
    >
      <header className="column-header">
        <span
          className="drag-handle"
          aria-label={`Drag column ${column.name}`}
          {...sortable.attributes}
          {...sortable.listeners}
        >
          ⠿
        </span>
        {renaming ? (
          <InlineInput
            label={`New name for column ${column.name}`}
            initialValue={column.name}
            onSubmit={(value) => {
              if (actions.rename(column, value)) setRenaming(false);
              return false;
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <h2>{column.name}</h2>
        )}
        <span className="count">{cards.length}</span>
      </header>
      <div className="column-tools">
        <button
          type="button"
          aria-label={`Move column ${column.name} left`}
          disabled={index === 0}
          onClick={() => actions.move(column, -1)}
        >
          ◀
        </button>
        <button
          type="button"
          aria-label={`Move column ${column.name} right`}
          disabled={index === columnCount - 1}
          onClick={() => actions.move(column, 1)}
        >
          ▶
        </button>
        <button
          type="button"
          aria-label={`Rename column ${column.name}`}
          onClick={() => setRenaming(true)}
        >
          Rename
        </button>
        <button
          type="button"
          aria-label={`Add column after ${column.name}`}
          onClick={() => setAddingColumn(true)}
        >
          + Column
        </button>
        <button
          type="button"
          aria-label={`Archive column ${column.name}`}
          disabled={isLast}
          title={
            isLast ? "A board needs at least one active column" : undefined
          }
          onClick={() => actions.archive(column)}
        >
          Archive
        </button>
        <button
          type="button"
          className="danger"
          aria-label={`Delete column ${column.name}`}
          disabled={isLast}
          title={
            isLast ? "A board needs at least one active column" : undefined
          }
          onClick={() => actions.remove(column)}
        >
          Delete
        </button>
      </div>
      {addingColumn && (
        <InlineInput
          label={`Name of the column after ${column.name}`}
          onSubmit={(value) => {
            if (actions.addAfter(column, value)) setAddingColumn(false);
            return false;
          }}
          onCancel={() => setAddingColumn(false)}
        />
      )}
      <SortableContext
        items={cards.map((card) => cardDragId(card.id))}
        strategy={verticalListSortingStrategy}
      >
        <div ref={zone.setNodeRef} className="cards" data-zone-id={column.id}>
          {cards.map((card) => (
            <CardView
              key={card.id}
              card={card}
              cardType={types.get(card.type_id)}
              selected={card.id === selectedId}
              renaming={card.id === renamingCardId}
              onSelect={() => actions.select(card.id)}
              onOpen={() => actions.openCard(card.id)}
              onRename={(title) => actions.renameCard(card, title)}
              onCancelRename={actions.stopRenamingCard}
            />
          ))}
        </div>
      </SortableContext>
      {addingCard ? (
        <InlineInput
          label={`New card in ${column.name}`}
          placeholder="Card title"
          onSubmit={(value) => actions.addCard(column, value)}
          onCancel={actions.stopAddingCard}
        />
      ) : (
        <button
          type="button"
          className="add-card"
          onClick={() => actions.startAddingCard(column)}
        >
          + Add card
        </button>
      )}
    </section>
  );
}
