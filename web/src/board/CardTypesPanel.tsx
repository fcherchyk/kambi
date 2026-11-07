import { useState } from "react";
import type { FormEvent } from "react";
import type { CardType, Color } from "../api/client";
import { Dialog } from "../components/Dialog";
import { InlineInput } from "../components/InlineInput";
import { COLORS, swatch } from "../palette";
import { nameError } from "../validation";

interface CardTypesPanelProps {
  types: CardType[];
  usage: (typeId: string) => number;
  onAdd: (name: string, color: Color) => void;
  onUpdate: (
    cardType: CardType,
    changes: { name?: string; color?: Color },
  ) => void;
  /** Delete an unused type; `onInUse` opens the replacement dialog if the server says it is used. */
  onDelete: (cardType: CardType, onInUse: () => void) => void;
  onReplace: (cardType: CardType, replaceWith: string) => void;
  onClose: () => void;
}

function ColorSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: Color) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as Color)}
    >
      {COLORS.map((color) => (
        <option key={color} value={color}>
          {color}
        </option>
      ))}
    </select>
  );
}

export function CardTypesPanel(props: CardTypesPanelProps) {
  const { types, usage, onAdd, onUpdate, onDelete, onReplace, onClose } = props;
  const [name, setName] = useState("");
  const [color, setColor] = useState<Color>("blue");
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<CardType | null>(null);

  function problemWith(value: string, exceptId: string | null): string | null {
    const lower = value.trim().toLowerCase();
    const duplicate = types.some(
      (t) => t.id !== exceptId && t.name.toLowerCase() === lower,
    );
    return (
      nameError("type", value) ??
      (duplicate ? "A type with that name already exists." : null)
    );
  }

  function add(event: FormEvent) {
    event.preventDefault();
    const problem = problemWith(name, null);
    setError(problem);
    if (problem) return;
    onAdd(name.trim(), color);
    setName("");
  }

  function rename(cardType: CardType, value: string): boolean {
    const problem = problemWith(value, cardType.id);
    setError(problem);
    if (problem) return false;
    setRenamingId(null);
    if (value.trim() !== cardType.name)
      onUpdate(cardType, { name: value.trim() });
    return false;
  }

  function remove(cardType: CardType) {
    if (usage(cardType.id) > 0) setReplacing(cardType);
    else onDelete(cardType, () => setReplacing(cardType));
  }

  return (
    <>
      <Dialog title="Card types" onClose={onClose}>
        <ul className="type-list">
          {types.map((cardType) => (
            <li key={cardType.id}>
              <span
                className="swatch"
                data-color={cardType.color}
                style={{ background: swatch(cardType.color).background }}
              />
              {renamingId === cardType.id ? (
                <InlineInput
                  label={`New name for type ${cardType.name}`}
                  initialValue={cardType.name}
                  onSubmit={(value) => rename(cardType, value)}
                  onCancel={() => setRenamingId(null)}
                />
              ) : (
                <span className="type-name">{cardType.name}</span>
              )}
              <ColorSelect
                label={`Color of ${cardType.name}`}
                value={cardType.color}
                onChange={(next) => onUpdate(cardType, { color: next })}
              />
              <button
                type="button"
                aria-label={`Rename type ${cardType.name}`}
                onClick={() => setRenamingId(cardType.id)}
              >
                Rename
              </button>
              <button
                type="button"
                className="danger"
                aria-label={`Delete type ${cardType.name}`}
                disabled={types.length <= 1}
                title={
                  types.length <= 1
                    ? "A board needs at least one type"
                    : undefined
                }
                onClick={() => remove(cardType)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <form className="new-type" onSubmit={add}>
          <input
            aria-label="New type name"
            placeholder="New type name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <ColorSelect
            label="New type color"
            value={color}
            onChange={setColor}
          />
          <button type="submit">Add type</button>
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </Dialog>
      {replacing && (
        <ReplaceTypeDialog
          cardType={replacing}
          count={usage(replacing.id)}
          options={types.filter((t) => t.id !== replacing.id)}
          onConfirm={(replaceWith) => {
            onReplace(replacing, replaceWith);
            setReplacing(null);
          }}
          onCancel={() => setReplacing(null)}
        />
      )}
    </>
  );
}

interface ReplaceTypeDialogProps {
  cardType: CardType;
  count: number;
  options: CardType[];
  onConfirm: (replaceWith: string) => void;
  onCancel: () => void;
}

function ReplaceTypeDialog({
  cardType,
  count,
  options,
  onConfirm,
  onCancel,
}: ReplaceTypeDialogProps) {
  const [replaceWith, setReplaceWith] = useState(options[0]?.id ?? "");
  const used =
    count > 0 ? `${count} card${count === 1 ? "" : "s"} use` : "Cards use";
  return (
    <Dialog title={`Delete type “${cardType.name}”`} onClose={onCancel}>
      <p>{used} this type. Pick the type they get instead.</p>
      <label>
        Replacement type
        <select
          value={replaceWith}
          onChange={(event) => setReplaceWith(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      <div className="actions">
        <button
          type="button"
          className="danger"
          onClick={() => onConfirm(replaceWith)}
        >
          Replace and delete
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
