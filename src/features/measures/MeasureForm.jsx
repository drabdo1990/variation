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
  /** Phases *after* the first — the first is the "Baseline ends" field. */
  phases: [],
});

const newPhaseId = () =>
  globalThis.crypto?.randomUUID?.() ?? `phase-${Date.now()}`;

/**
 * The form edits the phases after the first, because the first is already
 * described by "Baseline ends" and asking for it twice would be confusing.
 * The stored measure carries the full list, which is what `resolvePhases`
 * expects.
 */
function toFormValues(measure) {
  const stored = Array.isArray(measure.phases) ? measure.phases : [];

  return {
    ...measure,
    goal: measure.goal ?? "",
    baselineEnd: (stored[0]?.baselineEnd ?? measure.baselineEnd) || "",
    phases: stored.slice(1).map((phase) => ({
      id: phase.id ?? newPhaseId(),
      label: phase.label ?? "",
      startsAt: phase.startsAt ?? "",
      baselineEnd: phase.baselineEnd ?? "",
    })),
  };
}

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = "Give the measure a name.";
  if (values.goal !== "" && Number.isNaN(Number(values.goal))) {
    errors.goal = "The goal must be a number, or left blank.";
  }
  // A phase without a start date has no boundary, so it cannot be drawn.
  if (values.phases.some((p) => !p.startsAt)) {
    errors.phases = "Every phase needs a start date.";
  }
  return errors;
}

function MeasureForm({ measure, projectId, onClose }) {
  const dispatch = useDispatch();
  const editing = Boolean(measure);
  const [values, setValues] = useState(
    measure ? toFormValues(measure) : blank(projectId),
  );
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  /** Fields the user has typed in themselves are never overwritten. */
  const [touched, setTouched] = useState({ unit: false, multiplier: false });

  const set = (key) => (event) => {
    if (key === "unit" || key === "multiplier") {
      setTouched((t) => ({ ...t, [key]: true }));
    }
    setValues((v) => ({ ...v, [key]: event.target.value }));
  };

  /**
   * Picking a proportion sets the scale to a percentage.
   *
   * Leaving it at "per unit" is a trap: the chart then plots 0.81 where the
   * team means 81%, and a goal entered as 10 lands so far outside the data
   * that the goal line is dropped from the chart entirely. A clinical
   * proportion is a percentage in almost every case. np is deliberately
   * excluded — it plots a raw count, not a rate.
   */
  const setChartType = (event) => {
    const chartType = event.target.value;
    setValues((v) => {
      const next = { ...v, chartType };
      if (chartType === "p" || chartType === "p-prime") {
        if (!touched.multiplier) next.multiplier = 100;
        if (!touched.unit && !v.unit.trim()) next.unit = "%";
      }
      return next;
    });
  };

  const chosen = CHART_GUIDE.find((g) => g.id === values.chartType);

  const setPhase = (index, key) => (event) =>
    setValues((v) => ({
      ...v,
      phases: v.phases.map((phase, i) =>
        i === index ? { ...phase, [key]: event.target.value } : phase,
      ),
    }));

  const addPhase = () =>
    setValues((v) => ({
      ...v,
      phases: [
        ...v.phases,
        { id: newPhaseId(), label: "", startsAt: "", baselineEnd: "" },
      ],
    }));

  const removePhase = (index) =>
    setValues((v) => ({
      ...v,
      phases: v.phases.filter((_, i) => i !== index),
    }));

  const submit = (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    const baselineEnd = values.baselineEnd || null;

    /*
     * Only store a phase list when the measure is actually split. Leaving it
     * empty keeps the measure in the shape every earlier version saved, and
     * `resolvePhases` derives the single phase from `baselineEnd`.
     */
    const phases = values.phases.length
      ? [
          { id: "phase-1", label: "Baseline", startsAt: null, baselineEnd },
          ...values.phases.map((phase, i) => ({
            id: phase.id,
            label: phase.label.trim() || `Phase ${i + 2}`,
            startsAt: phase.startsAt,
            baselineEnd: phase.baselineEnd || null,
          })),
        ]
      : [];

    const payload = {
      ...values,
      name: values.name.trim(),
      unit: values.unit.trim(),
      multiplier: Number(values.multiplier),
      goal: values.goal === "" ? null : Number(values.goal),
      baselineEnd,
      phases,
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
                  onChange={setChartType}
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
          <Field label="Shown as" hint="The scale the chart plots on">
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

        {/* Re-baselining. Kept below the baseline field and empty by default,
            because most measures never need it and the ones that do only need
            it after the first change has held. */}
        <fieldset className="phases">
          <legend>Phases</legend>
          <p className="phases-hint">
            Once a change has become standard practice, its limits describe a
            process that no longer exists. Start a new phase and everything
            after it is measured against its own centre line — and no rule is
            allowed to span the join.
          </p>

          {errors.phases && (
            <p className="phases-error" role="alert">
              {errors.phases}
            </p>
          )}

          {values.phases.length === 0 ? (
            <p className="phases-empty">
              This measure is drawn as one phase.
            </p>
          ) : (
            <ol className="phase-rows">
              {values.phases.map((phase, i) => (
                <li className="phase-row" key={phase.id}>
                  <Field label="Name">
                    {(props) => (
                      <input
                        {...props}
                        value={phase.label}
                        onChange={setPhase(i, "label")}
                        placeholder={`Phase ${i + 2}`}
                      />
                    )}
                  </Field>
                  <Field label="Starts">
                    {(props) => (
                      <input
                        {...props}
                        type="date"
                        value={phase.startsAt}
                        onChange={setPhase(i, "startsAt")}
                      />
                    )}
                  </Field>
                  <Field label="Baseline ends" hint="Optional">
                    {(props) => (
                      <input
                        {...props}
                        type="date"
                        value={phase.baselineEnd}
                        onChange={setPhase(i, "baselineEnd")}
                      />
                    )}
                  </Field>
                  <button
                    type="button"
                    className="btn-quiet phase-remove"
                    onClick={() => removePhase(i)}
                    aria-label={`Remove ${phase.label || `phase ${i + 2}`}`}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          )}

          <button type="button" className="btn-quiet" onClick={addPhase}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> Start a new phase
          </button>
        </fieldset>
      </form>
    </Modal>
  );
}

export default MeasureForm;
