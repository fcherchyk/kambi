/**
 * In-memory fake of the Kambi API, implementing the routes the SPA uses with the same rules:
 * 401 without a session, 403 without `X-CSRF: 1`, 404 for unknown ids, 409 for a stale
 * version and 422 for invalid input.
 */
import type { Board, Card, CardType, Column, User } from "../api/client";
import { bySortKey, keyAfterSibling, keysAfter } from "../ordering";

export interface RecordedRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  body: unknown;
}

interface Failure {
  method: string;
  path: RegExp;
  status: number;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(detail);
  }
}

const PALETTE = [
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
];
const MUTATING = new Set(["POST", "PATCH", "DELETE"]);

export class FakeApi {
  user: User | null = {
    id: "u1",
    email: "ada@example.com",
    name: "Ada Lovelace",
    avatar_url: null,
  };
  boards: Board[] = [];
  columns: Column[] = [];
  types: CardType[] = [];
  cards: Card[] = [];
  requests: RecordedRequest[] = [];
  private failures: Failure[] = [];
  private nextId = 1;

  /** Make the next request matching `method` and `path` fail with `status`. */
  failNext(method: string, path: RegExp, status: number): void {
    this.failures.push({ method, path, status });
  }

  mutations(): RecordedRequest[] {
    return this.requests.filter((request) => MUTATING.has(request.method));
  }

  // --- seeding helpers ---

  private id(prefix: string): string {
    return `${prefix}${this.nextId++}`;
  }

  private stamp() {
    return new Date(Date.UTC(2026, 10, 6, 12, 0, this.nextId)).toISOString();
  }

  addBoard(
    name: string,
    columnNames = ["To Do", "In Progress", "Done"],
  ): Board {
    const board: Board = {
      id: this.id("b"),
      name,
      version: 1,
      created_at: this.stamp(),
      updated_at: this.stamp(),
    };
    this.boards.push(board);
    for (const columnName of columnNames) this.addColumn(board.id, columnName);
    this.addType(board.id, "Task", "yellow");
    return board;
  }

  addColumn(boardId: string, name: string): Column {
    const last = this.columns
      .filter((c) => c.board_id === boardId)
      .sort(bySortKey)
      .at(-1);
    const column: Column = {
      id: this.id("col"),
      board_id: boardId,
      name,
      sort_key: keysAfter(last?.sort_key ?? null, 1)[0] as string,
      archived_at: null,
      version: 1,
    };
    this.columns.push(column);
    return column;
  }

  addType(boardId: string, name: string, color: string): CardType {
    const last = this.types
      .filter((t) => t.board_id === boardId)
      .sort(bySortKey)
      .at(-1);
    const cardType: CardType = {
      id: this.id("t"),
      board_id: boardId,
      name,
      color,
      sort_key: keysAfter(last?.sort_key ?? null, 1)[0] as string,
      version: 1,
    };
    this.types.push(cardType);
    return cardType;
  }

  addCard(
    columnId: string,
    title: string,
    typeId?: string,
    description = "",
  ): Card {
    const column = this.columns.find((c) => c.id === columnId) as Column;
    const last = this.cardsIn(columnId).at(-1);
    const card: Card = {
      id: this.id("card"),
      board_id: column.board_id,
      column_id: columnId,
      type_id: typeId ?? this.typesOf(column.board_id)[0]!.id,
      title,
      description,
      sort_key: keysAfter(last?.sort_key ?? null, 1)[0] as string,
      version: 1,
      created_at: this.stamp(),
      updated_at: this.stamp(),
    };
    this.cards.push(card);
    return card;
  }

  column(boardId: string, name: string): Column {
    return this.columns.find(
      (c) => c.board_id === boardId && c.name === name,
    ) as Column;
  }

  card(title: string): Card {
    return this.cards.find((c) => c.title === title) as Card;
  }

  cardsIn(columnId: string): Card[] {
    return this.cards.filter((c) => c.column_id === columnId).sort(bySortKey);
  }

  activeColumns(boardId: string): Column[] {
    return this.columns
      .filter((c) => c.board_id === boardId && c.archived_at === null)
      .sort(bySortKey);
  }

