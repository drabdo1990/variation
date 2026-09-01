import "./HeadlineRow.css";

/**
 * Delta colouring is metric-aware: for `lowerIsBetter` measures such as
 * cycle time, a fall is the improvement.
 */
function HeadlineRow({ items }) {
  return (
    <ul className="heads">
      {items.map((item) => {
        // A null delta means there is no prior period to compare against
        // yet — show nothing rather than a misleading 0%.
        const hasDelta = item.delta !== null && item.delta !== undefined;
        const better = item.lowerIsBetter ? item.delta < 0 : item.delta > 0;
        const rising = item.delta > 0;

        return (
          <li key={item.id} className="head">
            <span className="head-top">
              <i className={`bi ${item.icon}`} aria-hidden="true" />
              {item.label}
            </span>
            <span className="head-value">{item.value}</span>
            {hasDelta ? (
              <span className={`head-delta ${better ? "is-good" : "is-bad"}`}>
                <i
                  className={`bi ${rising ? "bi-arrow-up-short" : "bi-arrow-down-short"}`}
                  aria-hidden="true"
                />
                {Math.abs(item.delta)}%
                <span className="head-delta-note">vs prior</span>
              </span>
            ) : (
              <span className="head-delta-note">no prior period</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default HeadlineRow;
