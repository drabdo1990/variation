import Avatar from "../../components/ui/Avatar.jsx";
import Pill from "../../components/ui/Pill.jsx";
import Meter from "../../components/ui/Meter.jsx";
import { GUILDS, PRESENCE } from "../../data/vocab.js";
import { loadFor, loadBand, openTasksFor } from "../../lib/metrics.js";
import "./PersonCard.css";

function PersonCard({ person, tasks, onEdit }) {
  const presence = PRESENCE[person.presence];
  const load = loadFor(person, tasks);
  const band = loadBand(load);
  const open = openTasksFor(tasks, person.id).length;

  return (
    <article className="person">
      <div className="person-top">
        <Avatar name={person.name} size={46} />
        <div className="person-id">
          <h3>{person.name}</h3>
          <p>{person.title}</p>
        </div>
        <Pill tone={presence.tone} dot>
          {presence.label}
        </Pill>
      </div>

      <div className="person-tags">
        <span className="person-tag">
          <i className="bi bi-diagram-3" aria-hidden="true" />{" "}
          {GUILDS[person.guild]}
        </span>
        {person.timezone && (
          <span className="person-tag">
            <i className="bi bi-globe" aria-hidden="true" /> {person.timezone}
          </span>
        )}
      </div>

      <div className="person-load">
        <div className="person-load-top">
          <span className="person-load-label">Workload</span>
          <Pill tone={band.tone}>{band.label}</Pill>
        </div>
        <Meter value={load} tone={band.tone} label={`${person.name} workload`} />
        <div className="person-load-foot">
          <span>
            {open} open {open === 1 ? "task" : "tasks"}
            {person.weeklyCapacity
              ? ` · ${person.weeklyCapacity}h capacity`
              : " · no capacity set"}
          </span>
          <button
            type="button"
            className="person-edit"
            onClick={onEdit}
            aria-label={`Edit ${person.name}`}
          >
            <i className="bi bi-pencil" aria-hidden="true" /> Edit
          </button>
        </div>
      </div>
    </article>
  );
}

export default PersonCard;
