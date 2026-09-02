import { useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import Field from "../../components/ui/Field.jsx";
import {
  MEASURE_ROLES,
  CADENCES,
  DIRECTIONS,
  MULTIPLIERS,
  CHART_GUIDE,
} from "../../data/vocab.js";
import { useDispatch } from "../../store/context.js";
import "./MeasureForm.css";

const blank = (projectId) => ({
  projectId,
  name: "",
  role: "outcome",
  chartType: "run",
  unit: "",
  multiplier: 1,
  direction: "lower",
  goal: "",
  cadence: "monthly",
  baselineEnd: "",
});

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = "Give the measure a name.";
  if (values.goal !== "" && Number.isNaN(Number(values.goal))) {
    errors.goal = "The goal must be a number, or left blank.";
  }
  return errors;
}

function MeasureForm({ measure, projectId, onClose }) {
  const dispatch = useDispatch();
  const editing = Boolean(measure);
  const [values, setValues] = useState(
    measure
      ? { ...measure, goal: measure.goal ?? "", baselineEnd: measure.baselineEnd ?? "" }
      : blank(projectId),
  );
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (key) => (event) =>
    setValues((v) => ({ ...v, [key]: event.target.value }));

  const chosen = CHART_GUIDE.find((g) => g.id === values.chartType);

  const submit = (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      ...values,
      name: values.name.trim(),
      unit: values.unit.trim(),
      multiplier: Number(values.multiplier),
      goal: values.goal === "" ? null : Number(values.goal),
      baselineEnd: values.baselineEnd || null,
    };

    dispatch(
      editing
        ? { type: "measure/update", measure: payload }
        : { type: "measure/add", measure: payload },
    );
    onClose();
  };

  if (confirmDelete) {
    return (
      <Modal title="Delete this measure?" onClose={() => setConfirmDelete(false)} size="sm">
        <p style={{ marginTop: 0 }}>
          <strong>{measure.name}</strong> and all of its data points will be
          deleted. This cannot be undone.
        </p>
        <div className="modal-foot" style={{ border: 0, padding: 0, marginTop: "1rem" }}>
          <button type="button" className="btn-quiet" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              dispatch({ type: "measure/remove", id: measure.id });
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
      title={editing ? "Edit measure" : "New measure"}
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
          <button type="submit" form="measure-form" className="btn-primary">
            {editing ? "Save changes" : "Add measure"}
          </button>
        </>
      }
    >
      <form id="measure-form" onSubmit={submit} noValidate>
        <Field label="Name" required error={errors.name}>
          {(props) => (
            <input
              {...props}
              value={values.name}
              onChange={set("name")}
              placeholder="Antibiotics given within 60 minutes"
            />
          )}
        </Field>

        <Field label="Role in the measure family" hint={MEASURE_ROLES[values.role].hint}>
          {(props) => (
            <select {...props} value={values.role} onChange={set("role")}>
              {Object.entries(MEASURE_ROLES).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        {/* The chart depends on how the data was collected, not on how the
            numbers happen to look, so it is asked rather than guessed. */}
        <fieldset className="guide">
          <legend>What are you counting?</legend>
          <div className="guide-options">
            {CHART_GUIDE.map((option) => (
              <label
                key={option.id}
                className={`guide-option ${values.chartType === option.id ? "is-on" : ""}`}
              >
                <input
                  type="radio"
                  name="chartType"
                  value={option.id}
                  checked={values.chartType === option.id}
                  onChange={set("chartType")}
                />
                <span className="guide-body">
                  <strong>{option.question}</strong>
                  <span className="guide-example">{option.example}</span>
                  <span className="guide-detail">{option.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {chosen?.needsDenominator && (
          <p className="guide-note">
            <i className="bi bi-info-circle" aria-hidden="true" /> Each data
            point needs a numerator <em>and</em> a denominator. The control
            limits widen when the sample is small and tighten when it is large.
          </p>
        )}

        <div className="field-row">
          <Field label="Unit" hint="Shown on the y-axis">
            {(props) => (
              <input
                {...props}
                value={values.unit}
                onChange={set("unit")}
                placeholder="%, minutes, per 1,000 bed-days"
              />
            )}
          </Field>

          <Field label="Direction" hint={DIRECTIONS[values.direction].hint}>
            {(props) => (
              <select {...props} value={values.direction} onChange={set("direction")}>
                {Object.entries(DIRECTIONS).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <div className="field-row">
          <Field label="Goal" error={errors.goal} hint="Optional target line">
            {(props) => (
              <input {...props} type="number" step="any" value={values.goal} onChange={set("goal")} />
            )}
          </Field>

          <Field label="Collected" hint="Used to flag lapsed data collection">
            {(props) => (
              <select {...props} value={values.cadence} onChange={set("cadence")}>
                {Object.entries(CADENCES).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        {chosen?.needsDenominator && (
          <Field label="Scale" hint="How the rate is expressed">
            {(props) => (
              <select {...props} value={values.multiplier} onChange={set("multiplier")}>
                {Object.entries(MULTIPLIERS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        <Field
          label="Baseline ends"
          hint="Limits are calculated from data up to this date and then held fixed, so an improvement shows as a signal instead of moving the line with it. Leave blank to use all data."
        >
          {(props) => (
            <input
              {...props}
              type="date"
              value={values.baselineEnd}
              onChange={set("baselineEnd")}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}

export default MeasureForm;
