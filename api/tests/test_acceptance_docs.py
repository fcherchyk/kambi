"""S1_AC20: `docs/S1_mvp.md` and the test names agree (text only, no database or Node)."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "docs" / "S1_mvp.md"
API_TESTS = ROOT / "api" / "tests"
WEB_SRC = ROOT / "web" / "src"

HEADING = re.compile(r"^### S1_AC(\d+): ", re.M)
API_TEST = re.compile(r"^def (test_\w+)", re.M)
WEB_TITLE = re.compile(r'"((S1_AC\d+(?:, S1_AC\d+)*): [^"]*)"')
WEB_CALL = re.compile(r"\bit(?:\.each)?\(")


def documented() -> dict[int, set[str]]:
    """Map each criterion number to the test ids listed under its heading."""
    text = DOC.read_text()
    sections = HEADING.split(text)[1:]
    listed: dict[int, set[str]] = {}
    for number, body in zip(sections[::2], sections[1::2], strict=True):
        body = body.split("\n## ", 1)[0]
        listed[int(number)] = set(re.findall(r"^- (.+)$", body, re.M))
    return listed


def api_tests() -> list[tuple[str, str]]:
    """(file, function) for every pytest test."""
    return [
        (str(path.relative_to(ROOT)), name)
        for path in sorted(API_TESTS.glob("test_*.py"))
        for name in API_TEST.findall(path.read_text())
    ]


def web_files() -> list[Path]:
    return sorted(WEB_SRC.rglob("*.test.ts*"))


def in_sources() -> dict[int, set[str]]:
    """Map each criterion number to the test ids found in the test sources."""
    found: dict[int, set[str]] = {}
    for file, name in api_tests():
        match = re.match(r"test_S1_AC(\d+)_", name)
        if match:
            found.setdefault(int(match[1]), set()).add(f"`{file}::{name}`")
    for path in web_files():
        file = path.relative_to(ROOT)
        for title, prefix in WEB_TITLE.findall(path.read_text()):
            for number in re.findall(r"S1_AC(\d+)", prefix):
                found.setdefault(int(number), set()).add(f'`{file}` › "{title}"')
    return found


def test_S1_AC20_every_acceptance_criterion_has_tests() -> None:
    listed = documented()

    assert sorted(listed) == list(range(1, len(listed) + 1)), "criteria must be S1_AC1..n"
    assert [n for n, tests in listed.items() if not tests] == []


def test_S1_AC20_the_doc_lists_exactly_the_tests_that_exist() -> None:
    listed, found = documented(), in_sources()

    for number in sorted(set(listed) | set(found)):
        assert listed.get(number, set()) == found.get(number, set()), f"S1_AC{number}"


def test_S1_AC20_every_test_names_its_criterion() -> None:
    unnamed_api = [f"{file}::{name}" for file, name in api_tests() if "_S1_AC" not in name]
    unnamed_web = [
        str(path.relative_to(ROOT))
        for path in web_files()
        if len(WEB_CALL.findall(path.read_text())) != len(WEB_TITLE.findall(path.read_text()))
    ]

    assert unnamed_api == []
    assert unnamed_web == [], "every it()/it.each() title must start with S1_ACn"
