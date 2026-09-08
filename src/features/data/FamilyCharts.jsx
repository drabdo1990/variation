import { Link } from "react-router-dom";
import Pill from "../../components/ui/Pill.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import ChartCanvas from "../measures/ChartCanvas.jsx";
import SignalBadge from "../measures/SignalBadge.jsx";
import { MEASURE_ROLES } from "../../data/vocab.js";
import { measureStatus } from "../../lib/metrics.js";
import "./FamilyCharts.css";

/**
 * The measure family, stacked on one shared time axis.
 *
 * Separate charts rather than one overlaid chart, because a percentage and a
 * time in minutes cannot share a y-axis without one of them becoming a flat
 * line. Aligning them vertically gives the comparison anyway — and it is the
 * comparison that matters, since a process measure moving before the outcome
 * is the evidence that the change is what caused it.
 */
function FamilyCharts({
  project,
  measures,
  observations,
  cycles,
  periods,
  hidden,
  onToggle,
  onPointClick,
}) {
  const annotations = cycles
    .filter((c) => c.annotate && c.startDate)
    .map((c) => ({ id: c.id, date: c.startDate, label: `PDSA ${c.number}` }));

  const visible = measures.filter((m) => !hidden.has(m.id));

  const ordered = ["outcome", "process", "balancing"].flatMap((role) =>
    visible.filter((m) => m.role === role),
  );

  return (
    <>
      <div className="family-toggles" role="group" aria-label="Show or hide measures">
        {measures.map((measure) => {
          const on = !hidden.has(measure.id);
          return (
            <button
              type="button"
              key={measure.id}
              className={`family-toggle ${on ? "is-on" : ""} role-${measure.role}`}
              aria-pressed={on}
              onClick={() => onToggle(measure.id)}
            >
              <i
                className={`bi ${on ? "bi-check-square" : "bi-square"}`}
                aria-hidden="true"
              />
              {measure.name}
            </button>
          );
        })}
      </div>

      {ordered.length === 0 ? (
        <EmptyState
          icon="bi-eye-slash"
          title="Every measure is hidden"
          hint="Turn one back on above to see its chart."
        />
      ) : (
        <div className="family-stack">
          {ordered.map((measure) => {
            const { chart, verdict } = measureStatus(measure, observations);
            const role = MEASURE_ROLES[measure.role];

            return (
              <section className="family-item" key={measure.id}>
                <header className="family-head">
                  <div className="family-title">
                    <Link
                      to={`/projects/${project.id}/measures/${measure.id}`}
                      className="family-name"
                    >
                      {measure.name}
                    </Link>
                    <Pill tone={role.tone}>{role.label}</Pill>
                  </div>
                  <SignalBadge status={verdict.status} />
                </header>

                {chart.hasData ? (
                  <ChartCanvas
                    chart={chart}
                    measure={measure}
                    annotations={annotations}
                    sharedPeriods={periods}
                    onPointClick={onPointClick}
                    height={230}
                  />
                ) : (
                  <p className="family-nodata">
                    No data entered for this measure yet — fill a cell in its
                    column above and the chart appears here.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

export default FamilyCharts;
