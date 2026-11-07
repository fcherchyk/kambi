import { useState } from "react";
import type { FormEvent } from "react";
import type { Card, CardChanges, CardType } from "../api/client";
import { Dialog } from "../components/Dialog";
import { nameError } from "../validation";

const DESCRIPTION_LIMIT = 10_000;

interface CardDialogProps {
  card: Card;
  types: CardType[];
  onSave: (changes: CardChanges) => void;
  onMove: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Edit a card's title, plain-text description and type. Only changed fields are sent. */
export function CardDialog({
  card,
  types,
  onSave,
  onMove,
  onDelete,
  onClose,
}: CardDialogProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [typeId, setTypeId] = useState(card.type_id);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const problem =
      nameError("card", title) ??
      (description.length > DESCRIPTION_LIMIT
        ? `Description must be at most ${DESCRIPTION_LIMIT} characters.`
        : null);
    setError(problem);
    if (problem) return;
    const changes: CardChanges = {};
    if (title.trim() !== card.title) changes.title = title.trim();
    if (description !== card.description) changes.description = description;
    if (typeId !== card.type_id) changes.type_id = typeId;
    onSave(changes);
  }

  return (
    <Dialog title="Card" onClose={onClose}>
      <form className="card-form" onSubmit={submit}>
        <label>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            rows={8}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label>
          Type
          <select
            value={typeId}
            onChange={(event) => setTypeId(event.target.value)}
          >
            {types.map((cardType) => (
              <option key={cardType.id} value={cardType.id}>
                {cardType.name}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="submit" className="primary">
            Save
          </button>
          <button type="button" onClick={onMove}>
            Move to…
          </button>
          <button type="button" className="danger" onClick={onDelete}>
            Delete card
          </button>
        </div>
      </form>
    </Dialog>
  );
}
