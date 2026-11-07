import { describe, expect, it } from "vitest";
import { COLORS } from "../palette";
import {
  cardElement,
  dialog,
  lastMutation,
  renderBoard,
  screen,
  waitFor,
  within,
} from "./render";

async function openTypes(
  user: ReturnType<typeof import("@testing-library/user-event").default.setup>,
) {
  await user.click(screen.getByRole("button", { name: "Card types" }));
  return within(dialog());
}

describe("card types", () => {
  it("AC9: adding Bug with red lists it, and the color picker offers the 10 palette keys", async () => {
    const { user, fake, board } = await renderBoard();
    const panel = await openTypes(user);
    const picker = panel.getByRole("combobox", { name: "New type color" });
    const options = within(picker)
      .getAllByRole("option")
      .map((o) => o.getAttribute("value"));
    expect(options).toEqual([
      "yellow",
      "orange",
      "red",
      "pink",
      "purple",
      "blue",
      "teal",
      "green",
      "gray",
      "brown",
    ]);
    expect(COLORS).toHaveLength(10);
    await user.type(
      panel.getByRole("textbox", { name: "New type name" }),
      "Bug",
    );
    await user.selectOptions(picker, "red");
    await user.click(panel.getByRole("button", { name: "Add type" }));
    expect(panel.getByText("Bug")).toBeInTheDocument();
    await waitFor(() =>
      expect(fake.typesOf(board.id).map((t) => t.name)).toEqual([
        "Task",
        "Bug",
      ]),
    );
    expect(lastMutation(fake)?.body).toEqual({ name: "Bug", color: "red" });
    expect(panel.getByRole("combobox", { name: "Color of Bug" })).toHaveValue(
      "red",
    );
  });

  it("AC9: recoloring and renaming a type updates every card of that type", async () => {
    const { user, fake } = await renderBoard((fake, boardId) => {
      const bug = fake.addType(boardId, "Bug", "red");
      const todo = fake.column(boardId, "To Do");
      fake.addCard(todo.id, "one", bug.id);
      fake.addCard(todo.id, "two", bug.id);
    });
    const panel = await openTypes(user);
    await user.selectOptions(
      panel.getByRole("combobox", { name: "Color of Bug" }),
      "purple",
    );
    expect(cardElement("one")).toHaveAttribute("data-color", "purple");
    expect(cardElement("two")).toHaveAttribute("data-color", "purple");
    await waitFor(() =>
      expect(fake.types.find((t) => t.name === "Bug")?.color).toBe("purple"),
    );

    await user.click(panel.getByRole("button", { name: "Rename type Bug" }));
    const input = panel.getByRole("textbox", { name: "New name for type Bug" });
    await user.clear(input);
    await user.type(input, "Defect{Enter}");
    expect(within(cardElement("one")).getByText("Defect")).toBeInTheDocument();
    await waitFor(() =>
      expect(lastMutation(fake)?.body).toEqual({ name: "Defect", version: 2 }),
    );
  });

  it.each([
    ["a duplicate name", "task", "A type with that name already exists."],
    ["an empty name", "   ", "Type name must be 1 to 50 characters."],
  ])(
    "AC9: %s shows a client-side error and sends nothing",
    async (_, name, message) => {
      const { user, fake } = await renderBoard();
      const panel = await openTypes(user);
      await user.type(
        panel.getByRole("textbox", { name: "New type name" }),
        name,
      );
      await user.click(panel.getByRole("button", { name: "Add type" }));
      expect(panel.getByRole("alert")).toHaveTextContent(message);
      expect(fake.mutations()).toEqual([]);
    },
  );

  it("AC9: the API's 422 is shown as an error notice", async () => {
    const { user, fake } = await renderBoard();
    fake.failNext("POST", /card-types/, 422);
    const panel = await openTypes(user);
    await user.type(
      panel.getByRole("textbox", { name: "New type name" }),
      "Idea",
    );
    await user.click(panel.getByRole("button", { name: "Add type" }));
    expect(
      await screen.findByText("Could not add the type: Injected failure 422"),
    ).toBeInTheDocument();
    expect(panel.queryByText("Idea")).not.toBeInTheDocument();
  });

  it("AC10: deleting a type in use asks for a replacement among the other types", async () => {
    const { user, fake, board } = await renderBoard((fake, boardId) => {
      const bug = fake.addType(boardId, "Bug", "red");
      fake.addType(boardId, "Chore", "gray");
      const todo = fake.column(boardId, "To Do");
      for (const title of ["one", "two", "three"])
        fake.addCard(todo.id, title, bug.id);
    });
    const task = fake.typesOf(board.id)[0]!;
    const panel = await openTypes(user);
    await user.click(panel.getByRole("button", { name: "Delete type Bug" }));
    const replace = within(dialog());
    expect(
      replace.getByText(
        "3 cards use this type. Pick the type they get instead.",
      ),
    ).toBeInTheDocument();
    const options = within(
      replace.getByRole("combobox", { name: "Replacement type" }),
    ).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Task", "Chore"]);
    await user.selectOptions(
      replace.getByRole("combobox", { name: "Replacement type" }),
      "Task",
    );
    await user.click(
      replace.getByRole("button", { name: "Replace and delete" }),
    );
    for (const title of ["one", "two", "three"])
      expect(cardElement(title)).toHaveAttribute("data-color", "yellow");
    await waitFor(() =>
      expect(fake.types.some((t) => t.name === "Bug")).toBe(false),
    );
    expect(lastMutation(fake)?.query.get("replace_with")).toBe(task.id);
    await waitFor(() => expect(fake.requests.at(-1)?.method).toBe("GET"));
  });

  it("AC10: an unused type is deleted without a dialog, and the last type cannot be deleted", async () => {
    const { user, fake } = await renderBoard((fake, boardId) => {
      fake.addType(boardId, "Bug", "red");
    });
    const panel = await openTypes(user);
    await user.click(panel.getByRole("button", { name: "Delete type Bug" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(panel.queryByText("Bug")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(fake.types.map((t) => t.name)).toEqual(["Task"]),
    );
    expect(lastMutation(fake)?.query.get("replace_with")).toBeNull();
    expect(
      panel.getByRole("button", { name: "Delete type Task" }),
    ).toBeDisabled();
  });

  it("AC10: a type used only by archived cards opens the replacement dialog after the API's 422", async () => {
    const { user, fake } = await renderBoard((fake, boardId) => {
      const bug = fake.addType(boardId, "Bug", "red");
      const old = fake.addColumn(boardId, "Old");
      fake.addCard(old.id, "archived card", bug.id);
      old.archived_at = "2026-11-01T00:00:00Z";
    });
    const panel = await openTypes(user);
    await user.click(panel.getByRole("button", { name: "Delete type Bug" }));
    const replace = within(
      await screen.findByRole("dialog", { name: "Delete type “Bug”" }),
    );
    expect(
      replace.getByText("Cards use this type. Pick the type they get instead."),
    ).toBeInTheDocument();
    expect(panel.getByText("Bug")).toBeInTheDocument();
    await user.click(replace.getByRole("button", { name: "Cancel" }));
    expect(fake.types.map((t) => t.name)).toEqual(["Task", "Bug"]);
  });
});
