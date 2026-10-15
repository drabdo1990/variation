import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Panel from "../../components/ui/Panel.jsx";
import SegmentedControl from "../../components/ui/SegmentedControl.jsx";
import ChartCanvas from "../measures/ChartCanvas.jsx";
import Sparkline from "../measures/Sparkline.jsx";
import SignalBadge from "../measures/SignalBadge.jsx";
import FamilyCharts from "../data/FamilyCharts.jsx";
import { measureStatus, annotationsFor } from "../../lib/metrics.js";
import { collectPeriods } from "../../lib/matrix.js";
import {
  BENCHMARK_PROJECT,
  BENCHMARK_MEASURES,
  BENCHMARK_OBSERVATIONS,
  BENCHMARK_CYCLES,
  CHART_OPTIONS,
  FAMILY_MEASURES,
} from "./fixtures.js";

const muted = { fontSize: "var(--fs-small)", color: "var(--c-ink-muted)" };

/**
 * Reference implementations of each SPC chart type, run through the same
 * `computeChart` pipeline the real screens use. Signals shown here are
 * computed from the data, not hardcoded, so a regression in lib/spc.js
 * shows up on this page.
 */
function BenchmarkPage() {
  const [selected, setSelected] = useState("p");
  const [hidden, setHidden] = useState(() => new Set());

  const option = CHART_OPTIONS.find((o) => o.id === selected);
  const measure = BENCHMARK_MEASURES[selected];

  const { chart, verdict } = useMemo(
    () => measureStatus(measure, BENCHMARK_OBSERVATIONS),
    [measure],
  );

  const annotations = useMemo(() => annotationsFor(BENCHMARK_CYCLES), []);

  const periods = useMemo(
    () => collectPeriods(FAMILY_MEASURES, BENCHMARK_OBSERVATIONS),
    [],
  );

  const toggleMeasure = (id) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const first = chart.points[0];

  return (
    <>
      <PageHeader
        title="Charts & data structures benchmark"
        lede="Reference data for every SPC chart type, computed live by lib/spc.js."
      />

      <div className="stack">
        <Panel title="Chart type" icon="bi-sliders">
          <SegmentedControl
            label="Benchmark chart type"
            options={CHART_OPTIONS.map(({ id, label }) => ({ id, label }))}
            value={selected}
            onChange={setSelected}
          />
        </Panel>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--sp-5)" }}>
          <Panel title={option.title} icon="bi-graph-up">
            <p style={{ ...muted, marginBottom: "var(--sp-4)" }}>{option.description}</p>
            <ChartCanvas
              chart={chart}
              measure={measure}
              annotations={annotations}
            />
          </Panel>

          <Panel title="Summary" icon="bi-clipboard-data">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              <div>
                <span style={muted}>Sparkline</span>
                <div><Sparkline chart={chart} width={220} height={40} /></div>
              </div>

              <div>
                <span style={muted}>Verdict</span>
                <div><SignalBadge status={verdict.status} /></div>
              </div>

              <div>
                <span style={muted}>Signals detected ({chart.signals.length})</span>
                {chart.signals.length === 0 ? (
                  <p>None</p>
                ) : (
                  <ul style={{ margin: "var(--sp-1) 0 0", paddingLeft: "1.1rem" }}>
                    {chart.signals.map((s, i) => (
                      <li key={i}>
                        {s.label} — {s.indices.length} pts
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <span style={muted}>Centre line</span>
                <p style={{ margin: 0 }}>{chart.centre?.toFixed(2) ?? "—"}</p>
              </div>

              {first?.ucl != null && (
                <div>
                  <span style={muted}>Limits (first point)</span>
                  <p style={{ margin: 0 }}>
                    {first.lcl.toFixed(2)} – {first.ucl.toFixed(2)}
                  </p>
                </div>
              )}

              <div>
                <span style={muted}>Data points</span>
                <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
                  {chart.points.length} observations
                </p>
              </div>
            </div>
          </Panel>
        </div>

        <Panel title="Family of measures (outcome / process / balancing)" icon="bi-diagram-3">
          <FamilyCharts
            project={BENCHMARK_PROJECT}
            measures={FAMILY_MEASURES}
            observations={BENCHMARK_OBSERVATIONS}
            cycles={BENCHMARK_CYCLES}
            periods={periods}
            hidden={hidden}
            onToggle={toggleMeasure}
          />
        </Panel>

        <Panel title="Underlying data structure" icon="bi-braces">
          <pre
            style={{
              background: "var(--c-canvas)",
              padding: "var(--sp-4)",
              borderRadius: "var(--r-sm)",
              overflow: "auto",
              fontSize: "var(--fs-small)",
              maxHeight: 260,
              margin: 0,
            }}
          >
            {JSON.stringify(
              BENCHMARK_OBSERVATIONS.filter((o) => o.measureId === measure.id),
              null,
              2,
            )}
          </pre>
        </Panel>
      </div>
    </>
  );
}

export default BenchmarkPage;
