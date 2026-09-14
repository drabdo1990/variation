/**
 * The tables a clinical team exports.
 *
 * Two, because they answer different questions. The observation table is the
 * raw record — what was collected, when, by whom it can be checked. The chart
 * table is the one that goes in a governance report: every plotted point with
 * the centre line and limits it was judged against, so a reader can see how a
 * conclusion was reached without rerunning the analysis.
 */

import { CHART_TYPES, plottedValue } from "./spc.js";
import { MEASURE_ROLES } from "../data/vocab.js";

/** Trim floating-point noise without pretending to a precision we lack. */
const tidy = (x) =>
  x === null || x === undefined || !Number.isFinite(x)
    ? null
    : Math.round(x * 1e6) / 1e6;

/** A filename stem from a project or measure name. */
export function fileStem(name) {
  return (
    name
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "export"
  );
}

export const OBSERVATION_COLUMNS = [
  { key: "project", label: "Project" },
  { key: "measure", label: "Measure" },
  { key: "role", label: "Role" },
  { key: "chart", label: "Chart" },
  { key: "period", label: "Period" },
  { key: "value", label: "Value" },
  { key: "denominator", label: "Denominator" },
  { key: "plotted", label: "Plotted" },
  { key: "unit", label: "Unit" },
  { key: "note", label: "Note" },
];

/** Every observation in a project, one row each, ready for `toCsv`. */
export function observationRows(state, projectId) {
  const project = state.projects.find((p) => p.id === projectId);
  const measures = state.measures.filter((m) => m.projectId === projectId);
  const byId = new Map(measures.map((m) => [m.id, m]));
  const order = new Map(measures.map((m, i) => [m.id, i]));

  return state.observations
    .filter((o) => byId.has(o.measureId))
    .slice()
    .sort(
      (a, b) =>
        order.get(a.measureId) - order.get(b.measureId) ||
        (a.period < b.period ? -1 : a.period > b.period ? 1 : 0),
    )
    .map((o) => {
      const measure = byId.get(o.measureId);
      return {
        project: project?.name ?? "",
        measure: measure.name,
        role: MEASURE_ROLES[measure.role]?.label ?? measure.role,
        chart: CHART_TYPES[measure.chartType]?.label ?? measure.chartType,
        period: o.period,
        value: o.value ?? null,
        denominator: o.denominator ?? null,
        plotted: tidy(plottedValue(o, measure)),
        unit: measure.unit ?? "",
        note: o.note ?? "",
      };
    });
}

export const CHART_COLUMNS = [
  { key: "phase", label: "Phase" },
  { key: "period", label: "Period" },
  { key: "value", label: "Value" },
  { key: "denominator", label: "Denominator" },
  { key: "plotted", label: "Plotted" },
  { key: "centre", label: "Centre" },
  { key: "lcl", label: "LCL" },
  { key: "ucl", label: "UCL" },
  { key: "sigma", label: "Sigma" },
  { key: "violations", label: "Rules broken" },
  { key: "note", label: "Note" },
];

/** A computed chart as a table: each point beside the limits it was judged by. */
export function chartRows(chart) {
  if (!chart.hasData) return [];

  // Named, not just identified: a reader of the exported table needs to see
  // which stretch of the chart each set of limits belongs to.
  const phaseLabel = new Map((chart.phases ?? []).map((p) => [p.id, p.label]));

  return chart.points.map((point) => ({
    phase: phaseLabel.get(point.phaseId) ?? "",
    period: point.period,
    value: point.value ?? null,
    denominator: point.denominator ?? null,
    plotted: tidy(point.plotted),
    centre: tidy(point.centre),
    lcl: tidy(point.lcl),
    ucl: tidy(point.ucl),
    sigma: tidy(point.sigma),
    violations: point.violations.join("; "),
    note: point.note ?? "",
  }));
}
