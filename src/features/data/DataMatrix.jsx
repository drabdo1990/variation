import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import { CHART_GUIDE, MEASURE_ROLES, CADENCES } from "../../data/vocab.js";
import {
  collectPeriods,
  observationAt,
  nextPeriod,
  dominantCadence,
  canonicalPeriod,
  rowCompleteness,
} from "../../lib/matrix.js";
import { shortDate } from "../../lib/format.js";
import { useDispatch } from "../../store/context.js";
import "./DataMatrix.css";

const needsDenominator = (measure) =>
  CHART_GUIDE.find((g) => g.id === measure.chartType)?.needsDenominator ?? false;

/**
 * One sitting per row, every measure across the columns — the shape of the
 * paper audit sheet a QI team actually fills in, rather than making them
 * visit each measure separately and retype the same date three times.
 */
function DataMatrix({
  measures,
  observations,
  extraPeriods,
  onAddPeriod,
  onDropPeriod,
  focusPeriod,
  onFocusPeriod,
}) {
  const dispatch = useDispatch();
  const [confirmRow, setConfirmRow] = useState(null);
  const scrollRef = useRef(null);

  const cadence = dominantCadence(measures);
  const periods = useMemo(
    () => collectPeriods(measures, observations, extraPeriods),
    [measures, observations, extraPeriods],
  );

  /**
   * Write one cell. Creates the observation on first entry and deletes it
   * when the numerator is cleared, so an empty cell always means "not
   * collected" rather than "collected as zero".
   */
  const setCell = (measure, period, field, raw) => {
    const existing = observationAt(observations, measure.id, period);
    const parsed = raw === "" ? null : Number(raw);
    if (raw !== "" && Number.isNaN(parsed)) return;

    if (existing) {
      if (field === "value" && parsed === null) {
        dispatch({ type: "observation/remove", id: existing.id });
        return;
      }
      dispatch({
        type: "observation/update",
        observation: { ...existing, [field]: parsed },
      });
      return;
    }

    if (parsed === null) return; // nothing to create

    dispatch({
      type: "observation/add",
      observation: {
        measureId: measure.id,
        period,
        value: field === "value" ? parsed : null,
        denominator: field === "denominator" ? parsed : null,
        note: "",
      },
    });
  };

  const movePeriod = (from, to) => {
    const snapped = canonicalPeriod(to, cadence);
    if (!snapped || snapped === from) return;
    for (const measure of measures) {
      const existing = observationAt(observations, measure.id, from);
      if (existing) {
        dispatch({
          type: "observation/update",
          observation: { ...existing, period: snapped },
        });
      }
    }
    onDropPeriod(from);
    onAddPeriod(snapped);
  };

  const removeRow = (period) => {
    for (const measure of measures) {
      const existing = observationAt(observations, measure.id, period);
      if (existing) dispatch({ type: "observation/remove", id: existing.id });
    }
    onDropPeriod(period);
    setConfirmRow(null);
  };

  const addRow = () => {
    const latest = periods.at(-1) ?? null;
    onAddPeriod(nextPeriod(latest, cadence));
  };

  /**
   * Open on the most recent period — the reason to be here is almost always
   * to enter the sitting that just happened. This waits for the first render
   * that actually has rows (state arrives from storage after mount) and then
   * fires once, since re-running it would yank the view away while typing.
   */
  const hasScrolled = useRef(false);
  useEffect(() => {
    if (hasScrolled.current || periods.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    hasScrolled.current = true;
  }, [periods.length]);

  /**
   * The header is two rows, and the second has to be pinned exactly below
   * the first. Its height depends on how the measure names wrap, so it is
   * measured rather than guessed — a fixed offset leaves a gap that data
   * rows scroll through.
   */
  const headRowRef = useRef(null);
  useEffect(() => {
    const row = headRowRef.current;
    const scroller = scrollRef.current;
    if (!row || !scroller) return;

    // Measure a measure-name cell, not the row: the Period cell spans both
    // header rows, which stretches the row's own height to cover both.
    const cell = row.querySelector(".matrix-measure-head");
    if (!cell) return;

    const apply = () =>
      scroller.style.setProperty(
        "--matrix-head-offset",
        `${cell.getBoundingClientRect().height}px`,
      );

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(cell);
    return () => observer.disconnect();
  }, [measures]);

  if (measures.length === 0) return null;

  return (
    <>
      <div className="matrix-bar">
        <p className="matrix-hint">
          One row per collection period. Blank means <em>not collected</em>,
          which is different from a zero — an empty cell leaves a gap in the
          chart rather than pulling the centre line down.
        </p>
        <button type="button" className="btn-primary" onClick={addRow}>
          <i className="bi bi-plus-lg" aria-hidden="true" /> Add{" "}
          {CADENCES[cadence]?.label.toLowerCase() ?? ""} period
        </button>
      </div>

      <div className="matrix-scroll" ref={scrollRef}>
        <table className="matrix">
          <thead>
            <tr ref={headRowRef}>
              <th scope="col" rowSpan={2} className="matrix-period-head">
                Period
              </th>
              {measures.map((measure) => (
                <th
                  key={measure.id}
                  scope="col"
                  colSpan={needsDenominator(measure) ? 2 : 1}
                  className={`matrix-measure-head role-${measure.role}`}
                >
                  <span className="matrix-measure-name">{measure.name}</span>
                  <span className="matrix-measure-sub">
                    {MEASURE_ROLES[measure.role].label}
                    {measure.unit ? ` · ${measure.unit}` : ""}
                  </span>
                </th>
              ))}
              <th scope="col" rowSpan={2} className="matrix-done-head">
                <span className="sr-only">Row status</span>
              </th>
            </tr>
            <tr>
              {measures.flatMap((measure) =>
                needsDenominator(measure)
                  ? [
                      <th key={`${measure.id}-n`} scope="col" className="matrix-sub">
                        Numerator
                      </th>,
                      <th key={`${measure.id}-d`} scope="col" className="matrix-sub">
                        Denominator
                      </th>,
                    ]
                  : [
                      <th key={`${measure.id}-v`} scope="col" className="matrix-sub">
                        Value
                      </th>,
                    ],
              )}
            </tr>
          </thead>

          <tbody>
            {periods.length === 0 ? (
              <tr>
                <td colSpan={99} className="matrix-empty">
                  No periods yet. Add one to start entering data.
                </td>
              </tr>
            ) : (
              periods.map((period) => {
                const row = rowCompleteness(measures, observations, period);
                return (
                  <tr
                    key={period}
                    id={`period-${period}`}
                    className={focusPeriod === period ? "is-focused" : ""}
                    onFocus={() => onFocusPeriod?.(period)}
                  >
                    <th scope="row" className="matrix-period">
                      <input
                        type="date"
                        value={period}
                        aria-label={`Period, currently ${shortDate(period)}`}
                        onChange={(e) => movePeriod(period, e.target.value)}
                      />
                    </th>

                    {measures.flatMap((measure) => {
                      const cell = observationAt(observations, measure.id, period);
                      const fields = needsDenominator(measure)
                        ? ["value", "denominator"]
                        : ["value"];

                      return fields.map((field) => (
                        <td key={`${measure.id}-${field}`}>
                          <input
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={cell?.[field] ?? ""}
                            aria-label={`${measure.name}, ${field === "value" ? (needsDenominator(measure) ? "numerator" : "value") : "denominator"}, ${shortDate(period)}`}
                            onChange={(e) =>
                              setCell(measure, period, field, e.target.value)
                            }
                          />
                        </td>
                      ));
                    })}

                    <td className="matrix-done">
                      <span
                        className={`matrix-pip ${row.complete ? "is-complete" : ""}`}
                        title={`${row.filled} of ${row.total} measures entered`}
                      >
                        {row.complete ? (
                          <i className="bi bi-check-lg" aria-hidden="true" />
                        ) : (
                          `${row.filled}/${row.total}`
                        )}
                      </span>
                      <button
                        type="button"
                        className="matrix-remove"
                        aria-label={`Remove the ${shortDate(period)} row`}
                        onClick={() => setConfirmRow(period)}
                      >
                        <i className="bi bi-trash3" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="matrix-privacy">
        <i className="bi bi-shield-lock" aria-hidden="true" /> Aggregate counts
        only — never patient identifiers. Everything you type stays in this
        browser.
      </p>

      {confirmRow && (
        <Modal
          title="Remove this period?"
          onClose={() => setConfirmRow(null)}
          size="sm"
        >
          <p style={{ marginTop: 0 }}>
            Every measure&rsquo;s data point for{" "}
            <strong>{shortDate(confirmRow)}</strong> will be deleted. This
            cannot be undone.
          </p>
          <div
            className="modal-foot"
            style={{ border: 0, padding: 0, marginTop: "1rem" }}
          >
            <button
              type="button"
              className="btn-quiet"
              onClick={() => setConfirmRow(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => removeRow(confirmRow)}
            >
              <i className="bi bi-trash3" aria-hidden="true" /> Remove row
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default DataMatrix;
