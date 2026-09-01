import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import BoardLane from "./BoardLane.jsx";
import TaskForm from "./TaskForm.jsx";
import { useBoard } from "./useBoard.js";
import { BOARD_LANES } from "../../data/vocab.js";
import { useAppState } from "../../store/context.js";
import "./BoardPage.css";

function BoardPage() {
  const { people, projects } = useAppState();
  const board = useBoard();
  // null | { lane } for a new task | { task } for an edit
  const [editing, setEditing] = useState(null);

  const open = board.tasks.filter((task) => task.lane !== "shipped").length;

  return (
    <>
      <PageHeader
        title="Board"
        lede={
          board.tasks.length === 0
            ? "Add tasks and drag them across the lanes as they progress."
            : `${open} open ${open === 1 ? "task" : "tasks"}. Drag a card, or use its arrows to move it.`
        }
      >
        <button
          type="button"
          className="btn-cadence"
          onClick={() => setEditing({ lane: "backlog" })}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" /> New task
        </button>
      </PageHeader>

      <div className="board">
        {BOARD_LANES.map((lane) => (
          <BoardLane
            key={lane.id}
            lane={lane}
            tasks={board.tasksIn(lane.id)}
            people={people}
            projects={projects}
            board={board}
            onAdd={() => setEditing({ lane: lane.id })}
            onEdit={(task) => setEditing({ task })}
          />
        ))}
      </div>

      {editing && (
        <TaskForm
          task={editing.task}
          defaultLane={editing.lane}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

export default BoardPage;
