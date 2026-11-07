import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { api, ApiError, type Board } from "../api/client";
import { ConfirmDialog } from "../components/Dialog";
import { InlineInput } from "../components/InlineInput";
import { useNotify } from "../notices";
import { nameError } from "../validation";

interface PendingDelete {
  board: Board;
  columns: number;
  cards: number;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function BoardsPage() {
  const notify = useNotify();
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      setBoards(await api.listBoards());
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.status === 401)) {
        notify("Could not load your boards.", "error");
      }
    }
  }, [notify]);

  useEffect(() => {
    void load();
  }, [load]);

  function failed(caught: unknown, fallback: string) {
    if (caught instanceof ApiError && caught.status === 401) return;
    if (caught instanceof ApiError && caught.status === 409) {
      notify("This board changed elsewhere and was reloaded.");
    } else {
      notify(caught instanceof ApiError ? caught.message : fallback, "error");
    }
    void load();
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    const problem = nameError("board", newName);
    setError(problem);
    if (problem) return;
    const name = newName.trim();
    setNewName("");
    try {
      const board = await api.createBoard(name);
      setBoards((current) => [...(current ?? []), board]);
    } catch (caught) {
      failed(caught, "Could not create the board.");
    }
  }

  function rename(board: Board, value: string): boolean {
    const problem = nameError("board", value);
    setError(problem);
    if (problem) return false;
    const name = value.trim();
    setRenamingId(null);
    if (name === board.name) return false;
    setBoards(
      (current) =>
        current?.map((b) => (b.id === board.id ? { ...b, name } : b)) ?? null,
    );
    api.renameBoard(board, name).then(
      (saved) =>
        setBoards(
          (current) =>
            current?.map((b) => (b.id === saved.id ? saved : b)) ?? null,
        ),
      (caught: unknown) => failed(caught, "Could not rename the board."),
    );
    return false;
  }

  async function askDelete(board: Board) {
    try {
      const [detail, archive] = await Promise.all([
        api.getBoard(board.id),
        api.getArchive(board.id),
      ]);
      const archivedCards = archive.columns.reduce(
        (sum, column) => sum + column.cards.length,
        0,
      );
      setPendingDelete({
        board,
        columns: detail.columns.length + archive.columns.length,
        cards: detail.cards.length + archivedCards,
      });
    } catch (caught) {
      failed(caught, "Could not load the board.");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { board } = pendingDelete;
    setPendingDelete(null);
    setBoards((current) => current?.filter((b) => b.id !== board.id) ?? null);
    try {
      await api.deleteBoard(board);
    } catch (caught) {
      failed(caught, "Could not delete the board.");
    }
  }

  return (
    <section className="boards">
      <h1>Your boards</h1>
      <form className="new-board" onSubmit={(event) => void create(event)}>
        <input
          aria-label="Board name"
          placeholder="New board name"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <button type="submit" className="primary">
          Create board
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {boards === null ? (
        <p>Loading…</p>
      ) : boards.length === 0 ? (
        <p>No boards yet. Create one above.</p>
      ) : (
        <ul className="board-list">
          {boards.map((board) => (
            <li key={board.id}>
              {renamingId === board.id ? (
                <InlineInput
                  label={`New name for ${board.name}`}
                  initialValue={board.name}
                  onSubmit={(value) => rename(board, value)}
                  onCancel={() => setRenamingId(null)}
                />
              ) : (
                <Link to={`/b/${board.id}`}>{board.name}</Link>
              )}
              <button
                type="button"
                aria-label={`Rename board ${board.name}`}
                onClick={() => setRenamingId(board.id)}
              >
                Rename
              </button>
              <button
                type="button"
                className="danger"
                aria-label={`Delete board ${board.name}`}
                onClick={() => void askDelete(board)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {pendingDelete && (
        <ConfirmDialog
          title={`Delete “${pendingDelete.board.name}”?`}
          message={`This deletes ${plural(pendingDelete.columns, "column")}, ${plural(pendingDelete.cards, "card")}. It cannot be undone.`}
          confirmLabel="Delete board"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
