/** Client-side checks that mirror the API's limits, so invalid input is never sent. */

export const LIMITS = { board: 100, column: 100, type: 50, card: 200 } as const;

const LABELS: Record<keyof typeof LIMITS, string> = {
  board: "Board name",
  column: "Column name",
  type: "Type name",
  card: "Card title",
};

/** Return an error message, or null if the trimmed name is valid. */
export function nameError(
  kind: keyof typeof LIMITS,
  name: string,
): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > LIMITS[kind]) {
    return `${LABELS[kind]} must be 1 to ${LIMITS[kind]} characters.`;
  }
  return null;
}
