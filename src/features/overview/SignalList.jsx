import { Link } from "react-router-dom";
import Panel from "../../components/ui/Panel.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import SignalBadge from "../measures/SignalBadge.jsx";
import Sparkline from "../measures/Sparkline.jsx";
import { signallingMeasures } from "../../lib/metrics.js";
import "./SignalList.css";

/**
 * Every measure across the portfolio that is currently showing special-cause
 * variation. This is the screen a QI lead actually wants: not "how are the
 * projects doing" but "where has something genuinely changed".
 */
function SignalList({ projects, measures, observations }) {
  const rows = signallingMeasures({ projects, measures, observations });

  // Deterioration first — it is the thing that needs a decision today.
  const ordered = [...rows].sort((a, b) => {
    const rank = (s) => (s === "deteriorating" ? 0 : s === "signal" ? 1 : 2);
    return rank(a.verdict.status) - rank(b.verdict.status);
  });

  return (
    <Panel
      title="Signals"
      icon="bi-broadcast-pin"
      action={
        <Link to="/projects" className="panel-link">
          All projects <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      }
    >
      {ordered.length === 0 ? (
        <EmptyState
          icon="bi-check2-circle"
          title={measures.length ? "No signals right now" : "No measures yet"}
          hint={
            measures.length
              ? "Every measure is showing ordinary variation. Nothing here says a process has changed."
              : "Add measures to a project and anything that genuinely shifts will surface here."
          }
        />
      ) : (
        <ul className="siglist">
          {ordered.map(({ measure, project, chart, verdict }) => (
            <li key={measure.id}>
              <Link
                to={`/projects/${project.id}/measures/${measure.id}`}
                className="sigrow"
              >
                <div className="sigrow-main">
                  <span className="sigrow-name">{measure.name}</span>
                  <span className="sigrow-project">{project.name}</span>
                  <span className="sigrow-why">
                    {chart.signals.map((s) => s.label).slice(0, 2).join(" · ")}
                  </span>
                </div>
                <Sparkline chart={chart} />
                <SignalBadge status={verdict.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default SignalList;
