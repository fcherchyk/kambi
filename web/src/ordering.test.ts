import { describe, expect, it } from "vitest";
import { DIGITS, keyAfterSibling, keyBetween, keysAfter } from "./ordering";

describe("fractional sort keys", () => {
  it("generates keys strictly between their neighbors", () => {
    const cases: [string | null, string | null][] = [
      [null, null],
      [null, "V"],
      ["V", null],
      ["V", "W"],
      ["V", "V1"],
      ["Az", "B"],
      [null, "01"],
    ];
    for (const [before, after] of cases) {
      const key = keyBetween(before, after);
      if (before !== null) expect(key > before).toBe(true);
      if (after !== null) expect(key < after).toBe(true);
      expect(key.endsWith(DIGITS[0] as string)).toBe(false);
    }
  });

  it("matches the API's keys for appends", () => {
    expect(keysAfter(null, 3)).toEqual(["V", "k", "s"]);
  });

  it("rejects neighbors in the wrong order", () => {
    expect(() => keyBetween("b", "a")).toThrow();
  });

  it("places an item after a sibling, first, or last when the sibling is unknown", () => {
    const items = [
      { id: "a", sort_key: "V" },
      { id: "b", sort_key: "k" },
    ];
    expect(keyAfterSibling(items, null) < "V").toBe(true);
    const middle = keyAfterSibling(items, "a");
    expect(middle > "V" && middle < "k").toBe(true);
    expect(keyAfterSibling(items, "unknown") > "k").toBe(true);
  });
});
