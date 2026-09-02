import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import Panel from "../../components/ui/Panel.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { phaseCounts } from "../../lib/metrics.js";
import { PROJECT_PHASES } from "../../data/vocab.js";
import "./PhaseMix.css";

/**
 * One colour per phase rather than per tone — several phases share a tone
 * (both "baseline" and "implementing" read as primary), and two slices of
 * the same colour in one pie would be unreadable.
 */
const PHASE_COLOR = {
  planning: "#9aa2ba",
  baseline: "#6f7ae0",
  testing: "#d0891a",
  implementing: "#3f49b8",
  sustaining: "#1f9d76",
  closed: "#0f6a4e",
  paused: "#d4504a",
};

function PhaseMix({ projects }) {
  const counts = phaseCounts(projects);
  const slices = Object.entries(PROJECT_PHASES)
    .map(([key, meta]) => ({
      key,
      name: meta.label,
      value: counts.get(key) ?? 0,
      color: PHASE_COLOR[key],
    }))
    .filter((slice) => slice.value > 0);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return (
      <Panel title="Portfolio mix" icon="bi-pie-chart">
        <EmptyState
          icon="bi-pie-chart"
          title="No projects yet"
          hint="Once you add projects, their phase breakdown appears here."
        />
      </Panel>
    );
  }

  return (
    <Panel title="Portfolio mix" icon="bi-pie-chart">
      <div className="mix-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `${value} ${value === 1 ? "project" : "projects"}`,
                name,
              ]}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e4e7f0",
                fontSize: 13,
                boxShadow: "0 8px 24px rgba(28,35,64,.12)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mix-center">
          <strong>{total}</strong>
          <span>{total === 1 ? "project" : "projects"}</span>
        </div>
      </div>

      <ul className="mix-legend">
        {slices.map((slice) => (
          <li key={slice.key}>
            <span className="mix-dot" style={{ background: slice.color }} />
            <span className="mix-name">{slice.name}</span>
            <span className="mix-count">{slice.value}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default PhaseMix;