  typesOf(boardId: string): CardType[] {
    return this.types.filter((t) => t.board_id === boardId).sort(bySortKey);
  }

  // --- HTTP ---

  fetch = async (
    input: RequestInfo | URL,
    init: RequestInit = {},
  ): Promise<Response> => {
    const url = new URL(String(input), "http://localhost");
    const method = (init.method ?? "GET").toUpperCase();
    const headers = { ...(init.headers as Record<string, string> | undefined) };
    const body = init.body
      ? (JSON.parse(String(init.body)) as unknown)
      : undefined;
    this.requests.push({
      method,
      path: url.pathname,
      query: url.searchParams,
      headers,
      body,
    });
    try {
      const failure = this.failures.findIndex(
        (f) => f.method === method && f.path.test(url.pathname),
      );
      if (failure >= 0) {
        const { status } = this.failures.splice(failure, 1)[0] as Failure;
        throw new HttpError(status, `Injected failure ${status}`);
      }
      if (MUTATING.has(method) && headers["X-CSRF"] !== "1")
        throw new HttpError(403, "Missing X-CSRF");
      const result = this.route(
        method,
        url.pathname,
        url.searchParams,
        (body ?? {}) as Record<string, unknown>,
      );
      if (result === undefined) return new Response(null, { status: 204 });
      return Response.json(result.body, { status: result.status });
    } catch (error) {
      if (error instanceof HttpError)
        return Response.json(
          { detail: error.detail },
          { status: error.status },
        );
      throw error;
    }
  };

  private route(
    method: string,
    path: string,
    query: URLSearchParams,
    body: Record<string, unknown>,
  ): { status: number; body: unknown } | undefined {
    const ok = (data: unknown, status = 200) => ({ status, body: data });
    if (method === "POST" && path === "/api/auth/logout") {
      this.user = null;
      return undefined;
    }
    if (!this.user) throw new HttpError(401, "Not signed in");
    if (method === "GET" && path === "/api/me") return ok(this.user);

    let match: RegExpMatchArray | null;
    if (path === "/api/boards") {
      if (method === "GET") return ok(this.boards);
      const board = this.addBoard(this.name(body.name, 100));
      return ok(board, 201);
    }
    if ((match = path.match(/^\/api\/boards\/([^/]+)$/))) {
      const board = this.findBoard(match[1]);
      if (method === "GET") return ok(this.detail(board));
      if (method === "PATCH") {
        this.checkVersion(board, body.version);
        board.name = this.name(body.name, 100);
        return ok(this.bump(board));
      }
      this.checkVersion(board, Number(query.get("version")));
      this.boards = this.boards.filter((b) => b !== board);
      const columnIds = new Set(
        this.columns.filter((c) => c.board_id === board.id).map((c) => c.id),
      );
      this.columns = this.columns.filter((c) => !columnIds.has(c.id));
      this.cards = this.cards.filter((c) => c.board_id !== board.id);
      this.types = this.types.filter((t) => t.board_id !== board.id);
      return undefined;
    }
    if ((match = path.match(/^\/api\/boards\/([^/]+)\/archive$/))) {
      const board = this.findBoard(match[1]);
      const columns = this.columns
        .filter((c) => c.board_id === board.id && c.archived_at !== null)
        .sort(bySortKey);
      return ok({
        board_id: board.id,
        columns: columns.map((c) => ({ ...c, cards: this.cardsIn(c.id) })),
      });
    }
    if ((match = path.match(/^\/api\/boards\/([^/]+)\/columns$/))) {
      const board = this.findBoard(match[1]);
      const column = this.addColumn(board.id, this.name(body.name, 100));
      if ("after_id" in body)
        column.sort_key = this.columnKey(
          board.id,
          body.after_id as string | null,
          column.id,
        );
      return ok(column, 201);
    }
    if ((match = path.match(/^\/api\/boards\/([^/]+)\/card-types$/))) {
      const board = this.findBoard(match[1]);
      const name = this.name(body.name, 50);
      this.uniqueType(board.id, name, null);
      if (!PALETTE.includes(String(body.color)))
        throw new HttpError(422, "Invalid color");
      return ok(this.addType(board.id, name, String(body.color)), 201);
    }
    if ((match = path.match(/^\/api\/columns\/([^/]+)(\/\w+)?$/))) {
      return this.columnRoute(
        method,
        match[1] as string,
        match[2] ?? "",
        query,
        body,
      );
    }
    if ((match = path.match(/^\/api\/card-types\/([^/]+)$/))) {
      return this.typeRoute(method, match[1] as string, query, body);
    }
    if ((match = path.match(/^\/api\/cards\/([^/]+)(\/move)?$/))) {
      return this.cardRoute(
        method,
        match[1] as string,
        match[2] ?? "",
        query,
        body,
      );
    }
    throw new HttpError(404, `No route ${method} ${path}`);
  }

