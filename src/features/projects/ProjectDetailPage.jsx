import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Panel from "../../components/ui/Panel.jsx";
import Pill from "../../components/ui/Pill.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import MeasureForm from "../measures/MeasureForm.jsx";
import SignalBadge from "../measures/SignalBadge.jsx";
import Sparkline from "../measures/Sparkline.jsx";
import CycleForm from "../cycles/CycleForm.jsx";
import ProjectForm from "./ProjectForm.jsx";
import {
  PROJECT_PHASES,
  DEPARTMENTS,
  MEASURE_ROLES,
  CYCLE_ACTS,
} from "../../data/vocab.js";
import {
  measuresOf,
  cyclesOf,
  tasksOf,
  measureStatus,
  collectionStatus,
  findPerson,
  findPeople,
} from "../../lib/metrics.js";
import { exportProject } from "../../store/state.js";
import { shortDate, longDate } from "../../lib/format.js";
import { useAppState, useDispatch } from "../../store/context.js";
import "./ProjectDetail.css";

function MeasureRow({ project, measure, observations }) {
  const { chart, verdict } = measureStatus(measure, observations);
  const collection = collectionStatus(measure, observations);
  const role = MEASURE_ROLES[measure.role];

  return (
    <li className="mrow">
      <Link to={`/projects/${project.id}/measures/${measure.id}`} className="mrow-link">
        <div className="mrow-main">
          <div className="mrow-head">
            <span className="mrow-name">{measure.name}</span>
            <Pill tone={role.tone}>{role.label}</Pill>
          </div>
          <div className="mrow-meta">
            {chart.hasData
              ? `${chart.points.length} point${chart.points.length === 1 ? "" : "s"}`
              : "No data yet"}
            {measure.unit && ` · ${measure.unit}`}
            {collection.state === "overdue" && (
              <span className="mrow-overdue">
                {" "}
                · <i className="bi bi-calendar-x" aria-hidden="true" /> collection overdue
              </span>
            )}
          </div>
        </div>

        <Sparkline chart={chart} />
        <SignalBadge status={verdict.status} />
        <i className="bi bi-chevron-right mrow-chevron" aria-hidden="true" />
      </Link>
    </li>
  );
}

