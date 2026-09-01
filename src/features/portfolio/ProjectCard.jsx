import Pill from "../../components/ui/Pill.jsx";
import Meter from "../../components/ui/Meter.jsx";
import AvatarStack from "../../components/ui/AvatarStack.jsx";
import { PROJECT_PHASES, HEALTH } from "../../data/vocab.js";
import {
  progressOf,
  healthOf,
  taskCountsOf,
  findPerson,
  findPeople,
} from "../../lib/metrics.js";
import { duePhrase, longDate, shortDate } from "../../lib/format.js";
import "./ProjectCard.css";

function ProjectCard({ project, people, tasks, onEdit }) {
  const phase = PROJECT_PHASES[project.phase];
  const healthKey = healthOf(project, tasks);
  const health = HEALTH[healthKey];
  const pct = progressOf(project, tasks);
  const counts = taskCountsOf(project, tasks);

  // A delivered project has no countdown left to run, so show the plain
  // date rather than an "overdue" phrase it can never clear.
  const settled = healthKey === "done";
  const due = settled
    ? { text: shortDate(project.targetDate), overdue: false }
    : duePhrase(project.targetDate);

  const lead = findPerson(people, project.leadId);
  const members = findPeople(people, project.memberIds);

  return (
    <article className="pcard">
      <header className="pcard-head">
        <div className="pcard-heading">
          <h3>{project.name}</h3>
          {project.summary && <p>{project.summary}</p>}
        </div>
        <Pill tone={phase.tone}>{phase.label}</Pill>
      </header>

      <div className="pcard-progress">
        <div className="pcard-progress-top">
          <span className="pcard-pct">{pct === null ? "—" : `${pct}%`}</span>
          <span className="pcard-tasks">
            {counts.total === 0
              ? "No tasks yet"
              : `${counts.done} of ${counts.total} tasks`}
          </span>
        </div>
        <Meter
          value={pct ?? 0}
          tone={health.tone}
          label={`${project.name} progress`}
        />
      </div>

      <dl className="pcard-meta">
        <div>
          <dt>Lead</dt>
          <dd>{lead ? lead.name : "Unassigned"}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd title={longDate(project.targetDate)}>
            <span className={due.overdue ? "is-overdue" : ""}>{due.text}</span>
          </dd>
        </div>
        <div>
          <dt>Health</dt>
          <dd>
            <Pill tone={health.tone} dot>
              {health.label}
            </Pill>
          </dd>
        </div>
      </dl>

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

        <button
          type="button"
          className="pcard-edit"
          onClick={onEdit}
          aria-label={`Edit ${project.name}`}
        >
          <i className="bi bi-pencil" aria-hidden="true" /> Edit
        </button>
      </footer>
    </article>
  );
}

export default ProjectCard;
