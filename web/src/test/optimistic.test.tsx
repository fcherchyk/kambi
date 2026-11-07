import { describe, expect, it } from "vitest";
import {
  cardElement,
  cardTitles,
  columnNames,
  renderBoard,
  screen,
  waitFor,
} from "./render";

describe("optimistic updates", () => {
  it("S1_AC7: a failed card move shows the new position, then rolls back with an error notice", async () => {
    const { user, fake } = await renderBoard((fake, boardId) => {
      fake.addCard(fake.column(boardId, "To Do").id, "A");
    });
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const realFetch = fake.fetch;
    fake.fetch = async (input, init) => {
      if (String(input).endsWith("/move")) await gate;
      return realFetch(input, init);
    };
    const { vi } = await import("vitest");
    vi.stubGlobal("fetch", fake.fetch);
    fake.failNext("POST", /\/move$/, 500);

    await user.click(cardElement("A"));
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(cardTitles("In Progress")).toEqual(["A"]);
    expect(cardTitles("To Do")).toEqual([]);
    release();
    expect(
      await screen.findByText("Could not move the card"),
    ).toBeInTheDocument();
    expect(cardTitles("To Do")).toEqual(["A"]);
    expect(cardTitles("In Progress")).toEqual([]);
  });

  it("S1_AC7: a 409 on a rename reloads the board and says so", async () => {
    const { user, fake } = await renderBoard((fake, boardId) => {
      fake.addCard(fake.column(boardId, "To Do").id, "Mine");
    });
    const card = fake.card("Mine");
    card.title = "Theirs";
    card.version = 2;
    await user.click(cardElement("Mine"));
    await user.keyboard("{F2}");
    const input = screen.getByRole("textbox", { name: "Card title" });
    await user.clear(input);
    await user.type(input, "Changed{Enter}");
    expect(
      await screen.findByText("This board changed elsewhere and was reloaded."),
    ).toBeInTheDocument();
    await waitFor(() => expect(cardTitles("To Do")).toEqual(["Theirs"]));
    expect(
      fake.requests.filter(
        (r) => r.method === "GET" && r.path.startsWith("/api/boards/"),
      ),
    ).toHaveLength(2);
  });

  it("S1_AC7: rolls back a failed column rename, archive and delete", async () => {
    const { user, fake } = await renderBoard();
    fake.failNext("POST", /archive$/, 500);
    await user.click(
      screen.getByRole("button", { name: "Archive column Done" }),
    );
    expect(
      await screen.findByText("Could not archive the column"),
    ).toBeInTheDocument();
    expect(columnNames()).toEqual(["To Do", "In Progress", "Done"]);

    fake.failNext("DELETE", /columns/, 500);
    await user.click(
      screen.getByRole("button", { name: "Delete column Done" }),
    );
    expect(
      await screen.findByText("Could not delete the column"),
    ).toBeInTheDocument();
    expect(columnNames()).toEqual(["To Do", "In Progress", "Done"]);

    fake.failNext("POST", /\/cards$/, 422);
    const add = screen.getAllByRole("button", {
      name: "+ Add card",
    })[0] as HTMLElement;
    await user.click(add);
    await user.type(
      screen.getByRole("textbox", { name: "New card in To Do" }),
      "x{Enter}",
    );
    expect(
      await screen.findByText(
        "Could not create the card: Injected failure 422",
      ),
    ).toBeInTheDocument();
    expect(cardTitles("To Do")).toEqual([]);
  });

  it("S1_AC3, S1_AC7: a 401 during a mutation shows the login screen", async () => {
    const { user, fake } = await renderBoard();
    fake.user = null;
    await user.click(
      screen.getByRole("button", { name: "Move column Done left" }),
    );
    expect(
      await screen.findByRole("link", { name: "Sign in with Google" }),
    ).toBeInTheDocument();
  });
});