function ProjectDetailPage() {
  const state = useAppState();
  const dispatch = useDispatch();
  const { projectId } = useParams();
  const [editing, setEditing] = useState(false);
  const [addingMeasure, setAddingMeasure] = useState(false);
  const [editingCycle, setEditingCycle] = useState(null);
  const [newTask, setNewTask] = useState("");

  const project = state.projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <EmptyState
        icon="bi-question-circle"
        title="Project not found"
        hint="It may have been deleted."
        action={
          <Link to="/projects" className="btn-primary">
            Back to projects
          </Link>
        }
      />
    );
  }

  const measures = measuresOf(state.measures, project.id);
  const cycles = cyclesOf(state.cycles, project.id);
  const tasks = tasksOf(state.tasks, project.id);
  const phase = PROJECT_PHASES[project.phase];
  const lead = findPerson(state.people, project.leadId);
  const members = findPeople(state.people, project.memberIds);

  const download = () => {
    const bundle = exportProject(state, project.id);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addTask = (event) => {
    event.preventDefault();
    if (!newTask.trim()) return;
    dispatch({
      type: "task/add",
      task: { projectId: project.id, title: newTask.trim(), detail: "", due: null, assigneeIds: [] },
    });
    setNewTask("");
  };

  const byRole = (role) => measures.filter((m) => m.role === role);

  return (
    <>
      <PageHeader
        title={project.name}
        lede={
          <>
            <Link to="/projects" className="crumb">
              Projects
            </Link>{" "}
            · {DEPARTMENTS[project.department]} · {shortDate(project.startDate)} to{" "}
            {shortDate(project.targetDate)}
          </>
        }
      >
        <button type="button" className="btn-quiet" onClick={download}>
          <i className="bi bi-download" aria-hidden="true" /> Export
        </button>
        <button type="button" className="btn-quiet" onClick={() => setEditing(true)}>
          <i className="bi bi-pencil" aria-hidden="true" /> Edit
        </button>
        <Link to={`/projects/${project.id}/data`} className="btn-primary">
          <i className="bi bi-grid-3x3" aria-hidden="true" /> Enter data
        </Link>
      </PageHeader>

      <div className="stack">
        <Panel title="Aim" icon="bi-bullseye" action={<Pill tone={phase.tone} dot>{phase.label}</Pill>}>
          {project.aim ? (
            <p className="aim-text">{project.aim}</p>
          ) : (
            <p className="aim-missing">
              No aim statement yet. A good one says what will improve, for whom,
              by how much, and by when — everything downstream depends on it.
            </p>
          )}
          <div className="aim-team">
            {lead && (
              <span className="aim-lead">
                <Avatar name={lead.name} size={26} title={null} /> {lead.name} (lead)
              </span>
            )}
            {members
              .filter((m) => m.id !== lead?.id)
              .map((m) => (
                <span className="aim-lead" key={m.id}>
                  <Avatar name={m.name} size={26} title={null} /> {m.name}
                </span>
              ))}
            {!lead && members.length === 0 && (
              <span className="aim-missing">No team assigned</span>
            )}
          </div>
        </Panel>

        <Panel
          title="Measures"
          icon="bi-rulers"
          action={
            <div className="panel-actions">
              {measures.length > 0 && (
                <Link to={`/projects/${project.id}/data`} className="panel-link">
                  Enter data <i className="bi bi-grid-3x3" aria-hidden="true" />
                </Link>
              )}
              <button type="button" className="panel-link" onClick={() => setAddingMeasure(true)}>
                Add measure <i className="bi bi-plus-lg" aria-hidden="true" />
              </button>
            </div>
          }
        >
          {measures.length === 0 ? (
            <EmptyState
              icon="bi-rulers"
              title="No measures yet"
              hint="A trustworthy QI project needs three kinds: an outcome measure for the result, a process measure for the change itself, and a balancing measure for what might get worse."
              action={
                <button type="button" className="btn-primary" onClick={() => setAddingMeasure(true)}>
                  <i className="bi bi-plus-lg" aria-hidden="true" /> Add measure
                </button>
              }
            />
          ) : (
            <>
              {["outcome", "process", "balancing"].map((role) => {
                const rows = byRole(role);
                if (rows.length === 0) return null;
                return (
                  <div className="mgroup" key={role}>
                    <h3 className="mgroup-title">{MEASURE_ROLES[role].label}</h3>
                    <ul className="mlist">
                      {rows.map((measure) => (
                        <MeasureRow
                          key={measure.id}
                          project={project}
                          measure={measure}
                          observations={state.observations}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}

              {byRole("balancing").length === 0 && (
                <p className="mgroup-nudge">
                  <i className="bi bi-lightbulb" aria-hidden="true" /> No
                  balancing measure yet. What could this change make worse?
                </p>
              )}
            </>
          )}
        </Panel>

        <Panel
          title="PDSA cycles"
          icon="bi-arrow-repeat"
          action={
            <button
              type="button"
              className="panel-link"
              onClick={() => setEditingCycle("new")}
            >
              New cycle <i className="bi bi-plus-lg" aria-hidden="true" />
            </button>
          }
        >
          {cycles.length === 0 ? (
            <EmptyState
              icon="bi-arrow-repeat"
              title="No cycles yet"
              hint="Each cycle records what you planned, what you predicted, what happened, and what you decided next."
              action={
                <button type="button" className="btn-primary" onClick={() => setEditingCycle("new")}>
                  <i className="bi bi-plus-lg" aria-hidden="true" /> Start a cycle
                </button>
              }
            />
          ) : (
            <ol className="cycles">
              {cycles.map((cycle) => (
                <li className="cycle" key={cycle.id}>
                  <div className="cycle-num">{cycle.number}</div>
                  <div className="cycle-body">
                    <div className="cycle-head">
                      <strong>{cycle.title}</strong>
                      {cycle.act ? (
                        <Pill tone={CYCLE_ACTS[cycle.act].tone}>
                          {CYCLE_ACTS[cycle.act].label}
                        </Pill>
                      ) : (
                        <Pill tone="primary" dot>
                          Running
                        </Pill>
                      )}
                    </div>
                    <p className="cycle-dates">
                      {shortDate(cycle.startDate)}
                      {cycle.endDate ? ` – ${shortDate(cycle.endDate)}` : " – ongoing"}
                      {cycle.annotate && (
                        <>
                          {" "}
                          · <i className="bi bi-bookmark-star" aria-hidden="true" /> on charts
                        </>
                      )}
                    </p>
                    {cycle.prediction && (
                      <p className="cycle-prediction">
                        <span>Predicted:</span> {cycle.prediction}
                      </p>
                    )}
                    {cycle.studyNotes && (
                      <p className="cycle-study">
                        <span>Found:</span> {cycle.studyNotes}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="cycle-edit"
                    onClick={() => setEditingCycle(cycle)}
                    aria-label={`Edit PDSA ${cycle.number}`}
                  >
                    <i className="bi bi-pencil" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Tasks" icon="bi-check2-square">
          <form className="task-add" onSubmit={addTask}>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add an admin task — request the data extract, book the meeting…"
              aria-label="New task"
            />
            <button type="submit" className="btn-quiet">
              Add
            </button>
          </form>

          {tasks.length === 0 ? (
            <p className="task-empty">
              Nothing outstanding. These are the practical jobs around the
              project, kept apart from the PDSA cycles.
            </p>
          ) : (
            <ul className="tasks">
              {tasks.map((task) => (
                <li className={`task ${task.done ? "is-done" : ""}`} key={task.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => dispatch({ type: "task/toggle", id: task.id })}
                    />
                    <span>{task.title}</span>
                  </label>
                  <button
                    type="button"
                    className="task-remove"
                    onClick={() => dispatch({ type: "task/remove", id: task.id })}
                    aria-label={`Remove "${task.title}"`}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <p className="detail-foot">
          Target date {longDate(project.targetDate)}.
        </p>
      </div>

      {editing && <ProjectForm project={project} onClose={() => setEditing(false)} />}
      {addingMeasure && (
        <MeasureForm projectId={project.id} onClose={() => setAddingMeasure(false)} />
      )}
      {editingCycle && (
        <CycleForm
          cycle={editingCycle === "new" ? null : editingCycle}
          projectId={project.id}
          onClose={() => setEditingCycle(null)}
        />
      )}
    </>
  );
}

export default ProjectDetailPage;
