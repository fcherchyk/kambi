import { useState } from "react";
import type { KeyboardEvent } from "react";

interface InlineInputProps {
  label: string;
  initialValue?: string;
  placeholder?: string;
  /** Return true to keep the input open (cleared) for another entry. */
  onSubmit: (value: string) => boolean | void;
  onCancel: () => void;
}

/** A text input that submits on Enter and cancels on Escape. */
export function InlineInput({
  label,
  initialValue = "",
  placeholder,
  onSubmit,
  onCancel,
}: InlineInputProps) {
  const [value, setValue] = useState(initialValue);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (onSubmit(value)) setValue("");
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }
  }

  return (
    <input
      className="inline-input"
      aria-label={label}
      placeholder={placeholder ?? label}
      value={value}
      autoFocus
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={handleKeyDown}
    />
  );
}
