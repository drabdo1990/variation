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
import { shortDate } from "../../lib/format.js";
import "./ChartCanvas.css";

const COLOR = {
  series: "#4f5bd5",
  centre: "#545c78",
  limit: "#9aa2ba",
  goal: "#1f9d76",
  violation: "#d4504a",
  annotation: "#d0891a",
};

/**
 * A point that broke a rule is drawn larger, in a different colour, AND with
 * a ring — colour alone must not be what tells you a point is special.
 */
function PointDot({ cx, cy, payload }) {
  if (cx === undefined || cy === undefined) return null;
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

function ChartTooltip({ active, payload, measure }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const unit = measure.unit ? ` ${measure.unit}` : "";

  return (
    <div className="chart-tip">
      <strong>{shortDate(point.period)}</strong>
      <div className="chart-tip-value">
        {point.plotted.toFixed(2)}
        {unit}
      </div>
      {point.denominator && (
        <div className="chart-tip-row">
          {point.value} of {point.denominator}
        </div>
      )}
      {point.ucl !== null && (
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
function ChartCanvas({ chart, measure, annotations = [], height = 340 }) {
  if (!chart.hasData) return null;

  const data = chart.points.map((p) => ({
    ...p,
    label: shortDate(p.period),
  }));

  /**
   * The x-axis is categorical — one slot per collection period — so a
   * reference line only renders if its value matches a slot exactly. An
   * intervention rarely lands on a collection date, so each annotation is
   * snapped to the nearest period. That is also how it should read: the
   * change took effect somewhere around that data point.
   */
  const snapped = annotations
    .map((a) => {
      const target = new Date(a.date).getTime();
      const nearest = chart.points.reduce((best, p) => {
        const d = Math.abs(new Date(p.period).getTime() - target);
        return d < best.distance ? { point: p, distance: d } : best;
      }, { point: null, distance: Infinity });
      return nearest.point ? { ...a, label2: shortDate(nearest.point.period) } : null;
    })
    .filter(Boolean);

  // p- and u-charts have per-point limits; the rest are flat, so a single
  // ReferenceLine is cleaner and lighter than a stepped series.
  const variableLimits = ["p", "u"].includes(chart.chartType);
  const isRun = chart.chartType === "run";

  return (
    <div className="chart-canvas">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#eef0f5" vertical={false} />
          <XAxis
            dataKey="label"
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
          <Tooltip content={<ChartTooltip measure={measure} />} />
          <Legend
            iconType="plainline"
            iconSize={14}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (
              <span style={{ color: "var(--c-ink-muted)" }}>{value}</span>
            )}
          />

          {/* Intervention markers — where a PDSA cycle started. */}
          {snapped.map((a) => (
            <ReferenceLine
              key={a.id}
              x={a.label2}
              stroke={COLOR.annotation}
              strokeDasharray="4 3"
              label={{
                value: a.label,
                position: "top",
                style: { fontSize: 11, fill: "#7d5106" },
              }}
            />
          ))}

          {measure.goal !== null && measure.goal !== undefined && (
            <ReferenceLine
              y={measure.goal}
              stroke={COLOR.goal}
              strokeDasharray="6 4"
              label={{
                value: `Goal ${measure.goal}`,
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
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ChartCanvas;
