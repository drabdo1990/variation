import { useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import Field from "../../components/ui/Field.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { CADENCES, CHART_GUIDE } from "../../data/vocab.js";
import { useDispatch } from "../../store/context.js";
import "./ObservationTable.css";

const DAY = 86_400_000;
const iso = (d) => d.toISOString().slice(0, 10);

function nextPeriod(observations, cadence) {
  const days = CADENCES[cadence]?.days ?? 30;
  const latest = observations.map((o) => o.period).sort().at(-1);
  if (!latest) return iso(new Date());
  return iso(new Date(new Date(latest).getTime() + days * DAY));
}

/**
 * Parse pasted spreadsheet data. Accepts tab, comma or semicolon separated
 * columns in the order the table shows them, with an optional header row.
 */
function parsePaste(text, needsDenominator) {
  const errors = [];
  const rows = [];

  for (const [i, raw] of text.trim().split(/\r?\n/).entries()) {
    if (!raw.trim()) continue;
    const cells = raw.split(/\t|,|;/).map((c) => c.trim());

    // Skip a header row rather than reporting it as an error.
    if (i === 0 && Number.isNaN(Number(cells[1]))) continue;

    const [period, value, denominator, ...noteParts] = cells;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(period)) {
      errors.push(`Line ${i + 1}: "${period}" is not a date in YYYY-MM-DD form.`);
      continue;
    }
    if (value === undefined || Number.isNaN(Number(value))) {
      errors.push(`Line ${i + 1}: "${value}" is not a number.`);
      continue;
    }
    if (needsDenominator && (!denominator || Number.isNaN(Number(denominator)))) {
      errors.push(`Line ${i + 1}: this chart needs a denominator in the third column.`);
      continue;
    }

    rows.push({
      period,
      value: Number(value),
      denominator: needsDenominator ? Number(denominator) : null,
      note: noteParts.join(" ").trim(),
    });
  }

  return { rows, errors };
}

function PasteDialog({ measure, needsDenominator, onClose }) {
  const dispatch = useDispatch();
  const [text, setText] = useState("");
  const [errors, setErrors] = useState([]);

  const submit = (event) => {
    event.preventDefault();
    const { rows, errors: found } = parsePaste(text, needsDenominator);
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
    ? "date, value, denominator, note"
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
        spreadsheet. A header row is ignored. Rows whose date already exists
        will be replaced.
      </p>

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
        denominator: needsDenominator ? 0 : null,
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
