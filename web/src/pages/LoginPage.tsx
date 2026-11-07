import { LOGIN_URL } from "../api/client";

/** Only mounted by the API when `DEV_LOGIN=true` (offline sandbox, `run-sandbox.sh`). */
export const DEV_LOGIN_URL = "/api/auth/dev-login";

/** Whether to offer the development login, set by `run-sandbox.sh` through `VITE_DEV_LOGIN`. */
export function devLoginEnabled(): boolean {
  return import.meta.env.VITE_DEV_LOGIN === "true";
}

/** Sign-in is a full-page navigation: the server runs the OAuth flow (BFF). */
export function LoginPage() {
  return (
    <main className="login">
      <h1>Kambi</h1>
      <p>A kanban board for one person.</p>
      <a className="button primary" href={LOGIN_URL}>
        Sign in with Google
      </a>
      {devLoginEnabled() && (
        <a className="button" href={DEV_LOGIN_URL}>
          Sign in as dev user
        </a>
      )}
    </main>
  );
}
