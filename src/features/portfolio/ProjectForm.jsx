import { useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import Field from "../../components/ui/Field.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import { PROJECT_PHASES } from "../../data/vocab.js";
import { useAppState, useDispatch } from "../../store/context.js";

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const blank = {
  name: "",
  summary: "",
  phase: "discovery",
  leadId: "",
  memberIds: [],
  startDate: today(),
  targetDate: inDays(60),
};

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = "Give the project a name.";
  if (!values.startDate) errors.startDate = "Pick a start date.";
  if (!values.targetDate) errors.targetDate = "Pick a target date.";
  if (
    values.startDate &&
    values.targetDate &&
    new Date(values.targetDate) <= new Date(values.startDate)
  ) {
    errors.targetDate = "The target must come after the start date.";
  }
  return errors;
}

function ProjectForm({ project, onClose }) {
  const { people } = useAppState();
  const dispatch = useDispatch();
  const editing = Boolean(project);
  const [values, setValues] = useState(project ?? blank);
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (key) => (event) =>
    setValues((v) => ({ ...v, [key]: event.target.value }));

  const toggleMember = (id) =>
    setValues((v) => ({
      ...v,
      memberIds: v.memberIds.includes(id)
        ? v.memberIds.filter((m) => m !== id)
        : [...v.memberIds, id],
    }));

  const submit = (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      ...values,
      name: values.name.trim(),
      summary: values.summary.trim(),
      leadId: values.leadId || null,
    };

    dispatch(
      editing
        ? { type: "project/update", project: payload }
        : { type: "project/add", project: payload },
    );
    onClose();
  };

  if (confirmDelete) {
    return (
      <Modal title="Delete this project?" onClose={() => setConfirmDelete(false)} size="sm">
        <p>
          <strong>{project.name}</strong> will be deleted. Its tasks are kept on
          the board but no longer linked to a project.
        </p>
        <div className="modal-foot" style={{ border: 0, padding: 0, marginTop: "1rem" }}>
          <button type="button" className="btn-quiet" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              dispatch({ type: "project/remove", id: project.id });
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
      title={editing ? "Edit project" : "New project"}
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
          <button type="submit" form="project-form" className="btn-cadence">
            {editing ? "Save changes" : "Create project"}
          </button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} noValidate>
        <Field label="Name" required error={errors.name}>
          {(props) => (
            <input {...props} value={values.name} onChange={set("name")} placeholder="Checkout rebuild" />
          )}
        </Field>

        <Field label="Summary" hint="One line on what this delivers">
          {(props) => (
            <textarea
              {...props}
              value={values.summary}
              onChange={set("summary")}
              placeholder="Replace the legacy checkout with a three-step flow"
            />
          )}
        </Field>

        <div className="field-row">
          <Field label="Phase">
            {(props) => (
              <select {...props} value={values.phase} onChange={set("phase")}>
                {Object.entries(PROJECT_PHASES).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Lead">
            {(props) => (
              <select {...props} value={values.leadId ?? ""} onChange={set("leadId")}>
                <option value="">No lead yet</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <div className="field-row">
          <Field label="Start" required error={errors.startDate}>
            {(props) => (
              <input {...props} type="date" value={values.startDate} onChange={set("startDate")} />
            )}
          </Field>

          <Field label="Target" required error={errors.targetDate}>
            {(props) => (
              <input {...props} type="date" value={values.targetDate} onChange={set("targetDate")} />
            )}
          </Field>
        </div>

        <Field label="Team">
          {() =>
            people.length === 0 ? (
              <p className="picker-empty">
                No people yet — add them on the People page and they will appear
                here.
              </p>
            ) : (
              <div className="picker">
                {people.map((person) => {
                  const on = values.memberIds.includes(person.id);
                  return (
                    <button
                      type="button"
                      key={person.id}
                      className={`picker-chip ${on ? "is-on" : ""}`}
                      aria-pressed={on}
                      onClick={() => toggleMember(person.id)}
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

export default ProjectForm;
