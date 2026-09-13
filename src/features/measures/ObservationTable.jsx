import { useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import Field from "../../components/ui/Field.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { CHART_GUIDE } from "../../data/vocab.js";
import { nextPeriod as stepPeriod } from "../../lib/matrix.js";
import { parsePaste } from "../../lib/paste.js";
import { useDispatch } from "../../store/context.js";
import "./ObservationTable.css";

function nextPeriod(observations, cadence) {
  const latest = observations.map((o) => o.period).sort().at(-1) ?? null;
  // The same stepping the data matrix uses, so a point added here lands on
  // the same period as a row added there instead of drifting off by a day.
  return stepPeriod(latest, cadence);
}

function PasteDialog({ measure, needsDenominator, onClose }) {
  const dispatch = useDispatch();
  const [text, setText] = useState("");
  const [errors, setErrors] = useState([]);
  const [denominatorFirst, setDenominatorFirst] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    const { rows, errors: found } = parsePaste(text, needsDenominator, {
      cadence: measure.cadence,
      denominatorFirst,
    });
    if (found.length) {
      setErrors(found);
      return;
    }
    if (rows.length === 0) {
      setErrors(["Nothing to import."]);
      return;
    }
    dispatch({ type: "observation/import", measureId: measure.id, rows });
    onClose();
  };

  const columns = needsDenominator
    ? denominatorFirst
      ? "date, denominator, numerator, note"
      : "date, numerator, denominator, note"
    : "date, value, note";

  return (
    <Modal
      title="Paste data"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="paste-form" className="btn-primary">
            Import
          </button>
        </>
      }
    >
      <p className="paste-help">
        One row per period, columns in the order <code>{columns}</code>,
        separated by tabs or commas — so you can copy straight out of a
        spreadsheet. Dates can be whatever your sheet shows:{" "}
        <code>Jul-25</code>, <code>01/07/2025</code> and{" "}
        <code>2025-07-01</code> all work, and each row is snapped to the
        nearest collection period. A header row is ignored. Rows whose date
        already exists will be replaced.
      </p>

      {needsDenominator && (
        <label className="paste-swap">
          <input
            type="checkbox"
            checked={denominatorFirst}
            onChange={(event) => {
              setDenominatorFirst(event.target.checked);
              setErrors([]);
            }}
          />
          <span>
            My total comes before the count — tick this if your sheet reads
            <em> date, total, events</em> rather than events before total.
          </span>
        </label>
      )}

      <form id="paste-form" onSubmit={submit} noValidate>
        <Field
          label="Data"
          error={errors.length ? errors[0] : undefined}
          hint={
            needsDenominator
              ? "e.g. 2026-01-06\t43\t50\tholiday week"
              : "e.g. 2026-01-06\t27.4"
          }
        >
          {(props) => (
            <textarea
              {...props}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setErrors([]);
              }}
              rows={10}
              style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}
            />
          )}
        </Field>

        {errors.length > 1 && (
          <ul className="paste-errors">
            {errors.slice(0, 8).map((e) => (
              <li key={e}>{e}</li>
            ))}
            {errors.length > 8 && <li>…and {errors.length - 8} more.</li>}
          </ul>
        )}
      </form>
    </Modal>
  );
}

/**
 * Inline data entry. Every cell edits in place and saves on change, so
 * adding a month of data is a matter of tabbing across — the fastest path
 * that does not involve leaving the page.
 */
function ObservationTable({ measure, observations }) {
  const dispatch = useDispatch();
  const [pasting, setPasting] = useState(false);

  const needsDenominator =
    CHART_GUIDE.find((g) => g.id === measure.chartType)?.needsDenominator ?? false;

  const rows = [...observations].sort((a, b) =>
    a.period < b.period ? -1 : a.period > b.period ? 1 : 0,
  );

  const update = (observation, patch) =>
    dispatch({
      type: "observation/update",
      observation: { ...observation, ...patch },
    });

  const addRow = () =>
    dispatch({
      type: "observation/add",
      observation: {
        measureId: measure.id,
        period: nextPeriod(rows, measure.cadence),
        value: 0,
        // Null, not zero: a zero denominator is not a sample of none, it is
        // an unanswerable division, and it used to blank the whole chart the
        // instant a point was added.
        denominator: null,
        note: "",
      },
    });

  return (
    <>
      <div className="obs-head">
        <h3 className="obs-title">Data</h3>
        <div className="obs-actions">
          <button type="button" className="btn-quiet" onClick={() => setPasting(true)}>
            <i className="bi bi-clipboard-plus" aria-hidden="true" /> Paste data
          </button>
          <button type="button" className="btn-primary" onClick={addRow}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> Add point
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="bi-table"
          title="No data points yet"
          hint="Add them one at a time, or paste a column straight out of a spreadsheet."
          action={
            <>
              <button type="button" className="btn-primary" onClick={addRow}>
                <i className="bi bi-plus-lg" aria-hidden="true" /> Add point
              </button>
              <button type="button" className="btn-quiet" onClick={() => setPasting(true)}>
                <i className="bi bi-clipboard-plus" aria-hidden="true" /> Paste data
              </button>
            </>
          }
        />
      ) : (
        <div className="obs-scroll">
          <table className="obs-table">
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col">{needsDenominator ? "Numerator" : "Value"}</th>
                {needsDenominator && <th scope="col">Denominator</th>}
                <th scope="col">Note</th>
                <th scope="col"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="date"
                      value={row.period}
                      aria-label="Period"
                      onChange={(e) => update(row, { period: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={row.value}
                      aria-label={needsDenominator ? "Numerator" : "Value"}
                      onChange={(e) => update(row, { value: Number(e.target.value) })}
                    />
                  </td>
                  {needsDenominator && (
                    <td>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.denominator ?? ""}
                        aria-label="Denominator"
                        onChange={(e) =>
                          update(row, { denominator: Number(e.target.value) })
                        }
                      />
                    </td>
                  )}
                  <td>
                    <input
                      type="text"
                      value={row.note ?? ""}
                      aria-label="Note"
                      placeholder="Optional"
                      onChange={(e) => update(row, { note: e.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="obs-remove"
                      aria-label={`Remove the point for ${row.period}`}
                      onClick={() =>
                        dispatch({ type: "observation/remove", id: row.id })
                      }
                    >
                      <i className="bi bi-trash3" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="obs-privacy">
        <i className="bi bi-shield-lock" aria-hidden="true" /> Enter aggregate
        numbers only — never patient identifiers. Everything you type stays in
        this browser.
      </p>

      {pasting && (
        <PasteDialog
          measure={measure}
          needsDenominator={needsDenominator}
          onClose={() => setPasting(false)}
        />
      )}
    </>
  );
}

export default ObservationTable;
