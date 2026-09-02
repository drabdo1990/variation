import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Panel from "../../components/ui/Panel.jsx";
import Pill from "../../components/ui/Pill.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import ChartCanvas from "./ChartCanvas.jsx";
import ObservationTable from "./ObservationTable.jsx";
import MeasureForm from "./MeasureForm.jsx";
import SignalBadge from "./SignalBadge.jsx";
import { MEASURE_ROLES, CHART_GUIDE } from "../../data/vocab.js";
import { CHART_TYPES } from "../../lib/spc.js";
import { measureStatus, observationsOf, cyclesOf } from "../../lib/metrics.js";
import { shortDate } from "../../lib/format.js";
import { useAppState } from "../../store/context.js";

const WARNINGS = {
  "few-points":
    "Fewer than 12 points. The run rules need roughly 10 to 12 before they mean much.",
  "few-baseline-points":
    "The baseline has fewer than 12 points, so the limits are wider and less certain than they look.",
  "lcl-clamped-at-zero":
    "The calculated lower limit fell below zero and has been held at zero, because this measure cannot be negative.",
  "missing-denominator":
    "This chart needs a denominator on every data point. Add one, or switch the measure to a chart that does not need one.",
  "np-needs-constant-denominator":
    "An np-chart needs exactly the same sample size every period. Your denominators vary — use a p-chart instead.",
};

const RULE_LABELS = {
  shift: "Shift",
  trend: "Trend",
  "beyond-limits": "Outside the limits",
  "two-of-three": "2 of 3 beyond 2 sigma",
  "too-few-runs": "Too few runs",
  "too-many-runs": "Too many runs",
};

function MeasureDetailPage() {
  const { projectId, measureId } = useParams();
  const { projects, measures, observations, cycles } = useAppState();
  const [editing, setEditing] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const measure = measures.find((m) => m.id === measureId);

  if (!project || !measure) {
    return (
      <EmptyState
        icon="bi-question-circle"
        title="Measure not found"
        hint="It may have been deleted."
        action={
          <Link to="/projects" className="btn-primary">
            Back to projects
          </Link>
        }
      />
    );
  }

  const mine = observationsOf(observations, measure.id);
  const { chart, verdict } = measureStatus(measure, observations);
  const role = MEASURE_ROLES[measure.role];
  const chartLabel = CHART_TYPES[measure.chartType]?.label ?? measure.chartType;

  // PDSA cycles flagged for annotation become vertical markers on the chart.
  const annotations = cyclesOf(cycles, project.id)
    .filter((c) => c.annotate && c.startDate)
    .map((c) => ({ id: c.id, date: c.startDate, label: `PDSA ${c.number}` }));

  return (
    <>
      <PageHeader
        title={measure.name}
        lede={
          <>
            <Link to={`/projects/${project.id}`} className="crumb">
              {project.name}
            </Link>{" "}
            · {role.label} measure · {chartLabel}
          </>
        }
      >
        <button type="button" className="btn-quiet" onClick={() => setEditing(true)}>
          <i className="bi bi-sliders" aria-hidden="true" /> Chart settings
        </button>
      </PageHeader>

      <div className="stack">
        <Panel
          title="Chart"
          icon="bi-graph-up"
          action={<SignalBadge status={verdict.status} />}
        >
          {!chart.hasData ? (
            <EmptyState
              icon="bi-graph-up"
              title="Nothing to plot yet"
              hint={
                chart.warnings.length
                  ? WARNINGS[chart.warnings[0]]
                  : "Add data points below and the chart will build itself."
              }
            />
          ) : (
            <>
              <ChartCanvas
                chart={chart}
                measure={measure}
                annotations={annotations}
              />

              <dl className="chart-meta">
                <div>
                  <dt>{chart.chartType === "run" ? "Median" : "Centre"}</dt>
                  <dd>{chart.centre.toFixed(2)}</dd>
                </div>
                {chart.points[0]?.ucl !== null && (
                  <div>
                    <dt>Limits</dt>
                    <dd>
                      {chart.points[0].lcl.toFixed(2)} –{" "}
                      {chart.points[0].ucl.toFixed(2)}
                      {["p", "u"].includes(chart.chartType) && " (first point)"}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Baseline</dt>
                  <dd>
                    {chart.baseline.frozen
                      ? `${chart.baseline.count} points to ${shortDate(chart.baseline.end)}, held fixed`
                      : `all ${chart.points.length} points`}
                  </dd>
                </div>
                <div>
                  <dt>Points</dt>
                  <dd>{chart.points.length}</dd>
                </div>
              </dl>

              {chart.warnings.map((w) => (
                <p className="chart-warning" key={w}>
                  <i className="bi bi-info-circle-fill" aria-hidden="true" />
                  {WARNINGS[w] ?? w}
                </p>
              ))}
            </>
          )}
        </Panel>

        {chart.hasData && (
          <Panel title="Signals" icon="bi-broadcast-pin">
            {chart.signals.length === 0 ? (
              <EmptyState
                icon="bi-check2-circle"
                title="No signals"
                hint="Every point is consistent with ordinary variation — nothing here says the process has changed."
              />
            ) : (
              <ul className="signal-list">
                {chart.signals.map((signal, i) => (
                  <li className="signal-row" key={`${signal.rule}-${i}`}>
                    <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                    <div className="signal-row-body">
                      <strong>{RULE_LABELS[signal.rule] ?? signal.rule}</strong>
                      <span>{signal.label}</span>
                      {signal.indices.length > 0 && (
                        <span>
                          {" "}
                          — {shortDate(chart.points[signal.indices[0]].period)} to{" "}
                          {shortDate(
                            chart.points[signal.indices.at(-1)].period,
                          )}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {chart.chartType === "run" && chart.runsTest?.applicable && (
              <p className="chart-meta" style={{ borderTop: 0, marginTop: 0 }}>
                <span>
                  {chart.runsTest.runs} runs observed, about{" "}
                  {chart.runsTest.expected.toFixed(1)} expected by chance.
                </span>
              </p>
            )}
          </Panel>
        )}

        <Panel>
          <ObservationTable measure={measure} observations={mine} />
        </Panel>

        <Panel title="About this chart" icon="bi-book">
          <p className="about-chart">
            {CHART_GUIDE.find((g) => g.id === measure.chartType)?.detail}
          </p>
          <p className="about-chart">
            {measure.chartType === "run" ? (
              <>
                A run chart uses the <strong>median</strong> and makes no
                assumption about how the data is distributed. Signals are a
                shift of 6 points one side of the median, a trend of 5 points
                in one direction, or an unusual number of runs.
              </>
            ) : (
              <>
                A control chart uses the <strong>mean</strong> and 3-sigma
                limits. Signals are a point outside the limits, 8 points one
                side of the centre, 6 points trending, or 2 of 3 points beyond
                2 sigma.
              </>
            )}
          </p>
          <p className="about-chart">
            <Pill tone="neutral">{chartLabel}</Pill>
          </p>
        </Panel>
      </div>

      {editing && (
        <MeasureForm
          measure={measure}
          projectId={project.id}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

export default MeasureDetailPage;
