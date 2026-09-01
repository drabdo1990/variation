import "./SegmentedControl.css";

/**
 * Filter selector rendered as a proper radio group so arrow keys work
 * and the current choice is announced.
 */
function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={`seg-item ${active ? "is-active" : ""}`}
            onClick={() => onChange(option.id)}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="seg-count">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
