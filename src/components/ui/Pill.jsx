import "./Pill.css";

/**
 * Small status label. `tone` maps to a semantic token pair rather than a
 * raw colour, so every status in the app stays on the same palette.
 */
function Pill({ tone = "neutral", children, dot = false }) {
  return (
    <span className={`pill pill-${tone}`}>
      {dot && <span className="pill-dot" />}
      {children}
    </span>
  );
}

export default Pill;
