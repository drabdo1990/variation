import { useEffect, useRef } from "react";
import "./Modal.css";

/**
 * Accessible dialog: Escape closes it, focus moves inside on open and
 * returns to the trigger on close, and Tab is trapped within the panel.
 */
function Modal({
  title,
  onClose,
  children,
  footer,
  size = "md",
  /** First-run dialogs have nothing to return to, so they hide the
      close affordance rather than offering one that does nothing. */
  dismissible = true,
}) {
  const panelRef = useRef(null);
  const returnTo = useRef(null);

  useEffect(() => {
    returnTo.current = document.activeElement;
    const first = panelRef.current?.querySelector(
      "input, select, textarea, button",
    );
    first?.focus();

    return () => returnTo.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        if (dismissible) onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, dismissible]);

  return (
    <div
      className="modal-scrim"
      onMouseDown={dismissible ? onClose : undefined}
    >
      <div
        className={`modal-panel modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <h2>{title}</h2>
          {dismissible && (
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          )}
        </header>

        <div className="modal-body">{children}</div>

        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export default Modal;
