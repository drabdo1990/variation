import "./Panel.css";

/**
 * The single card container used across every screen. Optional heading
 * row keeps title/icon/action alignment consistent everywhere.
 */
function Panel({ title, icon, action, children, padded = true, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="panel-head">
          <h2 className="panel-title">
            {icon && <i className={`bi ${icon}`} aria-hidden="true" />}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={padded ? "panel-body" : ""}>{children}</div>
    </section>
  );
}

export default Panel;
