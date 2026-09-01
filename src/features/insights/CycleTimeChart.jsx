import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Panel from "../../components/ui/Panel.jsx";
import { axisStyle, tooltipStyle, gridStroke } from "./chartTheme.js";

function CycleTimeChart({ data }) {
  return (
    <Panel title="Median cycle time" icon="bi-stopwatch">
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="cycleFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f5bd5" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#4f5bd5" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis dataKey="bucket" {...axisStyle} />
            <YAxis {...axisStyle} unit="d" />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [`${value} days`, "Median cycle"]}
            />
            <Area
              type="monotone"
              dataKey="days"
              stroke="#4f5bd5"
              strokeWidth={2.5}
              fill="url(#cycleFill)"
              dot={{ r: 3, fill: "#fff", stroke: "#4f5bd5", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-note">Lower is better — time from first commit to shipped.</p>
    </Panel>
  );
}

export default CycleTimeChart;
