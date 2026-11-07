import type { components, paths } from "./schema";

type Schemas = components["schemas"];
export type User = Schemas["UserOut"];
export type Board = Schemas["BoardOut"];
export type BoardDetail = Schemas["BoardDetail"];
export type BoardArchive = Schemas["BoardArchive"];
export type ArchivedColumn = Schemas["ArchivedColumnOut"];
export type Column = Schemas["ColumnOut"];
export type CardType = Schemas["CardTypeOut"];
export type Card = Schemas["CardOut"];
export type Color = Schemas["CardTypeCreate"]["color"];
export type CardChanges = Omit<Schemas["CardUpdate"], "version">;
export type CardTypeChanges = Omit<Schemas["CardTypeUpdate"], "version">;
export type CardsAction =
  { cards: "move"; target: string } | { cards: "delete" };

const MUTATING_METHODS = new Set(["POST", "PATCH", "DELETE"]);

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let onUnauthorized: () => void = () => {};

/** Called on every `401`, so the app can show the login screen. */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

type Query = Record<string, string | number | undefined>;

/** Fill a path template of the generated schema, so a typo in a route fails to compile. */
function apiPath<P extends keyof paths>(
  template: P,
  params: Record<string, string> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    encodeURIComponent(params[name] ?? ""),
  );
}

function withQuery(path: string, query: Query = {}): string {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined) search.set(name, String(value));
  }
  const text = search.toString();
  return text ? `${path}?${text}` : path;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((item: { msg?: string }) => item.msg ?? "Invalid input")
        .join("; ");
    }
  } catch {
    // Not JSON: fall back to the status text.
  }
  return response.statusText || `Request failed (${response.status})`;
}

/** Same-origin request with the session cookie, and `X-CSRF: 1` on every mutation. */
export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (MUTATING_METHODS.has(method)) headers["X-CSRF"] = "1";
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(path, {
    method,
    headers,
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401) onUnauthorized();
  if (!response.ok)
    throw new ApiError(response.status, await errorMessage(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const LOGIN_URL = apiPath("/api/auth/login");

export const api = {
  me: () => request<User>("GET", apiPath("/api/me")),
  logout: () => request<void>("POST", apiPath("/api/auth/logout")),

  listBoards: () => request<Board[]>("GET", apiPath("/api/boards")),
  createBoard: (name: string) =>
    request<Board>("POST", apiPath("/api/boards"), { name }),
  getBoard: (boardId: string) =>
    request<BoardDetail>(
      "GET",
      apiPath("/api/boards/{board_id}", { board_id: boardId }),
    ),
  getArchive: (boardId: string) =>
    request<BoardArchive>(
      "GET",
      apiPath("/api/boards/{board_id}/archive", { board_id: boardId }),
    ),
  renameBoard: (board: Board, name: string) =>
    request<Board>(
      "PATCH",
      apiPath("/api/boards/{board_id}", { board_id: board.id }),
      {
        name,
        version: board.version,
      },
    ),
  deleteBoard: (board: Board) =>
    request<void>(
      "DELETE",
      withQuery(apiPath("/api/boards/{board_id}", { board_id: board.id }), {
        version: board.version,
      }),
    ),

  /** `afterId` undefined appends, null puts the column first. */
  createColumn: (boardId: string, name: string, afterId?: string | null) =>
    request<Column>(
      "POST",
      apiPath("/api/boards/{board_id}/columns", { board_id: boardId }),
      afterId === undefined ? { name } : { name, after_id: afterId },
    ),
  renameColumn: (column: Column, name: string) =>
    request<Column>(
      "PATCH",
      apiPath("/api/columns/{column_id}", { column_id: column.id }),
      {
        name,
        version: column.version,
      },
    ),
  moveColumn: (column: Column, afterId: string | null) =>
    request<Column>(
      "POST",
      apiPath("/api/columns/{column_id}/move", { column_id: column.id }),
      { after_id: afterId, version: column.version },
    ),
  archiveColumn: (column: Column) =>
    request<Column>(
      "POST",
      apiPath("/api/columns/{column_id}/archive", { column_id: column.id }),
      { version: column.version },
    ),
  restoreColumn: (column: Column) =>
    request<Column>(
      "POST",
      apiPath("/api/columns/{column_id}/restore", { column_id: column.id }),
      { version: column.version },
    ),
  deleteColumn: (column: Column, action?: CardsAction) =>
    request<void>(
      "DELETE",
      withQuery(apiPath("/api/columns/{column_id}", { column_id: column.id }), {
        version: column.version,
        ...action,
      }),
    ),

  createCardType: (boardId: string, name: string, color: Color) =>
    request<CardType>(
      "POST",
      apiPath("/api/boards/{board_id}/card-types", { board_id: boardId }),
      { name, color },
    ),
  updateCardType: (cardType: CardType, changes: CardTypeChanges) =>
    request<CardType>(
      "PATCH",
      apiPath("/api/card-types/{type_id}", { type_id: cardType.id }),
      {
        ...changes,
        version: cardType.version,
      },
    ),
  deleteCardType: (cardType: CardType, replaceWith?: string) =>
    request<void>(
      "DELETE",
      withQuery(
        apiPath("/api/card-types/{type_id}", { type_id: cardType.id }),
        {
          version: cardType.version,
          replace_with: replaceWith,
        },
      ),
    ),

  createCard: (columnId: string, title: string) =>
    request<Card>(
      "POST",
      apiPath("/api/columns/{column_id}/cards", { column_id: columnId }),
      {
        title,
        description: "",
      },
    ),
  updateCard: (card: Card, changes: CardChanges) =>
    request<Card>(
      "PATCH",
      apiPath("/api/cards/{card_id}", { card_id: card.id }),
      {
        ...changes,
        version: card.version,
      },
    ),
  moveCard: (card: Card, columnId: string, afterId: string | null) =>
    request<Card>(
      "POST",
      apiPath("/api/cards/{card_id}/move", { card_id: card.id }),
      {
        column_id: columnId,
        after_id: afterId,
        version: card.version,
      },
    ),
  deleteCard: (card: Card) =>
    request<void>(
      "DELETE",
      withQuery(apiPath("/api/cards/{card_id}", { card_id: card.id }), {
        version: card.version,
      }),
    ),
};
