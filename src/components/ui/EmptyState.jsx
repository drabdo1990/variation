import "./EmptyState.css";

/**
 * Shown when there is nothing to render — either the user has not created
 * anything yet, or a filter matched nothing. `action` carries the button
 * that gets them unstuck.
 */
function EmptyState({ icon = "bi-inbox", title, hint, action }) {
  return (
    <div className="empty">
      <i className={`bi ${icon}`} aria-hidden="true" />
      <p className="empty-title">{title}</p>
      {hint && <p className="empty-hint">{hint}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export default EmptyState;
