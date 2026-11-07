import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type BoardDetail } from "../api/client";
import { useNotify } from "../notices";

export const RELOADED_NOTICE = "This board changed elsewhere and was reloaded.";

interface Mutation<T> {
  /** The optimistic change, applied before the request. */
  apply: (board: BoardDetail) => BoardDetail;
  call: () => Promise<T>;
  /** Merge the server's answer into the board. */
  commit?: (board: BoardDetail, result: T) => BoardDetail;
  /** Fetch the board again after success (when the server changed rows we cannot see). */
  reloadAfter?: boolean;
  /** Handles a `422` instead of the error notice (the change is still rolled back). */
  onInvalid?: () => void;
  errorMessage: string;
}

export type LoadState = "loading" | "ready" | "not-found" | "failed";

/** The loaded board plus optimistic mutations: apply, call, then commit or roll back. */
export function useBoard(boardId: string) {
  const notify = useNotify();
  const [board, setBoardState] = useState<BoardDetail | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const boardRef = useRef<BoardDetail | null>(null);

  const setBoard = useCallback((next: BoardDetail | null) => {
    boardRef.current = next;
    setBoardState(next);
  }, []);

  const reload = useCallback(async () => {
    try {
      setBoard(await api.getBoard(boardId));
      setLoadState("ready");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404)
        setLoadState("not-found");
      else if (!(caught instanceof ApiError && caught.status === 401))
        setLoadState("failed");
    }
  }, [boardId, setBoard]);

  useEffect(() => {
    setBoard(null);
    setLoadState("loading");
    void reload();
  }, [reload, setBoard]);

  const mutate = useCallback(
    async <T>(mutation: Mutation<T>): Promise<boolean> => {
      const before = boardRef.current;
      if (!before) return false;
      setBoard(mutation.apply(before));
      try {
        const result = await mutation.call();
        const current = boardRef.current;
        if (mutation.commit && current)
          setBoard(mutation.commit(current, result));
        if (mutation.reloadAfter) await reload();
        return true;
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 401) return false;
        if (caught instanceof ApiError && caught.status === 409) {
          notify(RELOADED_NOTICE);
          await reload();
          return false;
        }
        setBoard(before);
        if (
          caught instanceof ApiError &&
          caught.status === 422 &&
          mutation.onInvalid
        ) {
          mutation.onInvalid();
          return false;
        }
        const detail =
          caught instanceof ApiError && caught.status === 422
            ? `: ${caught.message}`
            : "";
        notify(`${mutation.errorMessage}${detail}`, "error");
        return false;
      }
    },
    [notify, reload, setBoard],
  );

  return { board, loadState, reload, mutate };
}
