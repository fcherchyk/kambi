import { act, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cardElement,
  cardTitles,
  columnNames,
  lastMutation,
  renderBoard,
  screen,
  waitFor,
} from "./render";

/** jsdom has no PointerEvent: a MouseEvent with the pointer fields dnd-kit reads is enough. */
class TestPointerEvent extends MouseEvent {
  readonly isPrimary: boolean;
  readonly pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.isPrimary = init.isPrimary ?? true;
    this.pointerId = init.pointerId ?? 1;
  }
}

/** jsdom has no layout: give columns, card areas and cards a simple grid of rectangles. */
function fakeRect(element: Element): DOMRect {
  const board = element.closest(".board");
  const columnEl = element.closest(".column");
  if (!board || !columnEl) return new DOMRect(0, 0, 0, 0);
  const columnIndex = Array.from(board.querySelectorAll(".column")).indexOf(
    columnEl,
  );
  const x = columnIndex * 300;
  if (element.classList.contains("card")) {
    const cardIndex = Array.from(columnEl.querySelectorAll(".card")).indexOf(
      element,
    );
    return new DOMRect(x + 10, 100 + cardIndex * 60, 260, 50);
  }
  if (element.classList.contains("cards")) return new DOMRect(x, 90, 280, 600);
  if (element.classList.contains("column")) return new DOMRect(x, 0, 280, 800);
  return new DOMRect(x, 0, 20, 20);
}

function center(element: Element) {
  const rect = fakeRect(element);
  return {
    clientX: rect.x + rect.width / 2,
    clientY: rect.y + rect.height / 2,
  };
}

async function drag(source: Element, to: { clientX: number; clientY: number }) {
  const start = center(source);
  const pointer = { isPrimary: true, button: 0, pointerId: 1 };
  fireEvent.pointerDown(source, { ...pointer, ...start });
  await act(async () => {
    fireEvent.pointerMove(document, {
      ...pointer,
      clientX: start.clientX + 10,
      clientY: start.clientY + 10,
    });
  });
  await act(async () => {
    fireEvent.pointerMove(document, { ...pointer, ...to });
  });
  await act(async () => {
    fireEvent.pointerUp(document, { ...pointer, ...to });
  });
}

describe("drag and drop", () => {
  beforeEach(() => {
    vi.stubGlobal("PointerEvent", TestPointerEvent);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        return fakeRect(this);
      },
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it("S1_AC16: dragging a card to another column sends the same move request", async () => {
    const { fake, board } = await renderBoard((fake, boardId) => {
      fake.addCard(fake.column(boardId, "To Do").id, "A");
      fake.addCard(fake.column(boardId, "To Do").id, "B");
    });
    const inProgress = screen
      .getByRole("region", { name: "In Progress" })
      .querySelector(".cards") as Element;
    await drag(cardElement("A"), {
      clientX: center(inProgress).clientX,
      clientY: 600,
    });
    await waitFor(() =>
      expect(lastMutation(fake)?.path).toBe(
        `/api/cards/${fake.card("A").id}/move`,
      ),
    );
    expect(lastMutation(fake)?.body).toEqual({
      column_id: fake.column(board.id, "In Progress").id,
      after_id: null,
      version: 1,
    });
    expect(cardTitles("In Progress")).toEqual(["A"]);
  });

  it("S1_AC16: dropping a card on a card below it in the same column places it after that card", async () => {
    const { fake } = await renderBoard((fake, boardId) => {
      for (const title of ["A", "B", "C"])
        fake.addCard(fake.column(boardId, "To Do").id, title);
    });
    await drag(cardElement("A"), center(cardElement("B")));
    await waitFor(() =>
      expect(lastMutation(fake)?.body).toMatchObject({
        after_id: fake.card("B").id,
      }),
    );
    expect(cardTitles("To Do")).toEqual(["B", "A", "C"]);
  });

  it("S1_AC9: dragging a column sends the same move request as ◀", async () => {
    const { fake, board } = await renderBoard();
    const handle = screen.getByLabelText("Drag column Done");
    const target = screen.getByRole("region", { name: "To Do" });
    await drag(handle, center(target));
    await waitFor(() =>
      expect(lastMutation(fake)?.path).toBe(
        `/api/columns/${fake.column(board.id, "Done").id}/move`,
      ),
    );
    expect(lastMutation(fake)?.body).toEqual({ after_id: null, version: 1 });
    expect(columnNames()).toEqual(["Done", "To Do", "In Progress"]);
  });
});
