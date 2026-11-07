import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode, RefObject } from "react";

interface DialogProps {
  title: string;
  onClose: () => void;
  /** Element focused when the dialog opens; defaults to the first focusable one. */
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

const FOCUSABLE =
  "button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])";

/** A modal dialog: Escape and the × button close it, and focus moves inside on open. */
export function Dialog({
  title,
  onClose,
  initialFocus,
  children,
}: DialogProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const body = ref.current?.querySelector(".dialog-body");
    const target =
      initialFocus?.current ??
      body?.querySelector<HTMLElement>(FOCUSABLE) ??
      ref.current;
    target?.focus();
    return () => previous?.focus?.();
    // Focus only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  }

  return (
    <div className="overlay">
      <div
        ref={ref}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className="dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="icon"
            aria-label="Close"
            title="Close (Escape)"
            data-shortcut="close"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation with focus starting on Cancel, so Enter never destroys by accident. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog title={title} onClose={onCancel} initialFocus={cancelRef}>
      <p>{message}</p>
      <div className="actions">
        <button type="button" className="danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" ref={cancelRef} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
