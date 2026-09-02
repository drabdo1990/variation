/**
 * A tiny inline chart for a measure row — enough to see the shape of the
 * data without opening it. Points that broke a rule are marked, so the row
 * carries the same information the full chart would.
 *
 * Hand-drawn SVG rather than a charting library: at this size the library
 * costs more than it gives, and this stays crisp at any scale.
 */
function Sparkline({ chart, width = 96, height = 30 }) {
  if (!chart.hasData || chart.points.length < 2) {
    return <span className="spark-empty" aria-hidden="true" />;
  }

  const values = chart.points.map((p) => p.plotted);
  const min = Math.min(...values, chart.centre);
  const max = Math.max(...values, chart.centre);
  const span = max - min || 1;
  const pad = 3;

  const x = (i) => (i / (chart.points.length - 1)) * (width - pad * 2) + pad;
  const y = (v) => height - pad - ((v - min) / span) * (height - pad * 2);

  const path = chart.points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.plotted).toFixed(1)}`)
    .join(" ");

  const flagged = chart.points.filter((p) => p.violations.length > 0);

  return (
    <svg
      className="spark"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${chart.points.length} data points, ${flagged.length} flagged`}
    >
      <line
        x1={pad}
        x2={width - pad}
        y1={y(chart.centre)}
        y2={y(chart.centre)}
        stroke="var(--c-ink-faint)"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      <path d={path} fill="none" stroke="var(--c-primary)" strokeWidth="1.5" />
      {flagged.map((p) => (
        <circle
          key={p.index}
          cx={x(p.index)}
          cy={y(p.plotted)}
          r="2.5"
          fill="var(--c-danger)"
        />
      ))}
    </svg>
  );
}

export default Sparkline;
