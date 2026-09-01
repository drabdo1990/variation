import { useId } from "react";
import "./Field.css";

/**
 * Labelled form control. The label is always visible (never a
 * placeholder), and errors sit next to the field they belong to and are
 * wired up with aria-describedby.
 */
function Field({ label, error, hint, required, children }) {
  const id = useId();
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`field ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="field-req" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children({
        id,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": describedBy || undefined,
      })}

      {hint && !error && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-err`} role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

export default Field;
