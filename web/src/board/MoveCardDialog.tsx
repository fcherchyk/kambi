import { useState } from "react";
import type { BoardDetail, Card } from "../api/client";
import { Dialog } from "../components/Dialog";
import { cardsOf, orderedColumns } from "./boardState";

const TOP = "__top__";

interface MoveCardDialogProps {
  board: BoardDetail;
  card: Card;
  onMove: (columnId: string, afterId: string | null) => void;
  onCancel: () => void;
}

/** "Move to…": any active column, at the top or after a given card. Defaults to the end. */
export function MoveCardDialog({
  board,
  card,
  onMove,
  onCancel,
}: MoveCardDialogProps) {
  const [columnId, setColumnId] = useState(card.column_id);
  const siblings = cardsOf(board, columnId).filter(
    (other) => other.id !== card.id,
  );
  const [position, setPosition] = useState<string>(siblings.at(-1)?.id ?? TOP);

  function changeColumn(id: string) {
    setColumnId(id);
    const others = cardsOf(board, id).filter((other) => other.id !== card.id);
    setPosition(others.at(-1)?.id ?? TOP);
  }

  return (
    <Dialog title={`Move “${card.title}”`} onClose={onCancel}>
      <label>
        Column
        <select
          value={columnId}
          onChange={(event) => changeColumn(event.target.value)}
        >
          {orderedColumns(board).map((column) => (
            <option key={column.id} value={column.id}>
              {column.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Position
        <select
          value={position}
          onChange={(event) => setPosition(event.target.value)}
        >
          <option value={TOP}>At the top</option>
          {siblings.map((other) => (
            <option key={other.id} value={other.id}>
              After {other.title}
            </option>
          ))}
        </select>
      </label>
      <div className="actions">
        <button
          type="button"
          className="primary"
          onClick={() => onMove(columnId, position === TOP ? null : position)}
        >
          Move
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
