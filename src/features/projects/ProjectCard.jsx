import { Link } from "react-router-dom";
import Pill from "../../components/ui/Pill.jsx";
import AvatarStack from "../../components/ui/AvatarStack.jsx";
import SignalBadge from "../measures/SignalBadge.jsx";
import { PROJECT_PHASES, DEPARTMENTS } from "../../data/vocab.js";
import {
  measuresOf,
  projectSignal,
  collectionStatus,
  findPeople,
} from "../../lib/metrics.js";
import { duePhrase, shortDate } from "../../lib/format.js";
import "./ProjectCard.css";

function ProjectCard({ project, people, measures, observations }) {
  const phase = PROJECT_PHASES[project.phase];
  const mine = measuresOf(measures, project.id);
  const signal = projectSignal(project, measures, observations);
  const members = findPeople(people, project.memberIds);

  const lapsed = mine.filter(
    (m) => collectionStatus(m, observations).state === "overdue",
  ).length;

  const settled = ["closed", "sustaining"].includes(project.phase);
  const due = settled
    ? { text: shortDate(project.targetDate), overdue: false }
    : duePhrase(project.targetDate);

  const counts = {
    outcome: mine.filter((m) => m.role === "outcome").length,
    process: mine.filter((m) => m.role === "process").length,
    balancing: mine.filter((m) => m.role === "balancing").length,
  };

  return (
    <article className="pcard">
      <Link to={`/projects/${project.id}`} className="pcard-link">
        <header className="pcard-head">
          <div className="pcard-heading">
            <h3>{project.name}</h3>
            {project.aim && <p>{project.aim}</p>}
          </div>
          <Pill tone={phase.tone}>{phase.label}</Pill>
        </header>

        <div className="pcard-signal">
          <SignalBadge status={signal.status} />
          {lapsed > 0 && (
            <Pill tone="warning">
              <i className="bi bi-calendar-x" aria-hidden="true" /> {lapsed} overdue
            </Pill>
          )}
        </div>

        <dl className="pcard-meta">
          <div>
            <dt>Measures</dt>
            <dd>
              {mine.length === 0 ? (
                <span className="pcard-none">None yet</span>
              ) : (
                `${counts.outcome} outcome · ${counts.process} process · ${counts.balancing} balancing`
              )}
            </dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>{DEPARTMENTS[project.department]}</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd className={due.overdue ? "is-overdue" : ""}>{due.text}</dd>
          </div>
        </dl>
      </Link>

      <footer className="pcard-foot">
        {members.length > 0 ? (
          <>
            <AvatarStack people={members} max={3} size={28} />
            <span className="pcard-count">
              {members.length} {members.length === 1 ? "person" : "people"}
            </span>
          </>
        ) : (
          <span className="pcard-count">No team assigned</span>
        )}
        <Link to={`/projects/${project.id}`} className="pcard-edit">
          Open <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
}

export default ProjectCard;
