import { useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import Field from "../../components/ui/Field.jsx";
import { GUILDS, PRESENCE } from "../../data/vocab.js";
import { useDispatch } from "../../store/context.js";

const blank = {
  name: "",
  title: "",
  guild: "web",
  presence: "onsite",
  timezone: "",
  weeklyCapacity: 32,
};

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = "A name is required.";
  if (!values.title.trim()) errors.title = "Add a role so the team page reads clearly.";

  const capacity = Number(values.weeklyCapacity);
  if (Number.isNaN(capacity) || capacity < 0 || capacity > 80) {
    errors.weeklyCapacity = "Enter hours between 0 and 80.";
  }
  return errors;
}

function PersonForm({ person, onClose }) {
  const dispatch = useDispatch();
  const editing = Boolean(person);
  const [values, setValues] = useState(person ?? blank);
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (key) => (event) =>
    setValues((v) => ({ ...v, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      ...values,
      name: values.name.trim(),
      title: values.title.trim(),
      timezone: values.timezone.trim(),
      weeklyCapacity: Number(values.weeklyCapacity),
    };

    dispatch(
      editing
        ? { type: "person/update", person: payload }
        : { type: "person/add", person: payload },
    );
    onClose();
  };

  if (confirmDelete) {
    return (
      <Modal title="Remove this person?" onClose={() => setConfirmDelete(false)} size="sm">
        <p>
          <strong>{person.name}</strong> will be removed from every project and
          unassigned from their tasks. The tasks themselves are kept.
        </p>
        <div className="modal-foot" style={{ border: 0, padding: 0, marginTop: "1rem" }}>
          <button type="button" className="btn-quiet" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              dispatch({ type: "person/remove", id: person.id });
              onClose();
            }}
          >
            <i className="bi bi-trash3" aria-hidden="true" /> Remove
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={editing ? "Edit person" : "Add a person"}
      onClose={onClose}
      footer={
        <>
          {editing && (
            <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
              <i className="bi bi-trash3" aria-hidden="true" /> Remove
            </button>
          )}
          <button type="button" className="btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="person-form" className="btn-cadence">
            {editing ? "Save changes" : "Add person"}
          </button>
        </>
      }
    >
      <form id="person-form" onSubmit={submit} noValidate>
        <Field label="Name" required error={errors.name}>
          {(props) => (
            <input {...props} value={values.name} onChange={set("name")} autoComplete="name" />
          )}
        </Field>

        <Field label="Role" required error={errors.title}>
          {(props) => (
            <input
              {...props}
              value={values.title}
              onChange={set("title")}
              placeholder="Frontend Engineer"
            />
          )}
        </Field>

        <div className="field-row">
          <Field label="Guild">
            {(props) => (
              <select {...props} value={values.guild} onChange={set("guild")}>
                {Object.entries(GUILDS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Availability">
            {(props) => (
              <select {...props} value={values.presence} onChange={set("presence")}>
                {Object.entries(PRESENCE).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <div className="field-row">
          <Field label="Time zone" hint="Free text, e.g. GMT+2">
            {(props) => (
              <input {...props} value={values.timezone} onChange={set("timezone")} placeholder="GMT+2" />
            )}
          </Field>

          <Field
            label="Weekly capacity"
            error={errors.weeklyCapacity}
            hint="Hours available per week"
          >
            {(props) => (
              <input
                {...props}
                type="number"
                min="0"
                max="80"
                value={values.weeklyCapacity}
                onChange={set("weeklyCapacity")}
              />
            )}
          </Field>
        </div>
      </form>
    </Modal>
  );
}

export default PersonForm;
