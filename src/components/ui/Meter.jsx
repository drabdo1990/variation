import "./Meter.css";

/** Thin progress bar with an accessible value announced to screen readers. */
function Meter({ value, tone = "primary", label }) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className="meter"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span className={`meter-fill meter-${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export default Meter;
