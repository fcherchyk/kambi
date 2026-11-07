import { useRef, useState } from "react";
import type { Column } from "../api/client";
import { Dialog } from "../components/Dialog";

interface DeleteColumnDialogProps {
  column: Column;
  cardCount: number;
  /** Active columns that can receive the cards. */
  targets: Column[];
  onMove: (targetId: string) => void;
  onDeleteCards: () => void;
  onCancel: () => void;
}

/** Shown only for a column with cards: move them, delete them, or cancel (the default). */
export function DeleteColumnDialog({
  column,
  cardCount,
  targets,
  onMove,
  onDeleteCards,
  onCancel,
}: DeleteColumnDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const cards = `${cardCount} card${cardCount === 1 ? "" : "s"}`;

  return (
    <Dialog
      title={`Delete column “${column.name}”`}
      onClose={onCancel}
      initialFocus={cancelRef}
    >
      <p>This column has {cards}.</p>
      <div className="actions vertical">
        <div className="move-cards">
          <button
            type="button"
            disabled={!targetId}
            onClick={() => onMove(targetId)}
          >
            Move {cards} to…
          </button>
          <select
            aria-label="Target column"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
          >
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="danger" onClick={onDeleteCards}>
          Delete the column and its {cards}
        </button>
        <button type="button" ref={cancelRef} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
