import Avatar from "../../components/ui/Avatar.jsx";
import Pill from "../../components/ui/Pill.jsx";
import { DEPARTMENTS } from "../../data/vocab.js";
import "./PersonCard.css";

function PersonCard({ person, projects, onEdit }) {
  // Which projects this person is on — the only workload signal that
  // matters now that delivery throughput is gone.
  const involved = projects.filter(
    (p) => p.leadId === person.id || p.memberIds.includes(person.id),
  );
  const leading = involved.filter((p) => p.leadId === person.id).length;

  return (
    <article className="person">
      <div className="person-top">
        <Avatar name={person.name} size={46} />
        <div className="person-id">
          <h3>{person.name}</h3>
          {person.role && <p>{person.role}</p>}
        </div>
        <button
          type="button"
          className="person-edit"
          onClick={onEdit}
          aria-label={`Edit ${person.name}`}
        >
          <i className="bi bi-pencil" aria-hidden="true" />
        </button>
      </div>

      <div className="person-tags">
        <span className="person-tag">
          <i className="bi bi-hospital" aria-hidden="true" />{" "}
          {DEPARTMENTS[person.department] ?? "—"}
        </span>
        {leading > 0 && (
          <Pill tone="primary">
            Leads {leading} {leading === 1 ? "project" : "projects"}
          </Pill>
        )}
      </div>

      <p className="person-projects">
        {involved.length === 0
          ? "Not on any project yet"
          : involved.map((p) => p.name).join(" · ")}
      </p>
    </article>
  );
}

export default PersonCard;
