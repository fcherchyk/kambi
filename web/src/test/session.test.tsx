import { describe, expect, it } from "vitest";
import { FakeApi } from "./fakeApi";
import { renderApp, screen } from "./render";

describe("session", () => {
  it.each(["/", "/b/b1", "/b/b1/c/card9"])(
    "AC3: %s shows the login screen when /api/me answers 401",
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

  it("AC3: Log out sends POST /api/auth/logout and shows the login screen", async () => {
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

  it("AC3: a 401 on a later call shows the login screen", async () => {
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

  it("shows an error notice when the server cannot be reached", async () => {
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
});