  private columnRoute(
    method: string,
    id: string,
    action: string,
    query: URLSearchParams,
    body: Record<string, unknown>,
  ) {
    const column = this.columns.find((c) => c.id === id);
    if (!column) throw new HttpError(404, "Column not found");
    if (action === "/cards") {
      this.requireActive(column);
      const title = this.name(body.title, 200);
      const card = this.addCard(
        column.id,
        title,
        (body.type_id as string | undefined) ?? undefined,
      );
      return { status: 201, body: card };
    }
    const version =
      method === "DELETE" ? Number(query.get("version")) : body.version;
    this.checkVersion(column, version);
    if (method === "PATCH") {
      this.requireActive(column);
      column.name = this.name(body.name, 100);
    } else if (action === "/move") {
      this.requireActive(column);
      column.sort_key = this.columnKey(
        column.board_id,
        body.after_id as string | null,
        column.id,
      );
    } else if (action === "/archive") {
      this.requireActive(column);
      this.forbidLastActive(column);
      column.archived_at = this.stamp();
    } else if (action === "/restore") {
      column.archived_at = null;
    } else if (method === "DELETE") {
      this.deleteColumn(column, query);
      return undefined;
    }
    return { status: 200, body: this.bump(column) };
  }

  private deleteColumn(column: Column, query: URLSearchParams): void {
    if (column.archived_at === null) this.forbidLastActive(column);
    const cards = this.cardsIn(column.id);
    if (cards.length > 0) {
      const action = query.get("cards");
      if (action === "move") {
        const target = this.activeColumns(column.board_id).find(
          (c) => c.id === query.get("target"),
        );
        if (!target || target.id === column.id)
          throw new HttpError(422, "Invalid target");
        const keys = keysAfter(
          this.cardsIn(target.id).at(-1)?.sort_key ?? null,
          cards.length,
        );
        cards.forEach((card, index) => {
          card.column_id = target.id;
          card.sort_key = keys[index] as string;
          card.version += 1;
        });
      } else if (action === "delete") {
        this.cards = this.cards.filter((c) => c.column_id !== column.id);
      } else {
        throw new HttpError(422, "The column has cards");
      }
    }
    this.columns = this.columns.filter((c) => c !== column);
  }

  private typeRoute(
    method: string,
    id: string,
    query: URLSearchParams,
    body: Record<string, unknown>,
  ) {
    const cardType = this.types.find((t) => t.id === id);
    if (!cardType) throw new HttpError(404, "Card type not found");
    if (method === "PATCH") {
      this.checkVersion(cardType, body.version);
      if (body.name != null) {
        const name = this.name(body.name, 50);
        this.uniqueType(cardType.board_id, name, cardType.id);
        cardType.name = name;
      }
      if (body.color != null) {
        if (!PALETTE.includes(String(body.color)))
          throw new HttpError(422, "Invalid color");
        cardType.color = String(body.color);
      }
      return { status: 200, body: this.bump(cardType) };
    }
    this.checkVersion(cardType, Number(query.get("version")));
    if (this.typesOf(cardType.board_id).length <= 1)
      throw new HttpError(422, "Last type");
    const used = this.cards.filter((c) => c.type_id === cardType.id);
    if (used.length > 0) {
      const replacement = this.types.find(
        (t) =>
          t.id === query.get("replace_with") &&
          t.board_id === cardType.board_id &&
          t.id !== cardType.id,
      );
      if (!replacement) throw new HttpError(422, "The type is in use");
      for (const card of used) {
        card.type_id = replacement.id;
        card.version += 1;
      }
    }
    this.types = this.types.filter((t) => t !== cardType);
    return undefined;
  }

