/** The single registry of keyboard shortcuts: the help panel and the buttons read from here. */

export type ShortcutId =
  | "help"
  | "select-left"
  | "select-right"
  | "select-up"
  | "select-down"
  | "open"
  | "rename"
  | "add-card"
  | "move-left"
  | "move-right"
  | "move-up"
  | "move-down"
  | "delete"
  | "close";

export interface Shortcut {
  id: ShortcutId;
  keys: string;
  /** Short text of its button. */
  label: string;
  description: string;
  /** Where its button lives: the header, the board toolbar, or every dialog. */
  scope: "global" | "board" | "dialog";
}

const board = (
  id: ShortcutId,
  keys: string,
  label: string,
  description: string,
): Shortcut => ({
  id,
  keys,
  label,
  description,
  scope: "board",
});

export const SHORTCUTS: readonly Shortcut[] = [
  {
    id: "help",
    keys: "?",
    label: "?",
    description: "Show keyboard shortcuts",
    scope: "global",
  },
  board("select-left", "←", "←", "Select a card in the previous column"),
  board("select-right", "→", "→", "Select a card in the next column"),
  board("select-up", "↑", "↑", "Select the card above"),
  board("select-down", "↓", "↓", "Select the card below"),
  board("open", "Enter", "Open", "Open the selected card"),
  board("rename", "F2", "Rename", "Rename the selected card"),
  board("add-card", "N", "New card", "Add a card to the selected column"),
  board(
    "move-left",
    "Shift+←",
    "Move ←",
    "Move the selected card to the end of the previous column",
  ),
  board(
    "move-right",
    "Shift+→",
    "Move →",
    "Move the selected card to the end of the next column",
  ),
  board("move-up", "Shift+↑", "Move ↑", "Move the selected card up"),
  board("move-down", "Shift+↓", "Move ↓", "Move the selected card down"),
  board("delete", "Delete / Backspace", "Delete", "Delete the selected card"),
  {
    id: "close",
    keys: "Escape",
    label: "×",
    description: "Close the open dialog",
    scope: "dialog",
  },
];

const ARROWS: Record<string, "left" | "right" | "up" | "down"> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

/** The shortcut an unmodified key press triggers, if any. Escape is handled by dialogs. */
export function matchShortcut(event: KeyboardEvent): ShortcutId | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const arrow = ARROWS[event.key];
  if (arrow) return event.shiftKey ? `move-${arrow}` : `select-${arrow}`;
  switch (event.key) {
    case "?":
      return "help";
    case "Enter":
      return "open";
    case "F2":
      return "rename";
    case "n":
    case "N":
      return "add-card";
    case "Delete":
    case "Backspace":
      return "delete";
    default:
      return null;
  }
}

/** Shortcuts never fire while typing or while a dialog is open. */
export function shouldIgnoreShortcut(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (target?.closest?.("input, textarea, select, [contenteditable='true']"))
    return true;
  return document.querySelector("[role='dialog']") !== null;
}
