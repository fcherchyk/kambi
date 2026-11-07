import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router";
import { HelpPanel } from "./keyboard/HelpPanel";
import { matchShortcut, shouldIgnoreShortcut } from "./keyboard/shortcuts";
import { NoticesProvider } from "./notices";
import { ArchivePage } from "./pages/ArchivePage";
import { BoardPage } from "./pages/BoardPage";
import { BoardsPage } from "./pages/BoardsPage";
import { LoginPage } from "./pages/LoginPage";
import { SessionProvider, useSession } from "./session";

export function App() {
  return (
    <NoticesProvider>
      <SessionProvider>
        <Shell />
      </SessionProvider>
    </NoticesProvider>
  );
}

function Shell() {
  const { session, logout } = useSession();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreShortcut(event) || matchShortcut(event) !== "help")
        return;
      event.preventDefault();
      setHelpOpen(true);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (session.status === "loading") return <p className="loading">Loading…</p>;
  if (session.status === "anonymous") return <LoginPage />;

  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          Kambi
        </Link>
        <span className="user">{session.user.name || session.user.email}</span>
        <button
          type="button"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          data-shortcut="help"
          onClick={() => setHelpOpen(true)}
        >
          ?
        </button>
        <button type="button" onClick={() => void logout()}>
          Log out
        </button>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<BoardsPage />} />
          {/* The card dialog is a child route, so the board stays mounted behind it. */}
          <Route path="/b/:boardId" element={<BoardPage />}>
            <Route path="c/:cardId" element={null} />
          </Route>
          <Route path="/b/:boardId/archive" element={<ArchivePage />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
      {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
