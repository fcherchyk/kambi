import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  api,
  ApiError,
  type ArchivedColumn,
  type BoardArchive,
  type BoardDetail,
} from "../api/client";
import { orderedColumns } from "../board/boardState";
import { DeleteColumnDialog } from "../board/DeleteColumnDialog";
import { RELOADED_NOTICE } from "../board/useBoard";
import { useNotify } from "../notices";
import { bySortKey } from "../ordering";
import { swatch } from "../palette";

/** Archived columns with their cards, read-only: restore or delete only. */
export function ArchivePage() {
  const { boardId = "" } = useParams();
  const notify = useNotify();
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [archive, setArchive] = useState<BoardArchive | null>(null);
  const [missing, setMissing] = useState(false);
  const [deleting, setDeleting] = useState<ArchivedColumn | null>(null);

  const load = useCallback(async () => {
    try {
      const [detail, archived] = await Promise.all([
        api.getBoard(boardId),
        api.getArchive(boardId),
      ]);
      setBoard(detail);
      setArchive(archived);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) setMissing(true);
    }
  }, [boardId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(
    change: () => Promise<unknown>,
    optimistic: BoardArchive,
    errorMessage: string,
  ) {
    const before = archive;
    setArchive(optimistic);
    try {
      await change();
      await load();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) return;
      if (caught instanceof ApiError && caught.status === 409) {
        notify(RELOADED_NOTICE);
        await load();
        return;
      }
      setArchive(before);
      notify(errorMessage, "error");
    }
  }

  function without(column: ArchivedColumn): BoardArchive {
    const current = archive as BoardArchive;
    return {
      ...current,
      columns: current.columns.filter((c) => c.id !== column.id),
    };
  }

  function restore(column: ArchivedColumn) {
    void run(
      () => api.restoreColumn(column),
      without(column),
      "Could not restore the column",
    );
  }

  function remove(
    column: ArchivedColumn,
    action?: { targetId: string | null },
  ) {
    setDeleting(null);
    const cards = action
      ? action.targetId
        ? ({ cards: "move", target: action.targetId } as const)
        : ({ cards: "delete" } as const)
      : undefined;
    void run(
      () => api.deleteColumn(column, cards),
      without(column),
      "Could not delete the column",
    );
  }

  if (missing) return <p>Board not found.</p>;
  if (!board || !archive) return <p>Loading…</p>;
  const types = new Map(board.card_types.map((t) => [t.id, t]));
  const columns = [...archive.columns].sort(bySortKey);

  return (
    <section className="archive">
      <header className="board-header">
        <h1>{board.name}: archive</h1>
        <Link to={`/b/${boardId}`}>Back to the board</Link>
      </header>
      {columns.length === 0 && <p>No archived columns.</p>}
      <div className="columns">
        {columns.map((column) => (
          <section
            key={column.id}
            className="column archived"
            aria-label={column.name}
          >
            <header className="column-header">
              <h2>{column.name}</h2>
              <span className="count">{column.cards.length}</span>
            </header>
            <div className="column-tools">
              <button
                type="button"
                aria-label={`Restore column ${column.name}`}
                onClick={() => restore(column)}
              >
                Restore
              </button>
              <button
                type="button"
                className="danger"
                aria-label={`Delete column ${column.name}`}
                onClick={() =>
                  column.cards.length === 0
                    ? remove(column)
                    : setDeleting(column)
                }
              >
                Delete
              </button>
            </div>
            <div className="cards">
              {[...column.cards].sort(bySortKey).map((card) => {
                const cardType = types.get(card.type_id);
                return (
                  <article
                    key={card.id}
                    className="card"
                    aria-label={card.title}
                    data-color={cardType?.color ?? "gray"}
                    style={{
                      borderLeftColor: swatch(cardType?.color ?? "gray")
                        .background,
                    }}
                  >
                    <span className="card-title">{card.title}</span>
                    {card.description && (
                      <p className="card-description">{card.description}</p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {deleting && (
        <DeleteColumnDialog
          column={deleting}
          cardCount={deleting.cards.length}
          targets={orderedColumns(board)}
          onMove={(targetId) => remove(deleting, { targetId })}
          onDeleteCards={() => remove(deleting, { targetId: null })}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
