import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { periodLabel } from "../../lib/format.js";
import { CHART_TYPES } from "../../lib/spc.js";
import "./ChartCanvas.css";

const COLOR = {
  series: "#4f5bd5",
  centre: "#545c78",
  limit: "#9aa2ba",
  goal: "#1f9d76",
  violation: "#d4504a",
  annotation: "#d0891a",
  phase: "#7b849e",
};

/**
 * A point that broke a rule is drawn larger, in a different colour, AND with
 * a ring — colour alone must not be what tells you a point is special.
 */
function PointDot({ cx, cy, payload }) {
  // A padded gap in a shared axis has no coordinates and no value.
  if (cx === undefined || cy === undefined || payload.plotted === null) {
    return null;
  }
  const flagged = payload.violations?.length > 0;

  if (!flagged) {
    return <circle cx={cx} cy={cy} r={3.5} fill={COLOR.series} />;
  }
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="none" stroke={COLOR.violation} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={3.5} fill={COLOR.violation} />
    </g>
  );
}

/** "%" reads better welded on; any other unit needs its space. */
const withUnit = (n, unit) =>
  unit === "%" ? `${n}%` : unit ? `${n} ${unit}` : `${n}`;

function ChartTooltip({ active, payload, measure, cadence }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  // A padded slot on a shared axis carries no reading at all.
  if (!Number.isFinite(point.plotted)) return null;

  return (
    <div className="chart-tip">
      <strong>{periodLabel(point.period, cadence)}</strong>
      <div className="chart-tip-value">
        {withUnit(point.plotted.toFixed(2), measure.unit)}
      </div>
      {point.denominator && (
        <div className="chart-tip-row">
          {point.value} of {point.denominator}
        </div>
      )}
      {Number.isFinite(point.lcl) && Number.isFinite(point.ucl) && (
        <div className="chart-tip-row">
          Limits {point.lcl.toFixed(2)} – {point.ucl.toFixed(2)}
        </div>
      )}
      {point.violations?.length > 0 && (
        <div className="chart-tip-flag">
          <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />{" "}
          {point.violations.join(", ")}
        </div>
      )}
      {point.note && <div className="chart-tip-note">{point.note}</div>}
    </div>
  );
}

/**
 * Renders a run or control chart.
 *
 * Control limits are drawn as stepped lines because p- and u-chart limits
 * change with each period's denominator — drawing them as a smooth line
 * would imply a precision the data does not have.
 */
