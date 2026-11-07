import { describe, expect, it } from "vitest";
import { FakeApi } from "./fakeApi";
import {
  columnNames,
  dialog,
  renderApp,
  screen,
  waitFor,
  within,
} from "./render";

describe("boards list", () => {
  it("S1_AC5: creating a board lists it, and opening it shows the three default columns", async () => {
    const { user, fake } = renderApp("/");
    await screen.findByText("No boards yet. Create one above.");
    await user.type(
      screen.getByRole("textbox", { name: "Board name" }),
      "Home",
    );
    await user.click(screen.getByRole("button", { name: "Create board" }));
    await user.click(await screen.findByRole("link", { name: "Home" }));
    await screen.findByRole("heading", { level: 1, name: "Home" });
    expect(columnNames()).toEqual(["To Do", "In Progress", "Done"]);
    expect(fake.mutations()[0]?.body).toEqual({ name: "Home" });
  });

  it("S1_AC5: renaming a board shows the new name", async () => {
    const fake = new FakeApi();
    fake.addBoard("Home");
    const { user } = renderApp("/", fake);
    await user.click(
      await screen.findByRole("button", { name: "Rename board Home" }),
    );
    const input = screen.getByRole("textbox", { name: "New name for Home" });
    await user.clear(input);
    await user.type(input, "House{Enter}");
    expect(
      await screen.findByRole("link", { name: "House" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(fake.boards[0]?.name).toBe("House"));
    expect(fake.mutations().at(-1)?.body).toEqual({
      name: "House",
      version: 1,
    });
  });

  it("S1_AC5: creating a board with exactly 100 characters succeeds", async () => {
    const { user, fake } = renderApp("/");
    await screen.findByText("No boards yet. Create one above.");
    const name = "B".repeat(100);
    await user.type(screen.getByRole("textbox", { name: "Board name" }), name);
    await user.click(screen.getByRole("button", { name: "Create board" }));
    expect(await screen.findByRole("link", { name })).toBeInTheDocument();
    expect(fake.mutations()[0]?.body).toEqual({ name });
  });

  it.each([
    ["empty", "   "],
    ["too long", "x".repeat(101)],
  ])(
    "S1_AC5: a %s board name shows a validation message and sends nothing",
    async (_, name) => {
      const { user, fake } = renderApp("/");
      await screen.findByText("No boards yet. Create one above.");
      await user.type(
        screen.getByRole("textbox", { name: "Board name" }),
        name,
      );
      await user.click(screen.getByRole("button", { name: "Create board" }));
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Board name must be 1 to 100 characters.",
      );
      expect(fake.mutations()).toEqual([]);
    },
  );

  it("S1_AC5: an invalid rename shows a validation message and sends nothing", async () => {
    const fake = new FakeApi();
    fake.addBoard("Home");
    const { user } = renderApp("/", fake);
    await user.click(
      await screen.findByRole("button", { name: "Rename board Home" }),
    );
    const input = screen.getByRole("textbox", { name: "New name for Home" });
    await user.clear(input);
    await user.keyboard("{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Board name must be 1 to 100 characters.",
    );
    await user.type(input, `${"y".repeat(101)}{Enter}`);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Board name must be 1 to 100 characters.",
    );
    await user.keyboard("{Escape}");
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(fake.mutations()).toEqual([]);
  });

  it("S1_AC5: pressing Escape on delete confirmation cancels and keeps the board", async () => {
    const fake = new FakeApi();
    fake.addBoard("Home");
    const { user } = renderApp("/", fake);
    await user.click(
      await screen.findByRole("button", { name: "Delete board Home" }),
    );
    await screen.findByText(/This deletes 3 columns, 0 cards\./);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(fake.mutations()).toEqual([]);
  });

  it("S1_AC5: deleting a board confirms with its column and card counts", async () => {
    const fake = new FakeApi();
    const board = fake.addBoard("Home");
    const todo = fake.column(board.id, "To Do");
    for (const title of ["a", "b", "c"]) fake.addCard(todo.id, title);
    const doing = fake.addColumn(board.id, "Doing");
    fake.addCard(doing.id, "d");
    fake.addCard(doing.id, "e");
    doing.archived_at = "2026-11-06T00:00:00Z";
    const { user } = renderApp("/", fake);

    await user.click(
      await screen.findByRole("button", { name: "Delete board Home" }),
    );
    expect(
      await screen.findByText(/This deletes 4 columns, 5 cards\./),
    ).toBeInTheDocument();
    expect(
      within(dialog()).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus();
    await user.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(fake.mutations()).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Delete board Home" }));
    await user.click(
      await within(dialog()).findByRole("button", { name: "Delete board" }),
    );
    await waitFor(() => expect(fake.boards).toEqual([]));
    expect(
      screen.queryByRole("link", { name: "Home" }),
    ).not.toBeInTheDocument();
    const request = fake.mutations().at(-1);
    expect(request?.method).toBe("DELETE");
    expect(request?.query.get("version")).toBe("1");
  });

  it("S1_AC5, S1_AC7: restores the list and shows an error when the API rejects a change", async () => {
    const fake = new FakeApi();
    fake.addBoard("Home");
    fake.failNext("PATCH", /\/api\/boards\//, 500);
    const { user } = renderApp("/", fake);
    await user.click(
      await screen.findByRole("button", { name: "Rename board Home" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "New name for Home" }),
      "!{Enter}",
    );
    expect(await screen.findByText("Injected failure 500")).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Home" }),
    ).toBeInTheDocument();
  });

  it("S1_AC5, S1_AC7: reloads the list with a notice on a 409", async () => {
    const fake = new FakeApi();
    const board = fake.addBoard("Home");
    const { user } = renderApp("/", fake);
    await screen.findByRole("link", { name: "Home" });
    board.version = 5;
    board.name = "Elsewhere";
    await user.click(screen.getByRole("button", { name: "Delete board Home" }));
    await user.click(
      await within(dialog()).findByRole("button", { name: "Delete board" }),
    );
    expect(
      await screen.findByText("This board changed elsewhere and was reloaded."),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Elsewhere" }),
    ).toBeInTheDocument();
  });
});
