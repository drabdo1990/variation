import { useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import Field from "../../components/ui/Field.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import { BOARD_LANES, URGENCY } from "../../data/vocab.js";
import { useAppState, useDispatch } from "../../store/context.js";

const inDays = (n) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

function TaskForm({ task, defaultLane = "backlog", onClose }) {
  const { people, projects } = useAppState();
  const dispatch = useDispatch();
  const editing = Boolean(task);

  const [values, setValues] = useState(
    task ?? {
      title: "",
      detail: "",
      lane: defaultLane,
      urgency: "normal",
      projectId: "",
      assigneeIds: [],
      due: inDays(14),
    },
  );
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (key) => (event) =>
    setValues((v) => ({ ...v, [key]: event.target.value }));

  const toggleAssignee = (id) =>
    setValues((v) => ({
      ...v,
      assigneeIds: v.assigneeIds.includes(id)
        ? v.assigneeIds.filter((a) => a !== id)
        : [...v.assigneeIds, id],
    }));

  const submit = (event) => {
    event.preventDefault();
    const found = {};
    if (!values.title.trim()) found.title = "Give the task a title.";
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      ...values,
      title: values.title.trim(),
      detail: values.detail.trim(),
      projectId: values.projectId || null,
    };

    dispatch(
      editing
        ? { type: "task/update", task: payload }
        : { type: "task/add", task: payload },
    );
    onClose();
  };

  if (confirmDelete) {
    return (
      <Modal title="Delete this task?" onClose={() => setConfirmDelete(false)} size="sm">
        <p>
          <strong>{task.title}</strong> will be deleted. This cannot be undone.
        </p>
        <div className="modal-foot" style={{ border: 0, padding: 0, marginTop: "1rem" }}>
          <button type="button" className="btn-quiet" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              dispatch({ type: "task/remove", id: task.id });
              onClose();
            }}
          >
            <i className="bi bi-trash3" aria-hidden="true" /> Delete
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={editing ? "Edit task" : "New task"}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {editing && (
            <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
              <i className="bi bi-trash3" aria-hidden="true" /> Delete
            </button>
          )}
          <button type="button" className="btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="task-form" className="btn-cadence">
            {editing ? "Save changes" : "Add task"}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} noValidate>
        <Field label="Title" required error={errors.title}>
          {(props) => (
            <input
              {...props}
              value={values.title}
              onChange={set("title")}
              placeholder="Split payment step into its own route"
            />
          )}
        </Field>

        <Field label="Detail">
          {(props) => (
            <textarea {...props} value={values.detail} onChange={set("detail")} />
          )}
        </Field>

        <div className="field-row">
          <Field label="Lane">
            {(props) => (
              <select {...props} value={values.lane} onChange={set("lane")}>
                {BOARD_LANES.map((lane) => (
                  <option key={lane.id} value={lane.id}>
                    {lane.label}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Urgency">
            {(props) => (
              <select {...props} value={values.urgency} onChange={set("urgency")}>
                {Object.entries(URGENCY).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <div className="field-row">
          <Field label="Project">
            {(props) => (
              <select {...props} value={values.projectId ?? ""} onChange={set("projectId")}>
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Due">
            {(props) => (
              <input {...props} type="date" value={values.due ?? ""} onChange={set("due")} />
            )}
          </Field>
        </div>

        <Field label="Assignees">
          {() =>
            people.length === 0 ? (
              <p className="picker-empty">
                No people yet — add them on the People page first.
              </p>
            ) : (
              <div className="picker">
                {people.map((person) => {
                  const on = values.assigneeIds.includes(person.id);
                  return (
                    <button
                      type="button"
                      key={person.id}
                      className={`picker-chip ${on ? "is-on" : ""}`}
                      aria-pressed={on}
                      onClick={() => toggleAssignee(person.id)}
                    >
                      <Avatar name={person.name} size={26} title={null} />
                      {person.name}
                    </button>
                  );
                })}
              </div>
            )
          }
        </Field>
      </form>
    </Modal>
  );
}

export default TaskForm;
