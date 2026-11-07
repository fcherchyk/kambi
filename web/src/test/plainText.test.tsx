import { describe, expect, it } from "vitest";
import { FakeApi } from "./fakeApi";
import { dialog, renderApp, screen, within } from "./render";

const EVIL = "<script>alert(1)</script><b>x</b>";

function noInjectedElements() {
  expect(document.querySelector("script")).toBeNull();
  expect(document.querySelector("b")).toBeNull();
}

function seed() {
  const fake = new FakeApi();
  const board = fake.addBoard(EVIL, [EVIL, "Other"]);
  const type = fake.typesOf(board.id)[0]!;
  type.name = EVIL;
  const card = fake.addCard(
    fake.activeColumns(board.id)[0]!.id,
    EVIL,
    type.id,
    EVIL,
  );
  const archived = fake.addColumn(board.id, `${EVIL} archived`);
  fake.addCard(archived.id, `${EVIL} old`, type.id, EVIL);
  archived.archived_at = "2026-11-06T00:00:00Z";
  return { fake, board, card };
}

describe("plain text", () => {
  it("S1_AC17: the boards list shows markup in names as literal text", async () => {
    const { fake } = seed();
    renderApp("/", fake);
    expect(await screen.findByRole("link", { name: EVIL })).toHaveTextContent(
      EVIL,
    );
    noInjectedElements();
  });

  it("S1_AC17: the board view and the card dialog show markup as literal text", async () => {
    const { fake, board, card } = seed();
    renderApp(`/b/${board.id}/c/${card.id}`, fake);
    expect(
      await screen.findByRole("heading", { level: 1, name: EVIL }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: EVIL }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: EVIL })).toHaveTextContent(
      `${EVIL}${EVIL}`,
    );
    const box = within(dialog());
    expect(box.getByRole("textbox", { name: "Title" })).toHaveValue(EVIL);
    expect(box.getByRole("textbox", { name: "Description" })).toHaveValue(EVIL);
    expect(box.getByRole("combobox", { name: "Type" })).toHaveDisplayValue(
      EVIL,
    );
    noInjectedElements();
  });

  it("S1_AC17: the archive shows markup as literal text", async () => {
    const { fake, board } = seed();
    renderApp(`/b/${board.id}/archive`, fake);
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: `${EVIL} archived`,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(`${EVIL} old`)).toBeInTheDocument();
    expect(screen.getByText(EVIL, { selector: "p" })).toBeInTheDocument();
    noInjectedElements();
  });
});
