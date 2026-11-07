import { describe, expect, it } from "vitest";
import { FakeApi } from "./fakeApi";
import {
  cardTitles,
  columnNames,
  dialog,
  renderApp,
  renderBoard,
  screen,
  waitFor,
  within,
} from "./render";

function seedDoing(fake: FakeApi, boardId: string) {
  fake.columns = fake.columns.filter(
    (c) => c.board_id !== boardId || c.name !== "Done",
  );
  const doing = fake.addColumn(boardId, "Doing");
  fake.addCard(doing.id, "first");
  fake.addCard(doing.id, "second");
  fake.addColumn(boardId, "Done");
}

describe("archive", () => {
  it("AC8: archiving Doing moves it with its 2 cards to the read-only archive view", async () => {
    const { user, fake, board } = await renderBoard(seedDoing);
    expect(columnNames()).toEqual(["To Do", "In Progress", "Doing", "Done"]);
    await user.click(
      screen.getByRole("button", { name: "Archive column Doing" }),
    );
    expect(columnNames()).toEqual(["To Do", "In Progress", "Done"]);
    await waitFor(() =>
      expect(fake.column(board.id, "Doing").archived_at).not.toBeNull(),
    );

    await user.click(screen.getByRole("link", { name: "Archive" }));
    const doing = await screen.findByRole("region", { name: "Doing" });
    expect(cardTitles("Doing")).toEqual(["first", "second"]);
    const buttons = within(doing)
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(buttons).toEqual(["Restore", "Delete"]);
    expect(within(doing).queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Move|Add|Rename/ }),
    ).not.toBeInTheDocument();
  });

  it("AC8: Restore brings the column back to its original position with both cards", async () => {
    const fake = new FakeApi();
    const board = fake.addBoard("Home");
    seedDoing(fake, board.id);
    fake.column(board.id, "Doing").archived_at = "2026-11-06T00:00:00Z";
    const { user } = renderApp(`/b/${board.id}/archive`, fake);
    await user.click(
      await screen.findByRole("button", { name: "Restore column Doing" }),
    );
    expect(await screen.findByText("No archived columns.")).toBeInTheDocument();
    expect(fake.mutations().at(-1)?.body).toEqual({ version: 1 });
    await user.click(screen.getByRole("link", { name: "Back to the board" }));
    await screen.findByRole("region", { name: "Doing" });
    expect(columnNames()).toEqual(["To Do", "In Progress", "Doing", "Done"]);
    expect(cardTitles("Doing")).toEqual(["first", "second"]);
  });

  it("AC8: Delete in the archive view uses the delete-column dialog", async () => {
    const fake = new FakeApi();
    const board = fake.addBoard("Home");
    seedDoing(fake, board.id);
    const doing = fake.column(board.id, "Doing");
    doing.archived_at = "2026-11-06T00:00:00Z";
    const empty = fake.addColumn(board.id, "Empty");
    empty.archived_at = "2026-11-06T00:00:00Z";
    const { user } = renderApp(`/b/${board.id}/archive`, fake);

    await user.click(
      await screen.findByRole("button", { name: "Delete column Empty" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Empty" }),
      ).not.toBeInTheDocument(),
    );
    expect(fake.columns.some((c) => c.id === empty.id)).toBe(false);

    await user.click(
      screen.getByRole("button", { name: "Delete column Doing" }),
    );
    const box = within(dialog());
    expect(box.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(
      within(box.getByRole("combobox", { name: "Target column" }))
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["To Do", "In Progress", "Done"]);
    await user.selectOptions(
      box.getByRole("combobox", { name: "Target column" }),
      "Done",
    );
    await user.click(box.getByRole("button", { name: "Move 2 cards to…" }));
    await waitFor(() =>
      expect(
        fake.cardsIn(fake.column(board.id, "Done").id).map((c) => c.title),
      ).toEqual(["first", "second"]),
    );
    const request = fake.mutations().at(-1);
    expect(request?.query.get("cards")).toBe("move");
    expect(await screen.findByText("No archived columns.")).toBeInTheDocument();
  });

  it("AC8: Delete the column and its cards works from the archive, and a 409 reloads it", async () => {
    const fake = new FakeApi();
    const board = fake.addBoard("Home");
    seedDoing(fake, board.id);
    const doing = fake.column(board.id, "Doing");
    doing.archived_at = "2026-11-06T00:00:00Z";
    const { user } = renderApp(`/b/${board.id}/archive`, fake);
    await screen.findByRole("region", { name: "Doing" });
    doing.version = 4;
    doing.name = "Renamed elsewhere";
    await user.click(
      screen.getByRole("button", { name: "Restore column Doing" }),
    );
    expect(
      await screen.findByText("This board changed elsewhere and was reloaded."),
    ).toBeInTheDocument();
    await user.click(
      await screen.findByRole("button", {
        name: "Delete column Renamed elsewhere",
      }),
    );
    await user.click(
      within(dialog()).getByRole("button", {
        name: "Delete the column and its 2 cards",
      }),
    );
    await waitFor(() => expect(fake.cards).toEqual([]));
  });

  it("AC8: canceling the delete dialog in the archive view leaves the column and sends nothing", async () => {
    const fake = new FakeApi();
    const board = fake.addBoard("Home");
    seedDoing(fake, board.id);
    const doing = fake.column(board.id, "Doing");
    doing.archived_at = "2026-11-06T00:00:00Z";
    const { user } = renderApp(`/b/${board.id}/archive`, fake);
    await user.click(
      await screen.findByRole("button", { name: "Delete column Doing" }),
    );
    expect(within(dialog()).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Doing" })).toBeInTheDocument();
    expect(fake.mutations()).toEqual([]);
  });

  it("AC8, AC17: rolls back and shows an error when restoring fails", async () => {
    const fake = new FakeApi();
    const board = fake.addBoard("Home");
    seedDoing(fake, board.id);
    fake.column(board.id, "Doing").archived_at = "2026-11-06T00:00:00Z";
    fake.failNext("POST", /restore/, 500);
    const { user } = renderApp(`/b/${board.id}/archive`, fake);
    await user.click(
      await screen.findByRole("button", { name: "Restore column Doing" }),
    );
    expect(
      await screen.findByText("Could not restore the column"),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Doing" })).toBeInTheDocument();
  });

  it("AC8: shows Board not found for an unknown board's archive", async () => {
    renderApp("/b/missing/archive");
    expect(await screen.findByText("Board not found.")).toBeInTheDocument();
  });
});
