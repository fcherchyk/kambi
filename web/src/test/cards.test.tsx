import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  cardElement,
  cardTitles,
  currentPath,
  dialog,
  lastMutation,
  renderBoard,
  screen,
  waitFor,
  within,
} from "./render";

describe("cards", () => {
  it("AC11: Enter creates a trimmed card at the end with the first type, and keeps an empty input focused", async () => {
    const { user, fake, board } = await renderBoard((fake, boardId) => {
      fake.addCard(fake.column(boardId, "To Do").id, "Existing");
      fake.addType(boardId, "Bug", "red");
    });
    const todo = within(screen.getByRole("region", { name: "To Do" }));
    await user.click(todo.getByRole("button", { name: "+ Add card" }));
    const input = todo.getByRole("textbox", { name: "New card in To Do" });
    await user.type(input, "  Buy milk  {Enter}");
    expect(cardTitles("To Do")).toEqual(["Existing", "Buy milk"]);
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    await waitFor(() => expect(fake.card("Buy milk")).toBeDefined());
    expect(lastMutation(fake)?.body).toEqual({
      title: "Buy milk",
      description: "",
    });
    expect(cardElement("Buy milk")).toHaveAttribute("data-color", "yellow");
    expect(fake.card("Buy milk").type_id).toBe(fake.typesOf(board.id)[0]?.id);
  });

  it("AC11: Escape closes the input and an empty title sends nothing", async () => {
    const { user, fake } = await renderBoard();
    const todo = within(screen.getByRole("region", { name: "To Do" }));
    await user.click(todo.getByRole("button", { name: "+ Add card" }));
    await user.type(
      todo.getByRole("textbox", { name: "New card in To Do" }),
      "   {Enter}",
    );
    expect(cardTitles("To Do")).toEqual([]);
    await user.keyboard("{Escape}");
    expect(
      todo.queryByRole("textbox", { name: "New card in To Do" }),
    ).not.toBeInTheDocument();
    expect(fake.mutations()).toEqual([]);
  });

  it("AC11: a card title longer than 200 characters shows an error and sends nothing", async () => {
    const { user, fake } = await renderBoard();
    const todo = within(screen.getByRole("region", { name: "To Do" }));
    await user.click(todo.getByRole("button", { name: "+ Add card" }));
    await user.type(
      todo.getByRole("textbox", { name: "New card in To Do" }),
      `${"c".repeat(201)}{Enter}`,
    );
    expect(
      await screen.findByText("Card title must be 1 to 200 characters."),
    ).toBeInTheDocument();
    expect(cardTitles("To Do")).toEqual([]);
    expect(fake.mutations()).toEqual([]);
  });

  it("AC12: the card dialog opens directly from the URL and saves edits with one PATCH", async () => {
    let cardId = "";
    const { user, fake, board } = await renderBoard((fake, boardId) => {
      fake.addType(boardId, "Bug", "red");
      cardId = fake.addCard(
        fake.column(boardId, "To Do").id,
        "Write tests",
        undefined,
        "Some notes",
      ).id;
    }, "");
    await user.click(cardElement("Write tests"));
    await user.keyboard("{Enter}");
    expect(currentPath()).toBe(`/b/${board.id}/c/${cardId}`);
    const box = within(dialog());
    expect(box.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Write tests",
    );
    expect(box.getByRole("textbox", { name: "Description" })).toHaveValue(
      "Some notes",
    );
    expect(box.getByRole("combobox", { name: "Type" })).toHaveDisplayValue(
      "Task",
    );

    await user.clear(box.getByRole("textbox", { name: "Title" }));
    await user.type(
      box.getByRole("textbox", { name: "Title" }),
      "Write more tests",
    );
    await user.type(
      box.getByRole("textbox", { name: "Description" }),
      "\nline two",
    );
    await user.selectOptions(
      box.getByRole("combobox", { name: "Type" }),
      "Bug",
    );
    await user.click(box.getByRole("button", { name: "Save" }));

    expect(currentPath()).toBe(`/b/${board.id}`);
    expect(cardElement("Write more tests")).toHaveAttribute(
      "data-color",
      "red",
    );
    await waitFor(() => expect(fake.mutations()).toHaveLength(1));
    expect(lastMutation(fake)?.body).toEqual({
      title: "Write more tests",
      description: "Some notes\nline two",
      type_id: fake.typesOf(board.id)[1]?.id,
      version: 1,
    });
  });

  it("AC12: rendering /b/:boardId/c/:cardId directly shows the dialog over the board", async () => {
    let cardId = "";
    const fakeSeed = (fake: import("./fakeApi").FakeApi, boardId: string) => {
      cardId = fake.addCard(fake.column(boardId, "To Do").id, "Deep link").id;
    };
    const { renderApp } = await import("./render");
    const { FakeApi } = await import("./fakeApi");
    const fake = new FakeApi();
    const board = fake.addBoard("Home");
    fakeSeed(fake, board.id);
    const { user } = renderApp(`/b/${board.id}/c/${cardId}`, fake);
    expect(
      await screen.findByRole("dialog", { name: "Card" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Home" }),
    ).toBeInTheDocument();
    expect(
      within(dialog()).getByRole("textbox", { name: "Title" }),
    ).toHaveValue("Deep link");
    await user.keyboard("{Escape}");
    expect(currentPath()).toBe(`/b/${board.id}`);
    await user.click(cardElement("Deep link"));
    await user.dblClick(cardElement("Deep link"));
    await user.click(within(dialog()).getByRole("button", { name: "Close" }));
    expect(currentPath()).toBe(`/b/${board.id}`);
    expect(fake.mutations()).toEqual([]);
  });

  it("AC12: an unknown card id shows Card not found and returns to the board", async () => {
    const { board } = await renderBoard(undefined, "/c/nope");
    expect(await screen.findByText("Card not found.")).toBeInTheDocument();
    await waitFor(() => expect(currentPath()).toBe(`/b/${board.id}`));
  });

  it("AC12: an empty or invalid title, or description > 10000 chars in the dialog shows an error and sends nothing", async () => {
    const { user, fake } = await renderBoard((fake, boardId) => {
      fake.addCard(fake.column(boardId, "To Do").id, "Title");
    });
    await user.dblClick(cardElement("Title"));
    const box = within(dialog());
    await user.clear(box.getByRole("textbox", { name: "Title" }));
    await user.click(box.getByRole("button", { name: "Save" }));
    expect(box.getByRole("alert")).toHaveTextContent(
      "Card title must be 1 to 200 characters.",
    );
    expect(fake.mutations()).toEqual([]);

    await user.type(box.getByRole("textbox", { name: "Title" }), "x".repeat(201));
    await user.click(box.getByRole("button", { name: "Save" }));
    expect(box.getByRole("alert")).toHaveTextContent(
      "Card title must be 1 to 200 characters.",
    );
    expect(fake.mutations()).toEqual([]);

    await user.clear(box.getByRole("textbox", { name: "Title" }));
    await user.type(box.getByRole("textbox", { name: "Title" }), "Valid Title");
    fireEvent.change(box.getByRole("textbox", { name: "Description" }), {
      target: { value: "d".repeat(10001) },
    });
    await user.click(box.getByRole("button", { name: "Save" }));
    expect(box.getByRole("alert")).toHaveTextContent(
      "Description must be at most 10000 characters.",
    );
    expect(fake.mutations()).toEqual([]);
  });

  it("AC14: Move to… places the selected card after a given card with one move request", async () => {
    const { user, fake, board } = await renderBoard((fake, boardId) => {
      const todo = fake.column(boardId, "To Do");
      fake.addCard(todo.id, "A");
      fake.addCard(todo.id, "B");
      const done = fake.column(boardId, "Done");
      fake.addCard(done.id, "X");
      fake.addCard(done.id, "Y");
    });
    await user.click(cardElement("B"));
    await user.click(screen.getByRole("button", { name: "Move to…" }));
    const box = within(dialog());
    await user.selectOptions(
      box.getByRole("combobox", { name: "Column" }),
      "Done",
    );
    await user.selectOptions(
      box.getByRole("combobox", { name: "Position" }),
      "After X",
    );
    await user.click(box.getByRole("button", { name: "Move" }));
    expect(cardTitles("To Do")).toEqual(["A"]);
    expect(cardTitles("Done")).toEqual(["X", "B", "Y"]);
    await waitFor(() => expect(fake.mutations()).toHaveLength(1));
    const request = lastMutation(fake);
    expect(request?.path).toBe(`/api/cards/${fake.card("B").id}/move`);
    expect(request?.body).toEqual({
      column_id: fake.column(board.id, "Done").id,
      after_id: fake.card("X").id,
      version: 1,
    });
  });

  it("AC14: Move to… from the card dialog can put a card at the top", async () => {
    const { user, fake } = await renderBoard((fake, boardId) => {
      const todo = fake.column(boardId, "To Do");
      fake.addCard(todo.id, "A");
      fake.addCard(todo.id, "B");
    });
    await user.dblClick(cardElement("B"));
    await user.click(
      within(dialog()).getByRole("button", { name: "Move to…" }),
    );
    await user.selectOptions(
      within(dialog()).getByRole("combobox", { name: "Position" }),
      "At the top",
    );
    await user.click(within(dialog()).getByRole("button", { name: "Move" }));
    expect(cardTitles("To Do")).toEqual(["B", "A"]);
    await waitFor(() =>
      expect(lastMutation(fake)?.body).toMatchObject({ after_id: null }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("AC14: Shift+→ moves the selected card to the end of the next column", async () => {
    const { user, fake, board } = await renderBoard((fake, boardId) => {
      fake.addCard(fake.column(boardId, "To Do").id, "A");
      fake.addCard(fake.column(boardId, "In Progress").id, "P");
    });
    await user.click(cardElement("A"));
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(cardTitles("In Progress")).toEqual(["P", "A"]);
    await waitFor(() =>
      expect(lastMutation(fake)?.body).toEqual({
        column_id: fake.column(board.id, "In Progress").id,
        after_id: fake.card("P").id,
        version: 1,
      }),
    );
    await user.keyboard("{Shift>}{ArrowLeft}{/Shift}");
    expect(cardTitles("To Do")).toEqual(["A"]);
    await waitFor(() =>
      expect(lastMutation(fake)?.body).toMatchObject({
        after_id: null,
        version: 2,
      }),
    );
  });

  it("AC14: Shift+↑ and Shift+↓ swap the card with its neighbor", async () => {
    const { user, fake } = await renderBoard((fake, boardId) => {
      const todo = fake.column(boardId, "To Do");
      for (const title of ["A", "B", "C"]) fake.addCard(todo.id, title);
    });
    await user.click(cardElement("B"));
    await user.keyboard("{Shift>}{ArrowDown}{/Shift}");
    expect(cardTitles("To Do")).toEqual(["A", "C", "B"]);
    await waitFor(() =>
      expect(lastMutation(fake)?.body).toMatchObject({
        after_id: fake.card("C").id,
      }),
    );
    await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
    await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(cardTitles("To Do")).toEqual(["B", "A", "C"]);
    await waitFor(() =>
      expect(lastMutation(fake)?.body).toMatchObject({
        after_id: null,
        version: 3,
      }),
    );
    await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(fake.mutations()).toHaveLength(3);
  });

  it("AC14: Shift+Arrow at boundaries (first/last column, bottom card) sends no requests", async () => {
    const { user, fake } = await renderBoard((fake, boardId) => {
      fake.addCard(fake.column(boardId, "To Do").id, "Top");
      fake.addCard(fake.column(boardId, "To Do").id, "Bottom");
      fake.addCard(fake.column(boardId, "Done").id, "LastCol");
    });
    // Shift+Left from first column
    await user.click(cardElement("Top"));
    await user.keyboard("{Shift>}{ArrowLeft}{/Shift}");
    expect(fake.mutations()).toHaveLength(0);

    // Shift+Down from bottom of column
    await user.click(cardElement("Bottom"));
    await user.keyboard("{Shift>}{ArrowDown}{/Shift}");
    expect(fake.mutations()).toHaveLength(0);

    // Shift+Right from last column
    await user.click(cardElement("LastCol"));
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(fake.mutations()).toHaveLength(0);
  });

  it.each(["Delete key", "delete button"])(
    "AC15: the %s asks for confirmation before deleting",
    async (how) => {
      const { user, fake } = await renderBoard((fake, boardId) => {
        const todo = fake.column(boardId, "To Do");
        fake.addCard(todo.id, "A");
        fake.addCard(todo.id, "B");
      });
      const open = async () => {
        await user.click(cardElement("A"));
        if (how === "Delete key") await user.keyboard("{Delete}");
        else
          await user.click(
            screen.getByRole("button", { name: "Delete the selected card" }),
          );
      };
      await open();
      expect(
        within(dialog()).getByText("Delete “A”? This cannot be undone."),
      ).toBeInTheDocument();
      await user.click(
        within(dialog()).getByRole("button", { name: "Cancel" }),
      );
      expect(cardTitles("To Do")).toEqual(["A", "B"]);
      expect(fake.mutations()).toEqual([]);

      await open();
      await user.click(
        within(dialog()).getByRole("button", { name: "Delete card" }),
      );
      expect(cardTitles("To Do")).toEqual(["B"]);
      await waitFor(() =>
        expect(fake.cards.map((c) => c.title)).toEqual(["B"]),
      );
      expect(lastMutation(fake)?.method).toBe("DELETE");
      expect(cardElement("B")).toHaveAttribute("aria-current", "true");
    },
  );

  it("AC15: a card can be deleted from its dialog", async () => {
    const { user, fake, board } = await renderBoard((fake, boardId) => {
      fake.addCard(fake.column(boardId, "To Do").id, "A");
    });
    await user.dblClick(cardElement("A"));
    await user.click(
      within(dialog()).getByRole("button", { name: "Delete card" }),
    );
    await user.click(
      within(dialog()).getByRole("button", { name: "Delete card" }),
    );
    await waitFor(() => expect(fake.cards).toEqual([]));
    expect(currentPath()).toBe(`/b/${board.id}`);
    expect(screen.queryByText("Card not found.")).not.toBeInTheDocument();
  });

  it("AC15: pressing Escape on the delete confirmation cancels and keeps the card", async () => {
    const { user, fake } = await renderBoard((fake, boardId) => {
      fake.addCard(fake.column(boardId, "To Do").id, "A");
    });
    await user.click(cardElement("A"));
    await user.keyboard("{Delete}");
    expect(
      within(dialog()).getByText("Delete “A”? This cannot be undone."),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cardTitles("To Do")).toEqual(["A"]);
    expect(fake.mutations()).toEqual([]);
  });
});
