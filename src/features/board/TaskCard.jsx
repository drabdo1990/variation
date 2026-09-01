import Pill from "../../components/ui/Pill.jsx";
import AvatarStack from "../../components/ui/AvatarStack.jsx";
import { URGENCY, BOARD_LANES } from "../../data/vocab.js";
import { findPeople } from "../../lib/metrics.js";
import { duePhrase, shortDate } from "../../lib/format.js";
import "./TaskCard.css";

function TaskCard({
  task,
  people,
  projects,
  onDragStart,
  onDragEnd,
  onStep,
  onEdit,
  isDragging,
}) {
  const urgency = URGENCY[task.urgency];
  const assignees = findPeople(people, task.assigneeIds);
  const project = projects.find((p) => p.id === task.projectId);

  // A shipped task has nothing left to be late for.
  const due = !task.due
    ? null
    : task.lane === "shipped"
      ? { text: shortDate(task.due), overdue: false }
      : duePhrase(task.due);

  const laneAt = BOARD_LANES.findIndex((lane) => lane.id === task.lane);
  const canBack = laneAt > 0;
  const canForward = laneAt < BOARD_LANES.length - 1;

  return (
    <article
      className={`task ${isDragging ? "is-dragging" : ""}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
    >
      <header className="task-head">
        <h4 className="task-title">{task.title}</h4>
        <Pill tone={urgency.tone}>{urgency.label}</Pill>
      </header>

      {task.detail && <p className="task-detail">{task.detail}</p>}

      {project && <span className="task-project">{project.name}</span>}

      <footer className="task-foot">
        {assignees.length > 0 ? (
          <AvatarStack people={assignees} max={2} size={26} />
        ) : (
          <span className="task-unassigned">Unassigned</span>
        )}

        <div className="task-foot-right">
          {due && (
            <span className={`task-due ${due.overdue ? "is-overdue" : ""}`}>
              <i className="bi bi-calendar3" aria-hidden="true" /> {due.text}
            </span>
          )}
          <button
            type="button"
            className="task-edit"
            onClick={onEdit}
            aria-label={`Edit "${task.title}"`}
          >
            <i className="bi bi-pencil" aria-hidden="true" />
          </button>
        </div>
      </footer>

      {/* Keyboard equivalent of dragging, so the board is operable
          without a pointer. */}
      <div className="task-move">
        <button
          type="button"
          onClick={() => onStep(task.id, -1)}
          disabled={!canBack}
          aria-label={`Move "${task.title}" to previous lane`}
        >
          <i className="bi bi-chevron-left" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onStep(task.id, 1)}
          disabled={!canForward}
          aria-label={`Move "${task.title}" to next lane`}
        >
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export default TaskCard;
