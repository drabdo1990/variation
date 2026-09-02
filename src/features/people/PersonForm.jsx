import { useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import Field from "../../components/ui/Field.jsx";
import { DEPARTMENTS } from "../../data/vocab.js";
import { useDispatch } from "../../store/context.js";

const blank = { name: "", role: "", department: "anaesthetics" };

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
    const found = {};
    if (!values.name.trim()) found.name = "A name is required.";
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      ...values,
      name: values.name.trim(),
      role: values.role.trim(),
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
        <p style={{ marginTop: 0 }}>
          <strong>{person.name}</strong> will be removed from every project and
          unassigned from their tasks. Nothing else is deleted.
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
          <button type="submit" form="person-form" className="btn-primary">
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

        <Field label="Role">
          {(props) => (
            <input
              {...props}
              value={values.role}
              onChange={set("role")}
              placeholder="Consultant Anaesthetist"
            />
          )}
        </Field>

        <Field label="Department">
          {(props) => (
            <select {...props} value={values.department} onChange={set("department")}>
              {Object.entries(DEPARTMENTS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </form>
    </Modal>
  );
}

export default PersonForm;
