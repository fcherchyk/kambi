import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { matchShortcut, SHORTCUTS } from "../keyboard/shortcuts";
import { FakeApi } from "./fakeApi";
import {
  cardElement,
  cardTitles,
  currentPath,
  dialog,
  renderApp,
  renderBoard,
  screen,
  waitFor,
  within,
} from "./render";

function seedGrid(fake: FakeApi, boardId: string) {
  const todo = fake.column(boardId, "To Do");
  fake.addCard(todo.id, "A1");
  fake.addCard(todo.id, "A2");
  fake.addCard(fake.column(boardId, "Done").id, "C1");
}

const selected = () =>
  document.querySelector(".card[aria-current='true'] .card-title")?.textContent;

describe("keyboard", () => {
  it("AC16: arrows move the selection across and within columns, skipping empty columns", async () => {
    const { user } = await renderBoard(seedGrid);
    await user.keyboard("{ArrowDown}");
    expect(selected()).toBe("A1");
    await user.keyboard("{ArrowDown}");
    expect(selected()).toBe("A2");
    await user.keyboard("{ArrowDown}");
    expect(selected()).toBe("A2");
    await user.keyboard("{ArrowRight}");
    expect(selected()).toBe("C1");
    await user.keyboard("{ArrowRight}");
    expect(selected()).toBe("C1");
    await user.keyboard("{ArrowLeft}");
    expect(selected()).toBe("A1");
    await user.keyboard("{ArrowUp}");
    expect(selected()).toBe("A1");
  });

  it("AC16: Enter opens the card dialog and Escape closes it", async () => {
    const { user, board, fake } = await renderBoard(seedGrid);
    await user.click(cardElement("A2"));
    await user.keyboard("{Enter}");
    expect(currentPath()).toBe(`/b/${board.id}/c/${fake.card("A2").id}`);
    expect(screen.getByRole("dialog", { name: "Card" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(currentPath()).toBe(`/b/${board.id}`);
  });

  it("AC16: F2 renames the selected card inline", async () => {
    const { user, fake } = await renderBoard(seedGrid);
    await user.click(cardElement("A1"));
    await user.keyboard("{F2}");
    const input = screen.getByRole("textbox", { name: "Card title" });
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, "Renamed{Enter}");
    expect(cardTitles("To Do")).toEqual(["Renamed", "A2"]);
    await waitFor(() =>
      expect(fake.mutations().at(-1)?.body).toEqual({
        title: "Renamed",
        version: 1,
      }),
    );
    await user.keyboard("{F2}");
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("textbox", { name: "Card title" }),
    ).not.toBeInTheDocument();
    await user.keyboard("{F2}");
    await user.clear(screen.getByRole("textbox", { name: "Card title" }));
    await user.keyboard("{Enter}");
    expect(
      await screen.findByText("Card title must be 1 to 200 characters."),
    ).toBeInTheDocument();
    expect(fake.mutations()).toHaveLength(1);
  });

  it("AC16: N opens the add-card input in the selected column", async () => {
    const { user } = await renderBoard(seedGrid);
    await user.click(cardElement("C1"));
    await user.keyboard("n");
    const done = within(screen.getByRole("region", { name: "Done" }));
    expect(
      done.getByRole("textbox", { name: "New card in Done" }),
    ).toHaveFocus();
  });

  it("AC16: shortcuts are ignored while focus is in a text input", async () => {
    const { user, fake } = await renderBoard(seedGrid);
    await user.click(cardElement("A1"));
    await user.click(
      screen.getByRole("button", { name: "Add column after To Do" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Name of the column after To Do" }),
      "n?{Delete}{F2}",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Card title" }),
    ).not.toBeInTheDocument();
    expect(fake.mutations()).toEqual([]);
  });

  it("AC16: ? and the ? button open a panel that lists every shortcut", async () => {
    const { user } = await renderBoard(seedGrid);
    await user.keyboard("?");
    let panel = within(
      screen.getByRole("dialog", { name: "Keyboard shortcuts" }),
    );
    for (const item of SHORTCUTS)
      expect(panel.getByText(item.description)).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Keyboard shortcuts" }),
    );
    panel = within(screen.getByRole("dialog", { name: "Keyboard shortcuts" }));
    expect(panel.getAllByRole("row")).toHaveLength(SHORTCUTS.length);
  });

  it("AC16: every registered shortcut is in the help panel and has a visible button", async () => {
    const { user, fake } = await renderBoard(seedGrid);
    await user.click(cardElement("A1"));
    await user.click(
      screen.getByRole("button", { name: "Keyboard shortcuts" }),
    );
    for (const item of SHORTCUTS) {
      expect(
        document.querySelector(`[data-shortcut-row="${item.id}"]`),
        item.id,
      ).toHaveTextContent(item.keys);
      const button = document.querySelector<HTMLButtonElement>(
        `button[data-shortcut="${item.id}"]`,
      );
      expect(button, `button for ${item.id}`).not.toBeNull();
      expect(button).toBeVisible();
    }
    await user.click(within(dialog()).getByRole("button", { name: "Close" }));
    for (const item of SHORTCUTS.filter((s) => s.scope === "board")) {
      expect(
        document.querySelector(`button[data-shortcut="${item.id}"]`),
        item.id,
      ).toBeEnabled();
    }
    expect(fake.mutations()).toEqual([]);
  });

  it("AC16: each toolbar button runs its action", async () => {
    const { user, fake, board } = await renderBoard(seedGrid);
    const press = (name: string) =>
      user.click(screen.getByRole("button", { name }));
    expect(
      screen.getByRole("button", { name: "Open the selected card" }),
    ).toBeDisabled();
    await press("Select the card below");
    expect(selected()).toBe("A1");
    await press("Select the card below");
    await press("Select the card above");
    await press("Select a card in the next column");
    await press("Select a card in the previous column");
    expect(selected()).toBe("A1");
    await press("Move the selected card down");
    expect(cardTitles("To Do")).toEqual(["A2", "A1"]);
    await press("Move the selected card up");
    await press("Move the selected card to the end of the next column");
    expect(cardTitles("In Progress")).toEqual(["A1"]);
    await press("Move the selected card to the end of the previous column");
    expect(cardTitles("To Do")).toEqual(["A2", "A1"]);
    await press("Rename the selected card");
    expect(
      screen.getByRole("textbox", { name: "Card title" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await press("Add a card to the selected column");
    expect(
      screen.getByRole("textbox", { name: "New card in To Do" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await press("Delete the selected card");
    await user.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    await press("Open the selected card");
    expect(currentPath()).toBe(`/b/${board.id}/c/${fake.card("A1").id}`);
  });

  it("maps keys to shortcuts and ignores modified keys", () => {
    const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);
    expect(matchShortcut(key({ key: "ArrowLeft", shiftKey: true }))).toBe(
      "move-left",
    );
    expect(matchShortcut(key({ key: "Backspace" }))).toBe("delete");
    expect(matchShortcut(key({ key: "N" }))).toBe("add-card");
    expect(matchShortcut(key({ key: "x" }))).toBeNull();
    expect(matchShortcut(key({ key: "n", ctrlKey: true }))).toBeNull();
  });

  it("? opens the help panel on the boards list too", async () => {
    renderApp("/");
    await screen.findByText("No boards yet. Create one above.");
    fireEvent.keyDown(window, { key: "?" });
    expect(
      screen.getByRole("dialog", { name: "Keyboard shortcuts" }),
    ).toBeInTheDocument();
  });
});
