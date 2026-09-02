import { Link } from "react-router-dom";
import Panel from "../../components/ui/Panel.jsx";
import Pill from "../../components/ui/Pill.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { collectionStatus } from "../../lib/metrics.js";
import { shortDate } from "../../lib/format.js";
import "./SignalList.css";

/**
 * Measures that have stopped being collected. A QI project rarely fails
 * loudly — it stops having data, and nobody notices for three months.
 */
function CollectionDue({ projects, measures, observations }) {
  const rows = measures
    .map((measure) => ({
      measure,
      project: projects.find((p) => p.id === measure.projectId),
      status: collectionStatus(measure, observations),
    }))
    .filter(
      (row) =>
        row.project && ["due", "overdue", "none"].includes(row.status.state),
    )
    .sort((a, b) => (b.status.overdueBy ?? 0) - (a.status.overdueBy ?? 0));

  return (
    <Panel title="Data collection" icon="bi-calendar-check">
      {rows.length === 0 ? (
        <EmptyState
          icon="bi-check2-circle"
          title={measures.length ? "Everything is current" : "No measures yet"}
          hint={
            measures.length
              ? "Every measure has data as recently as its collection schedule expects."
              : "Measures appear here when their data falls behind schedule."
          }
        />
      ) : (
        <ul className="siglist">
          {rows.map(({ measure, project, status }) => (
            <li key={measure.id}>
              <Link
                to={`/projects/${project.id}/measures/${measure.id}`}
                className="sigrow"
              >
                <div className="sigrow-main">
                  <span className="sigrow-name">{measure.name}</span>
                  <span className="sigrow-project">{project.name}</span>
                  <span className="sigrow-why">
                    {status.latest
                      ? `Last collected ${shortDate(status.latest)}`
                      : "Never collected"}
                  </span>
                </div>
                <Pill tone={status.state === "overdue" ? "warning" : "neutral"}>
                  {status.state === "overdue"
                    ? `${status.overdueBy}d overdue`
                    : status.label}
                </Pill>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default CollectionDue;
