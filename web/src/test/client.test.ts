import { describe, expect, it, vi } from "vitest";
import { api, ApiError, request } from "../api/client";
import { FakeApi } from "./fakeApi";

function setup() {
  const fake = new FakeApi();
  vi.stubGlobal("fetch", fake.fetch);
  const board = fake.addBoard("Home");
  const [todo, doing] = fake.activeColumns(board.id);
  const task = fake.typesOf(board.id)[0]!;
  return { fake, board, todo: todo!, doing: doing!, task };
}

describe("API client", () => {
  it("S1_AC3: every mutation of each resource carries X-CSRF: 1, and GETs do not need it", async () => {
    const { fake, board, todo, doing, task } = setup();
    const renamed = await api.renameBoard(board, "House");
    const column = await api.renameColumn(todo, "Backlog");
    const bug = await api.createCardType(board.id, "Bug", "red");
    await api.updateCardType(task, { color: "blue" });
    const card = await api.createCard(column.id, "Card");
    const moved = await api.moveCard(card, doing.id, null);
    const updated = await api.updateCard(moved, { description: "text" });
    await api.deleteCard(updated);
    await api.deleteCardType(bug);
    await api.deleteBoard(renamed);
    await api.logout();

    const mutations = fake.mutations();
    expect(
      mutations.map(
        (r) => `${r.method} ${r.path.replace(/[a-z]+\d+/g, ":id")}`,
      ),
    ).toEqual([
      "PATCH /api/boards/:id",
      "PATCH /api/columns/:id",
      "POST /api/boards/:id/card-types",
      "PATCH /api/card-types/:id",
      "POST /api/columns/:id/cards",
      "POST /api/cards/:id/move",
      "PATCH /api/cards/:id",
      "DELETE /api/cards/:id",
      "DELETE /api/card-types/:id",
      "DELETE /api/boards/:id",
      "POST /api/auth/logout",
    ]);
    for (const mutation of mutations)
      expect(mutation.headers["X-CSRF"]).toBe("1");
    const gets = fake.requests.filter((r) => r.method === "GET");
    for (const get of gets) expect(get.headers["X-CSRF"]).toBeUndefined();
  });

  it("S1_AC3: column actions send the version in the body or the query", async () => {
    const { fake, board, todo, doing } = setup();
    const created = await api.createColumn(board.id, "First", null);
    await api.moveColumn(created, todo.id);
    const archived = await api.archiveColumn(doing);
    await api.restoreColumn(archived);
    await api.deleteColumn({ ...todo });
    const bodies = fake.mutations().map((r) => r.body);
    expect(bodies[0]).toEqual({ name: "First", after_id: null });
    expect(bodies[1]).toEqual({ after_id: todo.id, version: 1 });
    expect(bodies[2]).toEqual({ version: 1 });
    expect(bodies[3]).toEqual({ version: 2 });
    expect(fake.mutations().at(-1)?.query.get("version")).toBe("1");
  });

  it("S1_AC3: raises ApiError with the server's message and status", async () => {
    setup();
    await expect(api.getBoard("missing")).rejects.toEqual(
      new ApiError(404, "Board not found"),
    );
  });

  it("S1_AC3: reports validation errors and non-JSON failures readably", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ detail: [{ msg: "too long" }, {}] }, { status: 422 }),
        )
        .mockResolvedValueOnce(
          new Response("oops", { status: 502, statusText: "Bad Gateway" }),
        ),
    );
    await expect(request("POST", "/api/boards", {})).rejects.toThrow(
      "too long; Invalid input",
    );
    await expect(request("GET", "/api/boards")).rejects.toThrow("Bad Gateway");
  });
});
