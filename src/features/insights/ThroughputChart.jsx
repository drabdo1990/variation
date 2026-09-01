import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Panel from "../../components/ui/Panel.jsx";
import { axisStyle, tooltipStyle, gridStroke } from "./chartTheme.js";

function ThroughputChart({ data }) {
  return (
    <Panel title="Opened vs closed" icon="bi-bar-chart">
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis dataKey="bucket" {...axisStyle} />
            <YAxis {...axisStyle} />
            <Tooltip cursor={{ fill: "rgba(79,91,213,.06)" }} contentStyle={tooltipStyle} />
            {/* Recharts colours legend labels from the series fill by
                default, which fails contrast for the lighter series.
                The swatch keeps the series colour; the text does not. */}
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
              formatter={(value) => (
                <span style={{ color: "var(--c-ink-muted)" }}>{value}</span>
              )}
            />
            <Bar dataKey="opened" name="Opened" fill="#a5abe8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="closed" name="Closed" fill="#4f5bd5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export default ThroughputChart;
