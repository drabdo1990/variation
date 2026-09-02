import Pill from "../../components/ui/Pill.jsx";
import { SIGNAL_STATUS } from "../../data/vocab.js";

/**
 * A measure's verdict. The icon carries the meaning alongside the colour,
 * so the status is still readable without colour vision.
 */
function SignalBadge({ status }) {
  const meta = SIGNAL_STATUS[status] ?? SIGNAL_STATUS.stable;
  return (
    <Pill tone={meta.tone}>
      <i className={`bi ${meta.icon}`} aria-hidden="true" /> {meta.label}
    </Pill>
  );
}

export default SignalBadge;
