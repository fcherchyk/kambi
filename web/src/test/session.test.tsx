import { describe, expect, it, vi } from "vitest";
import { FakeApi } from "./fakeApi";
import { renderApp, screen } from "./render";

describe("session", () => {
  it.each(["/", "/b/b1", "/b/b1/c/card9"])(
    "S1_AC2: %s shows the login screen when /api/me answers 401",
    async (path) => {
      const fake = new FakeApi();
      fake.user = null;
      renderApp(path, fake);
      const signIn = await screen.findByRole("link", {
        name: "Sign in with Google",
      });
      expect(signIn).toHaveAttribute("href", "/api/auth/login");
    },
  );

  it("S1_AC3: Log out sends POST /api/auth/logout and shows the login screen", async () => {
    const { fake, user } = renderApp("/");
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(
      await screen.findByRole("link", { name: "Sign in with Google" }),
    ).toBeInTheDocument();
    expect(fake.mutations().map((r) => `${r.method} ${r.path}`)).toEqual([
      "POST /api/auth/logout",
    ]);
  });

  it("S1_AC3: a 401 on a later call shows the login screen", async () => {
    const fake = new FakeApi();
    fake.addBoard("Home");
    const { user } = renderApp("/", fake);
    await screen.findByRole("link", { name: "Home" });
    fake.user = null;
    await user.click(screen.getByRole("link", { name: "Home" }));
    expect(
      await screen.findByRole("link", { name: "Sign in with Google" }),
    ).toBeInTheDocument();
  });

  it("S1_AC3: shows an error notice when the server cannot be reached", async () => {
    const fake = new FakeApi();
    fake.failNext("GET", /\/api\/me/, 500);
    renderApp("/", fake);
    expect(
      await screen.findByText("Could not reach the server."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Sign in with Google" }),
    ).toBeInTheDocument();
  });

  it("S1_AC4: offers the dev login only when VITE_DEV_LOGIN is true", async () => {
    const fake = new FakeApi();
    fake.user = null;
    vi.stubEnv("VITE_DEV_LOGIN", "true");
    const { unmount } = renderApp("/", fake);
    expect(
      await screen.findByRole("link", { name: "Sign in as dev user" }),
    ).toHaveAttribute("href", "/api/auth/dev-login");
    unmount();

    vi.unstubAllEnvs();
    renderApp("/", fake);
    await screen.findByRole("link", { name: "Sign in with Google" });
    expect(
      screen.queryByRole("link", { name: "Sign in as dev user" }),
    ).not.toBeInTheDocument();
  });
});
