import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

export type NoticeKind = "info" | "error";
interface Notice {
  id: number;
  kind: NoticeKind;
  message: string;
}

type Notify = (message: string, kind?: NoticeKind) => void;

const NoticesContext = createContext<Notify>(() => {});
const NOTICE_LIFETIME_MS = 6000;

export function useNotify(): Notify {
  return useContext(NoticesContext);
}

/** Short-lived messages (errors, reloads) shown in a live region. */
export function NoticesProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const notify = useCallback<Notify>(
    (message, kind = "info") => {
      const id = nextId.current++;
      setNotices((current) => [...current, { id, kind, message }]);
      setTimeout(() => dismiss(id), NOTICE_LIFETIME_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => notify, [notify]);
  return (
    <NoticesContext.Provider value={value}>
      {children}
      <div className="notices" role="status" aria-live="polite">
        {notices.map((notice) => (
          <div key={notice.id} className={`notice notice-${notice.kind}`}>
            <span>{notice.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(notice.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NoticesContext.Provider>
  );
}
