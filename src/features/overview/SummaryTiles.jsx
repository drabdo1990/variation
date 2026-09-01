import "./SummaryTiles.css";

function SummaryTiles({ items }) {
  return (
    <ul className="tiles">
      {items.map((item) => (
        <li key={item.id} className="tile">
          <span className={`tile-icon tile-icon-${item.tone ?? "primary"}`}>
            <i className={`bi ${item.icon}`} aria-hidden="true" />
          </span>
          <span className="tile-value">{item.value}</span>
          <span className="tile-label">{item.label}</span>
          <span className="tile-hint">{item.hint}</span>
        </li>
      ))}
    </ul>
  );
}

export default SummaryTiles;