  private cardRoute(
    method: string,
    id: string,
    action: string,
    query: URLSearchParams,
    body: Record<string, unknown>,
  ) {
    const card = this.cards.find((c) => c.id === id);
    if (!card) throw new HttpError(404, "Card not found");
    const version =
      method === "DELETE" ? Number(query.get("version")) : body.version;
    this.checkVersion(card, version);
    this.requireActive(
      this.columns.find((c) => c.id === card.column_id) as Column,
    );
    if (method === "DELETE") {
      this.cards = this.cards.filter((c) => c !== card);
      return undefined;
    }
    if (action === "/move") {
      const target = this.activeColumns(card.board_id).find(
        (c) => c.id === body.column_id,
      );
      if (!target)
        throw new HttpError(
          422,
          "column_id must be an active column of the same board",
        );
      const others = this.cardsIn(target.id).filter((c) => c.id !== card.id);
      const afterId = body.after_id as string | null;
      if (afterId !== null && !others.some((c) => c.id === afterId))
        throw new HttpError(422, "Invalid after_id");
      card.sort_key = keyAfterSibling(others, afterId);
      card.column_id = target.id;
    } else {
      if (body.title != null) card.title = this.name(body.title, 200);
      if (body.description != null) card.description = String(body.description);
      if (body.type_id != null) {
        if (!this.typesOf(card.board_id).some((t) => t.id === body.type_id))
          throw new HttpError(422, "Bad type");
        card.type_id = String(body.type_id);
      }
    }
    return { status: 200, body: this.bump(card) };
  }

  // --- rules ---

  private detail(board: Board) {
    const columns = this.activeColumns(board.id);
    const ids = new Set(columns.map((c) => c.id));
    return {
      ...board,
      columns,
      card_types: this.typesOf(board.id),
      cards: this.cards.filter((c) => ids.has(c.column_id)).sort(bySortKey),
    };
  }

  private findBoard(id: string | undefined): Board {
    const board = this.boards.find((b) => b.id === id);
    if (!board) throw new HttpError(404, "Board not found");
    return board;
  }

  private name(value: unknown, max: number): string {
    const text = String(value ?? "").trim();
    if (text.length === 0 || text.length > max)
      throw new HttpError(422, `Must be 1 to ${max} characters`);
    return text;
  }

  private uniqueType(
    boardId: string,
    name: string,
    exceptId: string | null,
  ): void {
    const taken = this.typesOf(boardId).some(
      (t) => t.id !== exceptId && t.name.toLowerCase() === name.toLowerCase(),
    );
    if (taken)
      throw new HttpError(
        422,
        `A card type named '${name}' already exists in this board`,
      );
  }

  private checkVersion(entity: { version: number }, sent: unknown): void {
    if (entity.version !== sent)
      throw new HttpError(409, "Stale version: reload and try again");
  }

  private bump<T extends { version: number }>(entity: T): T {
    entity.version += 1;
    return { ...entity };
  }

  private requireActive(column: Column): void {
    if (column.archived_at !== null)
      throw new HttpError(422, "The column is archived");
  }

  private forbidLastActive(column: Column): void {
    if (
      this.activeColumns(column.board_id).filter((c) => c.id !== column.id)
        .length === 0
    ) {
      throw new HttpError(422, "A board needs at least one active column");
    }
  }

  private columnKey(
    boardId: string,
    afterId: string | null,
    movingId: string,
  ): string {
    const others = this.columns
      .filter((c) => c.board_id === boardId && c.id !== movingId)
      .sort(bySortKey);
    if (
      afterId !== null &&
      !others.some((c) => c.id === afterId && c.archived_at === null)
    ) {
      throw new HttpError(
        422,
        "after_id must be an active column of the same board",
      );
    }
    return keyAfterSibling(others, afterId);
  }
}
