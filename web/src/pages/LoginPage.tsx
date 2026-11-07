import { LOGIN_URL } from "../api/client";

/** Sign-in is a full-page navigation: the server runs the OAuth flow (BFF). */
export function LoginPage() {
  return (
    <main className="login">
      <h1>Kambi</h1>
      <p>A kanban board for one person.</p>
      <a className="button primary" href={LOGIN_URL}>
        Sign in with Google
      </a>
    </main>
  );
}
