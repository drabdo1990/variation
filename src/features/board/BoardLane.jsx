import { useState } from "react";
import TaskCard from "./TaskCard.jsx";
import "./BoardLane.css";

function BoardLane({ lane, tasks, people, projects, board, onAdd, onEdit }) {
  const [over, setOver] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setOver(false);
    const taskId = event.dataTransfer.getData("text/plain");
    if (taskId) board.moveTo(taskId, lane.id);
    board.setDraggingId(null);
  };

  return (
    <section
      className={`lane ${over ? "is-over" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={(event) => {
        // Ignore bubbling from children leaving.
        if (!event.currentTarget.contains(event.relatedTarget)) setOver(false);
      }}
      onDrop={handleDrop}
      aria-label={`${lane.label}, ${tasks.length} tasks`}
    >
      <header className="lane-head">
        <h3 className="lane-title">{lane.label}</h3>
        <span className="lane-count">{tasks.length}</span>
        <button
          type="button"
          className="lane-add"
          onClick={onAdd}
          aria-label={`Add a task to ${lane.label}`}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" />
        </button>
      </header>

      <div className="lane-body">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            people={people}
            projects={projects}
            isDragging={board.draggingId === task.id}
            onDragStart={board.setDraggingId}
            onDragEnd={() => board.setDraggingId(null)}
            onStep={board.step}
            onEdit={() => onEdit(task)}
          />
        ))}

        {tasks.length === 0 && (
          <button type="button" className="lane-empty" onClick={onAdd}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> Add a task
          </button>
        )}
      </div>
    </section>
  );
}

export default BoardLane;
