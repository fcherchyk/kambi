import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { vi } from "vitest";
import { App } from "../App";
import { FakeApi } from "./fakeApi";

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

/** Render the whole app at `path` against `fake`, which replaces `fetch`. */
export function renderApp(path = "/", fake = new FakeApi()) {
  vi.stubGlobal("fetch", fake.fetch);
  const user = userEvent.setup();
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  );
  return { fake, user, ...view };
}

export function currentPath(): string {
  return screen.getByTestId("location").textContent ?? "";
}

/** A board "Home" with "To Do", "In Progress" and "Done", opened in the board view. */
export async function renderBoard(
  seed?: (fake: FakeApi, boardId: string) => void,
  suffix = "",
) {
  const fake = new FakeApi();
  const board = fake.addBoard("Home");
  seed?.(fake, board.id);
  const result = renderApp(`/b/${board.id}${suffix}`, fake);
  await screen.findByRole("heading", { level: 1, name: "Home" });
  return { ...result, board };
}

export function column(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}

/** Titles of the cards shown in a column, in order. */
export function cardTitles(name: string): string[] {
  return Array.from(column(name).querySelectorAll(".card .card-title")).map(
    (el) => el.textContent ?? "",
  );
}

/** Column names shown on the board, in order. */
export function columnNames(): string[] {
  return Array.from(document.querySelectorAll(".board .column h2")).map(
    (el) => el.textContent ?? "",
  );
}

export function cardElement(title: string): HTMLElement {
  return screen.getByRole("button", { name: title });
}

export function lastMutation(fake: FakeApi) {
  return fake.mutations().at(-1);
}

export function dialog(): HTMLElement {
  const dialogs = screen.getAllByRole("dialog");
  return dialogs.at(-1) as HTMLElement;
}

export { screen, waitFor, within };
