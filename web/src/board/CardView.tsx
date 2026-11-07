import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef } from "react";
import type { Card, CardType } from "../api/client";
import { InlineInput } from "../components/InlineInput";
import { swatch } from "../palette";

export const cardDragId = (id: string) => `card:${id}`;

interface CardViewProps {
  card: Card;
  cardType: CardType | undefined;
  selected: boolean;
  renaming: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onRename: (title: string) => boolean;
  onCancelRename: () => void;
}

export function CardView(props: CardViewProps) {
  const {
    card,
    cardType,
    selected,
    renaming,
    onSelect,
    onOpen,
    onRename,
    onCancelRename,
  } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: cardDragId(card.id),
    data: { kind: "card", cardId: card.id, columnId: card.column_id },
    disabled: renaming,
  });
  const ref = useRef<HTMLElement | null>(null);
  const color = cardType?.color ?? "gray";
  const { background, text } = swatch(color);

  useEffect(() => {
    if (selected && !renaming) ref.current?.focus({ preventScroll: false });
  }, [selected, renaming]);

  return (
    <article
      ref={(node) => {
        ref.current = node;
        setNodeRef(node);
      }}
      className={`card${selected ? " selected" : ""}${isDragging ? " dragging" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderLeftColor: background,
      }}
      data-card-id={card.id}
      data-color={color}
      aria-label={card.title}
      aria-current={selected ? "true" : undefined}
      {...attributes}
      {...listeners}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onDoubleClick={onOpen}
    >
      {renaming ? (
        <InlineInput
          label="Card title"
          initialValue={card.title}
          onSubmit={onRename}
          onCancel={onCancelRename}
        />
      ) : (
        <span className="card-title">{card.title}</span>
      )}
      {cardType && (
        <span className="card-type" style={{ background, color: text }}>
          {cardType.name}
        </span>
      )}
    </article>
  );
}
