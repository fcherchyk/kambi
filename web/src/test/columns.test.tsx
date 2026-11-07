import { describe, expect, it } from "vitest";
import {
  cardTitles,
  columnNames,
  dialog,
  lastMutation,
  renderBoard,
  screen,
  waitFor,
  within,
} from "./render";

describe("columns", () => {
  it("AC5: a column added after To Do shows in second position", async () => {
    const { user, fake, board } = await renderBoard();
    await user.click(
      screen.getByRole("button", { name: "Add column after To Do" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Name of the column after To Do" }),
      "Review{Enter}",
    );
    expect(columnNames()).toEqual(["To Do", "Review", "In Progress", "Done"]);
    await waitFor(() =>
      expect(fake.activeColumns(board.id).map((c) => c.name)[1]).toBe("Review"),
    );
    expect(lastMutation(fake)?.body).toEqual({
      name: "Review",
      after_id: fake.column(board.id, "To Do").id,
    });
    expect(columnNames()).toEqual(["To Do", "Review", "In Progress", "Done"]);
  });

  it("AC5: a column added at the end is appended", async () => {
    const { user, fake, board } = await renderBoard();
    await user.click(screen.getByRole("button", { name: "+ Add column" }));
    await user.type(
      screen.getByRole("textbox", { name: "New column name" }),
      "Later{Enter}",
    );
    await waitFor(() =>
      expect(fake.activeColumns(board.id).at(-1)?.name).toBe("Later"),
    );
    expect(lastMutation(fake)?.body).toEqual({ name: "Later" });
    expect(columnNames().at(-1)).toBe("Later");
  });

  it("AC5: a column added with exactly 100 characters succeeds", async () => {
    const { user, fake, board } = await renderBoard();
    const name = "C".repeat(100);
    await user.click(screen.getByRole("button", { name: "+ Add column" }));
    await user.type(
      screen.getByRole("textbox", { name: "New column name" }),
      `${name}{Enter}`,
    );
    await waitFor(() =>
      expect(fake.activeColumns(board.id).at(-1)?.name).toBe(name),
    );
    expect(lastMutation(fake)?.body).toEqual({ name });
    expect(columnNames().at(-1)).toBe(name);
  });

  it("AC5: renaming a column shows the new name", async () => {
    const { user, fake, board } = await renderBoard();
    await user.click(
      screen.getByRole("button", { name: "Rename column Done" }),
    );
    const input = screen.getByRole("textbox", {
      name: "New name for column Done",
    });
    await user.clear(input);
    await user.type(input, "Shipped{Enter}");
    expect(columnNames()).toEqual(["To Do", "In Progress", "Shipped"]);
    await waitFor(() => expect(fake.column(board.id, "Shipped")).toBeDefined());
  });

  it("AC5: ◀ moves Done before In Progress with one move request", async () => {
    const { user, fake, board } = await renderBoard();
    const done = fake.column(board.id, "Done");
    await user.click(
      screen.getByRole("button", { name: "Move column Done left" }),
    );
    expect(columnNames()).toEqual(["To Do", "Done", "In Progress"]);
    await waitFor(() => expect(fake.mutations()).toHaveLength(1));
    const request = lastMutation(fake);
    expect(request?.path).toBe(`/api/columns/${done.id}/move`);
    expect(request?.body).toEqual({
      after_id: fake.column(board.id, "To Do").id,
      version: 1,
    });
  });

  it("AC5: ▶ moves a column right, and the ends are disabled", async () => {
    const { user, fake, board } = await renderBoard();
    expect(
      screen.getByRole("button", { name: "Move column To Do left" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move column Done right" }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Move column To Do right" }),
    );
    expect(columnNames()).toEqual(["In Progress", "To Do", "Done"]);
    await waitFor(() =>
      expect(lastMutation(fake)?.body).toEqual({
        after_id: fake.column(board.id, "In Progress").id,
        version: 1,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Move column To Do left" }),
    );
    await waitFor(() =>
      expect(lastMutation(fake)?.body).toEqual({ after_id: null, version: 2 }),
    );
    expect(columnNames()).toEqual(["To Do", "In Progress", "Done"]);
  });

  it("AC6: the delete dialog offers move, delete and cancel, with focus on Cancel", async () => {
    const { user } = await renderBoard((fake, boardId) => {
      const todo = fake.column(boardId, "To Do");
      fake.addCard(todo.id, "one");
      fake.addCard(todo.id, "two");
    });
    await user.click(
      screen.getByRole("button", { name: "Delete column To Do" }),
    );
    const box = dialog();
    expect(
      within(box).getByRole("button", { name: "Move 2 cards to…" }),
    ).toBeInTheDocument();
    expect(
      within(box).getByRole("button", {
        name: "Delete the column and its 2 cards",
      }),
    ).toBeInTheDocument();
    expect(within(box).getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("AC6: Move 2 cards to Done sends cards=move and puts them at the end of Done in order", async () => {
    const { user, fake, board } = await renderBoard((fake, boardId) => {
      const todo = fake.column(boardId, "To Do");
      fake.addCard(todo.id, "one");
      fake.addCard(todo.id, "two");
      fake.addCard(fake.column(boardId, "Done").id, "zero");
    });
    const todo = fake.column(board.id, "To Do");
    const done = fake.column(board.id, "Done");
    await user.click(
      screen.getByRole("button", { name: "Delete column To Do" }),
    );
    await user.selectOptions(
      within(dialog()).getByRole("combobox", { name: "Target column" }),
      "Done",
    );
    await user.click(
      within(dialog()).getByRole("button", { name: "Move 2 cards to…" }),
    );
    expect(cardTitles("Done")).toEqual(["zero", "one", "two"]);
    await waitFor(() =>
      expect(fake.columns.some((c) => c.id === todo.id)).toBe(false),
    );
    const request = lastMutation(fake);
    expect(request?.method).toBe("DELETE");
    expect(request?.path).toBe(`/api/columns/${todo.id}`);
    expect(Object.fromEntries(request?.query ?? [])).toEqual({
      version: "1",
      cards: "move",
      target: done.id,
    });
    await waitFor(() =>
      expect(cardTitles("Done")).toEqual(["zero", "one", "two"]),
    );
    expect(columnNames()).toEqual(["In Progress", "Done"]);
  });

  it("AC6: Delete the column and its 2 cards sends cards=delete and removes them", async () => {
    const { user, fake, board } = await renderBoard((fake, boardId) => {
      const todo = fake.column(boardId, "To Do");
      fake.addCard(todo.id, "one");
      fake.addCard(todo.id, "two");
    });
    await user.click(
      screen.getByRole("button", { name: "Delete column To Do" }),
    );
    await user.click(
      within(dialog()).getByRole("button", {
        name: "Delete the column and its 2 cards",
      }),
    );
    expect(columnNames()).toEqual(["In Progress", "Done"]);
    expect(screen.queryByText("one")).not.toBeInTheDocument();
    await waitFor(() => expect(fake.cards).toEqual([]));
    expect(lastMutation(fake)?.query.get("cards")).toBe("delete");
    expect(fake.activeColumns(board.id)).toHaveLength(2);
  });

  it.each(["Cancel", "Escape"])(
    "AC6: %s closes the dialog and sends nothing",
    async (how) => {
      const { user, fake } = await renderBoard((fake, boardId) => {
        fake.addCard(fake.column(boardId, "To Do").id, "one");
      });
      await user.click(
        screen.getByRole("button", { name: "Delete column To Do" }),
      );
      if (how === "Cancel")
        await user.click(
          within(dialog()).getByRole("button", { name: "Cancel" }),
        );
      else await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(fake.mutations()).toEqual([]);
      expect(columnNames()).toEqual(["To Do", "In Progress", "Done"]);
    },
  );

  it("AC6: an empty column is deleted without a dialog", async () => {
    const { user, fake, board } = await renderBoard();
    const done = fake.column(board.id, "Done");
    await user.click(
      screen.getByRole("button", { name: "Delete column Done" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(columnNames()).toEqual(["To Do", "In Progress"]);
    await waitFor(() =>
      expect(fake.columns.some((c) => c.id === done.id)).toBe(false),
    );
    expect(lastMutation(fake)?.query.get("cards")).toBeNull();
  });

  it("AC7: the last active column cannot be archived or deleted", async () => {
    const { fake } = await renderBoard((fake, boardId) => {
      fake.columns = fake.columns.filter(
        (c) => c.board_id !== boardId || c.name === "To Do",
      );
    });
    expect(
      screen.getByRole("button", { name: "Archive column To Do" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Delete column To Do" }),
    ).toBeDisabled();
    expect(fake.mutations()).toEqual([]);
  });

  it("AC6: the delete dialog for a column with 1 card shows singular card text and excludes the column itself from targets", async () => {
    const { user, fake } = await renderBoard((fake, boardId) => {
      const todo = fake.column(boardId, "To Do");
      fake.addCard(todo.id, "lone card");
    });
    await user.click(
      screen.getByRole("button", { name: "Delete column To Do" }),
    );
    const box = dialog();
    expect(within(box).getByText("This column has 1 card.")).toBeInTheDocument();
    expect(
      within(box).getByRole("button", { name: "Move 1 card to…" }),
    ).toBeInTheDocument();
    expect(
      within(box).getByRole("button", {
        name: "Delete the column and its 1 card",
      }),
    ).toBeInTheDocument();
    const targetOptions = within(
      within(box).getByRole("combobox", { name: "Target column" }),
    )
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(targetOptions).toEqual(["In Progress", "Done"]);
    expect(targetOptions).not.toContain("To Do");
    await user.click(within(box).getByRole("button", { name: "Cancel" }));
    expect(fake.mutations()).toEqual([]);
  });

  it("AC7: the last active column cannot be archived or deleted even when archived columns exist", async () => {
    const { fake } = await renderBoard((fake, boardId) => {
      fake.columns = fake.columns.filter(
        (c) => c.board_id !== boardId || c.name === "To Do",
      );
      const archived = fake.addColumn(boardId, "Old");
      archived.archived_at = "2026-11-06T00:00:00Z";
    });
    expect(
      screen.getByRole("button", { name: "Archive column To Do" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Delete column To Do" }),
    ).toBeDisabled();
    expect(fake.mutations()).toEqual([]);
  });

  it("AC5: shows Board not found for an unknown board", async () => {
    const { renderApp } = await import("./render");
    renderApp("/b/missing");
    expect(await screen.findByText("Board not found.")).toBeInTheDocument();
  });

  it("AC5: rejects an invalid column name (empty or >100 chars) without sending anything", async () => {
    const { user, fake } = await renderBoard();
    await user.click(
      screen.getByRole("button", { name: "Rename column Done" }),
    );
    const input = screen.getByRole("textbox", {
      name: "New name for column Done",
    });
    await user.clear(input);
    await user.keyboard("{Enter}");
    expect(
      await screen.findByText("Column name must be 1 to 100 characters."),
    ).toBeInTheDocument();
    await user.type(input, `${"x".repeat(101)}{Enter}`);
    expect(
      await screen.findAllByText("Column name must be 1 to 100 characters."),
    ).toHaveLength(2);
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "+ Add column" }));
    await user.keyboard("{Enter}");
    await user.type(
      screen.getByRole("textbox", { name: "New column name" }),
      `${"x".repeat(101)}{Enter}`,
    );
    expect(
      (await screen.findAllByText("Column name must be 1 to 100 characters.")).length,
    ).toBeGreaterThanOrEqual(3);
    await user.keyboard("{Escape}");

    await user.click(
      screen.getByRole("button", { name: "Add column after To Do" }),
    );
    await user.keyboard("{Enter}");
    expect(fake.mutations()).toEqual([]);
  });
});
