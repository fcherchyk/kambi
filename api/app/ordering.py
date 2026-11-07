"""Fractional sort keys.

Keys are strings over a base-62 alphabet that is in ascending ASCII order, so they sort
correctly under the "C" collation. A key never ends with the lowest digit, which leaves
room to insert before any key. Generating a key between two neighbors never touches
other rows.
"""

DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
_BASE = len(DIGITS)


def key_between(before: str | None, after: str | None) -> str:
    """Return a key strictly between `before` and `after` (None means open-ended)."""
    if before is not None and after is not None and before >= after:
        raise ValueError(f"{before!r} must sort before {after!r}")
    for key in (before, after):
        if key is not None:
            _check_key(key)
    return _midpoint(before or "", after)


def keys_after(last: str | None, count: int) -> list[str]:
    """Return `count` increasing keys that all sort after `last`."""
    keys: list[str] = []
    for _ in range(count):
        last = key_between(last, None)
        keys.append(last)
    return keys


def key_after_anchor(sorted_keys: list[str], anchor: str | None) -> str:
    """Return a key right after `anchor` (or first, if None) among `sorted_keys`.

    The next neighbor is taken from every key in `sorted_keys`, so the result never
    collides with any of them, including keys of hidden (archived) siblings.
    """
    if anchor is None:
        return key_between(None, sorted_keys[0] if sorted_keys else None)
    following = next((key for key in sorted_keys if key > anchor), None)
    return key_between(anchor, following)


def _check_key(key: str) -> None:
    if not key or key.endswith(DIGITS[0]) or any(char not in DIGITS for char in key):
        raise ValueError(f"Invalid sort key: {key!r}")


def _midpoint(low: str, high: str | None) -> str:
    if high is not None:
        prefix = 0
        while prefix < len(high) and _digit_at(low, prefix) == high[prefix]:
            prefix += 1
        if prefix > 0:
            return high[:prefix] + _midpoint(low[prefix:], high[prefix:])
    low_digit = DIGITS.index(low[0]) if low else 0
    high_digit = DIGITS.index(high[0]) if high is not None else _BASE
    if high_digit - low_digit > 1:
        return DIGITS[(low_digit + high_digit) // 2]
    if high is not None and len(high) > 1:
        return high[0]
    return DIGITS[low_digit] + _midpoint(low[1:], None)


def _digit_at(key: str, index: int) -> str:
    return key[index] if index < len(key) else DIGITS[0]
