import Panel from "../../components/ui/Panel.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { relativeTime } from "../../lib/format.js";
import { MEASURE_ROLES } from "../../data/vocab.js";
import "./ActivityFeed.css";

/** Turn a logged event into a readable line. */
function describe(event) {
  switch (event.kind) {
    case "person.add":
      return { icon: "bi-person-plus", verb: "Added", tail: null };
    case "person.update":
      return { icon: "bi-pencil", verb: "Updated", tail: null };
    case "person.remove":
      return { icon: "bi-person-dash", verb: "Removed", tail: null };
    case "project.add":
      return { icon: "bi-clipboard2-plus", verb: "Started project", tail: null };
    case "project.update":
      return { icon: "bi-pencil", verb: "Updated project", tail: null };
    case "project.remove":
      return { icon: "bi-clipboard2-x", verb: "Deleted project", tail: null };
    case "project.import":
      return { icon: "bi-box-arrow-in-down", verb: "Imported project", tail: null };
    case "measure.add":
      return {
        icon: "bi-rulers",
        verb: "Added measure",
        tail: MEASURE_ROLES[event.detail]?.label.toLowerCase(),
      };
    case "measure.update":
      return { icon: "bi-pencil", verb: "Updated measure", tail: null };
    case "measure.remove":
      return { icon: "bi-dash-square", verb: "Deleted measure", tail: null };
    case "observation.import":
      return { icon: "bi-clipboard-data", verb: "Imported", tail: null };
    case "cycle.add":
      return { icon: "bi-arrow-repeat", verb: "Started", tail: event.detail };
    case "cycle.update":
      return { icon: "bi-pencil", verb: "Updated", tail: null };
    case "cycle.remove":
      return { icon: "bi-x-square", verb: "Deleted cycle", tail: null };
    default:
      return { icon: "bi-dot", verb: "Changed", tail: null };
  }
}

function ActivityFeed({ events }) {
  return (
    <Panel title="Recent activity" icon="bi-activity">
      {events.length === 0 ? (
        <EmptyState
          icon="bi-activity"
          title="Nothing has happened yet"
          hint="Adding people, projects, and tasks will show up here."
        />
      ) : (
        <ul className="feed">
          {events.slice(0, 8).map((event) => {
            const { icon, verb, tail } = describe(event);
            return (
              <li key={event.id} className="feed-row">
                <span className="feed-icon">
                  <i className={`bi ${icon}`} aria-hidden="true" />
                </span>
                <div className="feed-body">
                  <p className="feed-text">
                    {verb} <span className="feed-target">{event.subject}</span>{" "}
                    {tail && <span className="feed-context">{tail}</span>}
                  </p>
                  <time className="feed-time" dateTime={event.at}>
                    {relativeTime(event.at)}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export default ActivityFeed;
