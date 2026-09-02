import { useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import Field from "../../components/ui/Field.jsx";
import { CYCLE_ACTS } from "../../data/vocab.js";
import { useDispatch } from "../../store/context.js";

const today = () => new Date().toISOString().slice(0, 10);

const blank = (projectId) => ({
  projectId,
  title: "",
  plan: "",
  prediction: "",
  doNotes: "",
  studyNotes: "",
  act: "",
  startDate: today(),
  endDate: "",
  annotate: true,
});

/**
 * A PDSA cycle. The four sections are kept separate rather than collapsed
 * into one notes field, because the discipline of writing a prediction
 * before you look at the result is the point of the method.
 */
function CycleForm({ cycle, projectId, onClose }) {
  const dispatch = useDispatch();
  const editing = Boolean(cycle);
  const [values, setValues] = useState(
    cycle ? { ...cycle, act: cycle.act ?? "", endDate: cycle.endDate ?? "" } : blank(projectId),
  );
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (key) => (event) =>
    setValues((v) => ({ ...v, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    if (!values.title.trim()) {
      setError("Give the cycle a short title.");
      return;
    }
    const payload = {
      ...values,
      title: values.title.trim(),
      act: values.act || null,
      endDate: values.endDate || null,
    };
    dispatch(
      editing
        ? { type: "cycle/update", cycle: payload }
        : { type: "cycle/add", cycle: payload },
    );
    onClose();
  };

  if (confirmDelete) {
    return (
      <Modal title="Delete this cycle?" onClose={() => setConfirmDelete(false)} size="sm">
        <p style={{ marginTop: 0 }}>
          PDSA {cycle.number} — <strong>{cycle.title}</strong> will be deleted,
          along with its marker on the charts.
        </p>
        <div className="modal-foot" style={{ border: 0, padding: 0, marginTop: "1rem" }}>
          <button type="button" className="btn-quiet" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              dispatch({ type: "cycle/remove", id: cycle.id });
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
      title={editing ? `Edit PDSA ${cycle.number}` : "New PDSA cycle"}
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
          <button type="submit" form="cycle-form" className="btn-primary">
            {editing ? "Save changes" : "Start cycle"}
          </button>
        </>
      }
    >
      <form id="cycle-form" onSubmit={submit} noValidate>
        <Field label="What are you testing?" required error={error}>
          {(props) => (
            <input
              {...props}
              value={values.title}
              onChange={(e) => {
                setValues((v) => ({ ...v, title: e.target.value }));
                setError("");
              }}
              placeholder="Prompt card on the anaesthetic machine"
            />
          )}
        </Field>

        <div className="field-row">
          <Field label="Started">
            {(props) => (
              <input {...props} type="date" value={values.startDate} onChange={set("startDate")} />
            )}
          </Field>
          <Field label="Ended" hint="Leave blank while running">
            {(props) => (
              <input {...props} type="date" value={values.endDate} onChange={set("endDate")} />
            )}
          </Field>
        </div>

        <Field label="Plan" hint="Who does what, where, and when">
          {(props) => (
            <textarea {...props} value={values.plan} onChange={set("plan")} />
          )}
        </Field>

        <Field
          label="Prediction"
          hint="Write this before you collect the data — it is what makes the cycle a test rather than a hope."
        >
          {(props) => (
            <textarea
              {...props}
              value={values.prediction}
              onChange={set("prediction")}
              placeholder="Compliance rises from about 60% to above 80% within four weeks."
            />
          )}
        </Field>

        <Field label="Do — what actually happened">
          {(props) => (
            <textarea {...props} value={values.doNotes} onChange={set("doNotes")} />
          )}
        </Field>

        <Field label="Study — what the data showed">
          {(props) => (
            <textarea {...props} value={values.studyNotes} onChange={set("studyNotes")} />
          )}
        </Field>

        <Field label="Act" hint={values.act ? CYCLE_ACTS[values.act]?.hint : "Decide once the data is in"}>
          {(props) => (
            <select {...props} value={values.act} onChange={set("act")}>
              <option value="">Still running</option>
              {Object.entries(CYCLE_ACTS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <label className="check-row">
          <input
            type="checkbox"
            checked={values.annotate}
            onChange={(e) =>
              setValues((v) => ({ ...v, annotate: e.target.checked }))
            }
          />
          <span>
            Mark the start date on this project&rsquo;s charts, so the change
            can be read against the data.
          </span>
        </label>
      </form>
    </Modal>
  );
}

export default CycleForm;