function ChartCanvas({
  chart,
  measure,
  annotations = [],
  height = 340,
  /**
   * Every period in the project, so several measures stacked above one
   * another share an x-axis and line up. A measure with no reading in a
   * period gets a null, which leaves an honest gap instead of joining
   * across missing data.
   */
  sharedPeriods = null,
  onPointClick,
}) {
  if (!chart.hasData) return null;

  const cadence = measure.cadence ?? "monthly";
  const byPeriod = new Map(chart.points.map((p) => [p.period, p]));

  const data = (sharedPeriods ?? chart.points.map((p) => p.period)).map(
    (period) => byPeriod.get(period) ?? { period, plotted: null, violations: [] },
  );

  /**
   * The x-axis is categorical — one slot per collection period — so a
   * reference line only renders if its value matches a slot exactly. An
   * intervention rarely lands on a collection date, so each annotation is
   * snapped to the nearest period. That is also how it should read: the
   * change took effect around that data point, and by convention the marker
   * sits on the first period its effect could show in.
   *
   * It snaps to the period itself, not to the printed label. Two periods can
   * share a label — thirteen months of data start and end in the same month —
   * and matching on the label would put the marker on the wrong one.
   */
  const snapped = annotations
    .map((a) => {
      const target = new Date(a.date).getTime();
      const nearest = data.reduce((best, p) => {
        const d = Math.abs(new Date(p.period).getTime() - target);
        return d < best.distance ? { period: p.period, distance: d } : best;
      }, { period: null, distance: Infinity });
      return nearest.period ? { ...a, at: nearest.period } : null;
    })
    .filter(Boolean);

  const phases = chart.phases ?? [];

  /*
   * Limits are drawn as a stepped series whenever they move: with each
   * period's denominator on a ratio chart, and at every phase boundary on a
   * re-baselined one. Otherwise they are flat, and a single ReferenceLine is
   * cleaner and lighter. The points already carry their own limits either
   * way, so nothing else has to change.
   */
  const variableLimits =
    CHART_TYPES[chart.chartType]?.plotsAs === "ratio" || phases.length > 1;

  /* Where one set of limits gives way to the next. */
  const boundaries =
    phases.length > 1
      ? phases
          .slice(1)
          .map((phase) => ({
            id: phase.id,
            label: phase.label,
            at: data.find((p) => p.period >= phase.startsAt)?.period ?? null,
          }))
          .filter((b) => b.at)
      : [];
  const isRun = chart.chartType === "run";

  return (
    <div className="chart-canvas">
      <ResponsiveContainer width="100%" height={height}>
        {/* The right margin has to clear the centre-line, limit and goal
            labels, which are anchored to the right edge of the plot. */}
        <ComposedChart
          data={data}
          margin={{ top: 16, right: 56, bottom: 4, left: 0 }}
          onClick={
            onPointClick
              ? (e) => e?.activePayload?.[0] &&
                  onPointClick(e.activePayload[0].payload.period)
              : undefined
          }
          style={onPointClick ? { cursor: "pointer" } : undefined}
        >
          <CartesianGrid stroke="#eef0f5" vertical={false} />
          {/* Keyed on the period, which is unique, and only formatted for
              display — so two periods that print the same never collapse
              into one slot. */}
          <XAxis
            dataKey="period"
            tickFormatter={(period) => periodLabel(period, cadence)}
            tick={{ fontSize: 12, fill: "#545c78" }}
            tickLine={false}
            axisLine={{ stroke: "#e4e7f0" }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#545c78" }}
            tickLine={false}
            axisLine={false}
            width={52}
            label={
              measure.unit
                ? {
                    value: measure.unit,
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12, fill: "#545c78", textAnchor: "middle" },
                  }
                : undefined
            }
          />
          <Tooltip content={<ChartTooltip measure={measure} cadence={cadence} />} />
          <Legend
            iconType="plainline"
            iconSize={14}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (
              <span style={{ color: "var(--c-ink-muted)" }}>{value}</span>
            )}
          />

          {/* Where the measure was re-baselined: everything to the right is
              judged against a different centre line, so the break is drawn
              solid and full-height rather than as another annotation. */}
          {boundaries.map((b) => (
            <ReferenceLine
              key={b.id}
              x={b.at}
              stroke={COLOR.phase}
              strokeWidth={1.5}
              label={{
                value: b.label,
                position: "insideTopRight",
                style: { fontSize: 11, fill: COLOR.phase, fontWeight: 600 },
              }}
            />
          ))}

          {/* Intervention markers — where a PDSA cycle started. */}
          {snapped.map((a) => (
            <ReferenceLine
              key={a.id}
              x={a.at}
              stroke={COLOR.annotation}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: a.label,
                position: "top",
                style: { fontSize: 11, fill: "#7d5106", fontWeight: 600 },
              }}
            />
          ))}

          {/* The target or agreed standard.
              `extendDomain` matters: once a measure improves past its goal
              the goal falls outside the plotted range, and Recharts discards
              an out-of-range reference line without a word — so the line the
              whole chart is judged against silently disappears. */}
          {measure.goal !== null && measure.goal !== undefined && (
            <ReferenceLine
              y={measure.goal}
              ifOverflow="extendDomain"
              stroke={COLOR.goal}
              strokeDasharray="6 4"
              label={{
                value: `Goal ${withUnit(measure.goal, measure.unit)}`,
                position: "right",
                style: { fontSize: 11, fill: "#0f6a4e" },
              }}
            />
          )}

          {/* Centre line: median for a run chart, mean for a control chart. */}
          <ReferenceLine
            y={chart.centre}
            stroke={COLOR.centre}
            strokeWidth={1.5}
            label={{
              value: isRun ? "Median" : "Mean",
              position: "right",
              style: { fontSize: 11, fill: "#545c78" },
            }}
          />

          {!isRun && variableLimits && (
            <>
              <Line
                type="stepAfter"
                dataKey="ucl"
                name="Control limits"
                stroke={COLOR.limit}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
              <Line
                type="stepAfter"
                dataKey="lcl"
                name="Lower limit"
                legendType="none"
                stroke={COLOR.limit}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </>
          )}

          {!isRun && !variableLimits && chart.points[0]?.ucl !== null && (
            <>
              <ReferenceLine
                y={chart.points[0].ucl}
                stroke={COLOR.limit}
                strokeDasharray="5 3"
                label={{
                  value: "UCL",
                  position: "right",
                  style: { fontSize: 11, fill: "#676f8c" },
                }}
              />
              <ReferenceLine
                y={chart.points[0].lcl}
                stroke={COLOR.limit}
                strokeDasharray="5 3"
                label={{
                  value: "LCL",
                  position: "right",
                  style: { fontSize: 11, fill: "#676f8c" },
                }}
              />
            </>
          )}

          <Line
            type="linear"
            dataKey="plotted"
            name={measure.name}
            stroke={COLOR.series}
            strokeWidth={2}
            dot={<PointDot />}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
            /* A period with no reading stays a gap. Joining across it would
               invent data that was never collected. */
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ChartCanvas;
