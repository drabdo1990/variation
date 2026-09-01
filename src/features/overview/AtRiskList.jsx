import { Link } from "react-router-dom";
import Panel from "../../components/ui/Panel.jsx";
import Pill from "../../components/ui/Pill.jsx";
import Meter from "../../components/ui/Meter.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { progressOf, healthOf } from "../../lib/metrics.js";
import { HEALTH } from "../../data/vocab.js";
import { duePhrase } from "../../lib/format.js";
import "./AtRiskList.css";

/** Projects whose schedule drift or pause state needs a decision. */
function AtRiskList({ projects, tasks }) {
  const flagged = projects
    .map((project) => ({ project, health: healthOf(project, tasks) }))
    .filter(({ health }) =>
      ["behind", "overdue", "watch", "paused"].includes(health),
    );

  return (
    <Panel
      title="Needs a decision"
      icon="bi-exclamation-diamond"
      action={
        <Link to="/portfolio" className="panel-link">
          All projects <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      }
    >
      {flagged.length === 0 ? (
        <EmptyState
          icon="bi-check2-circle"
          title={projects.length ? "Everything is on pace" : "No projects yet"}
          hint={
            projects.length
              ? "No project is drifting against its target date."
              : "Projects that fall behind their target date will surface here."
          }
        />
      ) : (
        <ul className="risk">
          {flagged.map(({ project, health }) => {
            const meta = HEALTH[health];
            const due = duePhrase(project.targetDate);
            const pct = progressOf(project, tasks);
            return (
              <li key={project.id} className="risk-row">
                <div className="risk-head">
                  <span className="risk-name">{project.name}</span>
                  <Pill tone={meta.tone} dot>
                    {meta.label}
                  </Pill>
                </div>
                <Meter
                  value={pct ?? 0}
                  tone={meta.tone}
                  label={`${project.name} progress`}
                />
                <div className="risk-foot">
                  <span>{pct === null ? "No tasks yet" : `${pct}% complete`}</span>
                  <span className={due.overdue ? "is-overdue" : ""}>
                    {due.text}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export default AtRiskList;
