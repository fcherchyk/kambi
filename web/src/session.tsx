import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { api, ApiError, setUnauthorizedHandler, type User } from "./api/client";
import { useNotify } from "./notices";

type Session =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "signed-in"; user: User };

interface SessionValue {
  session: Session;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}

/** Loads `/api/me` on start; any later `401` drops back to the login screen. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: "loading" });
  const notify = useNotify();

  useEffect(() => {
    setUnauthorizedHandler(() => setSession({ status: "anonymous" }));
    let active = true;
    api.me().then(
      (user) => active && setSession({ status: "signed-in", user }),
      (error: unknown) => {
        if (!active) return;
        setSession({ status: "anonymous" });
        if (!(error instanceof ApiError && error.status === 401)) {
          notify("Could not reach the server.", "error");
        }
      },
    );
    return () => {
      active = false;
    };
  }, [notify]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setSession({ status: "anonymous" });
    }
  }, []);

  const value = useMemo(() => ({ session, logout }), [session, logout]);
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
