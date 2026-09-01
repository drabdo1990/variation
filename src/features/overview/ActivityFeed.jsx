import Panel from "../../components/ui/Panel.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { relativeTime } from "../../lib/format.js";
import { BOARD_LANES } from "../../data/vocab.js";
import "./ActivityFeed.css";

const laneLabel = (id) =>
  BOARD_LANES.find((lane) => lane.id === id)?.label ?? id;

/** Turn a logged event into a readable line. */
function describe(event) {
  switch (event.kind) {
    case "person.add":
      return { icon: "bi-person-plus", verb: "Added", tail: event.detail };
    case "person.update":
      return { icon: "bi-pencil", verb: "Updated", tail: null };
    case "person.remove":
      return { icon: "bi-person-dash", verb: "Removed", tail: null };
    case "project.add":
      return { icon: "bi-folder-plus", verb: "Created project", tail: event.detail };
    case "project.update":
      return { icon: "bi-pencil", verb: "Updated project", tail: null };
    case "project.remove":
      return { icon: "bi-folder-minus", verb: "Deleted project", tail: null };
    case "task.add":
      return { icon: "bi-plus-square", verb: "Added task", tail: null };
    case "task.update":
      return { icon: "bi-pencil", verb: "Edited task", tail: null };
    case "task.move":
      return {
        icon: "bi-arrow-left-right",
        verb: "Moved",
        tail: `to ${laneLabel(event.detail)}`,
      };
    case "task.ship":
      return { icon: "bi-check2-circle", verb: "Shipped", tail: null };
    case "task.remove":
      return { icon: "bi-x-square", verb: "Deleted task", tail: null };
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
