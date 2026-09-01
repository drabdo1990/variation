import "./PageHeader.css";

/** Consistent page title block: heading, supporting line, optional actions. */
function PageHeader({ title, lede, children }) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        <h1>{title}</h1>
        {lede && <p>{lede}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </header>
  );
}

export default PageHeader;
