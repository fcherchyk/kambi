/**
 * Fractional sort keys, a port of `api/app/ordering.py`.
 *
 * The SPA uses them only to place items optimistically; the server's key replaces them as soon
 * as the request succeeds. Keys are ASCII, so `<` matches the API's "C" collation.
 */

export const DIGITS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = DIGITS.length;
const ZERO = DIGITS.charAt(0);

function digitAt(key: string, index: number): string {
  return index < key.length ? key.charAt(index) : ZERO;
}

function midpoint(low: string, high: string | null): string {
  if (high !== null) {
    let prefix = 0;
    while (prefix < high.length && digitAt(low, prefix) === high.charAt(prefix))
      prefix += 1;
    if (prefix > 0)
      return (
        high.slice(0, prefix) + midpoint(low.slice(prefix), high.slice(prefix))
      );
  }
  const lowDigit = low ? DIGITS.indexOf(low.charAt(0)) : 0;
  const highDigit = high !== null ? DIGITS.indexOf(high.charAt(0)) : BASE;
  if (highDigit - lowDigit > 1)
    return DIGITS.charAt(Math.floor((lowDigit + highDigit) / 2));
  if (high !== null && high.length > 1) return high.charAt(0);
  return DIGITS.charAt(lowDigit) + midpoint(low.slice(1), null);
}

/** A key strictly between `before` and `after` (null means open-ended). */
export function keyBetween(
  before: string | null,
  after: string | null,
): string {
  if (before !== null && after !== null && before >= after) {
    throw new Error(`${before} must sort before ${after}`);
  }
  return midpoint(before ?? "", after);
}

/** `count` increasing keys after `last`. */
export function keysAfter(last: string | null, count: number): string[] {
  const keys: string[] = [];
  for (let index = 0; index < count; index += 1) {
    last = keyBetween(last, null);
    keys.push(last);
  }
  return keys;
}

export function bySortKey<T extends { sort_key: string }>(a: T, b: T): number {
  if (a.sort_key === b.sort_key) return 0;
  return a.sort_key < b.sort_key ? -1 : 1;
}

/** The key that places an item right after `afterId` (or first) among sorted `siblings`. */
export function keyAfterSibling<T extends { id: string; sort_key: string }>(
  siblings: T[],
  afterId: string | null,
): string {
  if (afterId === null) return keyBetween(null, siblings[0]?.sort_key ?? null);
  const index = siblings.findIndex((item) => item.id === afterId);
  const anchor = siblings[index];
  if (!anchor)
    return keysAfter(siblings.at(-1)?.sort_key ?? null, 1)[0] as string;
  return keyBetween(anchor.sort_key, siblings[index + 1]?.sort_key ?? null);
}
