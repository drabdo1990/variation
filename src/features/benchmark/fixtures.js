/**
 * Reference data for the benchmark page. Shaped exactly like the app's own
 * store (measures, observations, cycles) so the page exercises the same
 * `computeChart` path as every real screen, not a parallel implementation.
 *
 * Phases are not stored on observations: the baseline is whatever falls on
 * or before `measure.baselineEnd`, and everything after is the post-change
 * phase.
 */

export const BENCHMARK_PROJECT = { id: "benchmark", name: "Benchmark fixtures" };

const BASELINE_END = "2026-02-09";

const PERIODS = [
  "2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26", "2026-02-02",
  "2026-02-09", "2026-02-16", "2026-02-23", "2026-03-02", "2026-03-09",
  "2026-03-16", "2026-03-23", "2026-03-30", "2026-04-06",
];

/** Build observations for one measure from [value, denominator?] rows. */
function rows(measureId, data) {
  return data.map(([value, denominator = null], i) => ({
    id: `${measureId}-o${i}`,
    measureId,
    period: PERIODS[i],
    value,
    denominator,
    note: "",
  }));
}

export const BENCHMARK_MEASURES = {
  p: {
    id: "bm-p",
    projectId: BENCHMARK_PROJECT.id,
    name: "Outcome: Unscheduled readmissions",
    role: "outcome",
    chartType: "p",
    unit: "%",
    multiplier: 100,
    direction: "lower",
    goal: null,
    cadence: "weekly",
    baselineEnd: BASELINE_END,
  },
  c: {
    id: "bm-c",
    projectId: BENCHMARK_PROJECT.id,
    name: "Outcome: Incidents per inspection unit",
    role: "outcome",
    chartType: "c",
    unit: "count",
    multiplier: 1,
    direction: "lower",
    goal: null,
    cadence: "weekly",
    baselineEnd: BASELINE_END,
  },
  xmr: {
    id: "bm-xmr",
    projectId: BENCHMARK_PROJECT.id,
    name: "Balancing: Discharge delay (mins)",
    role: "balancing",
    chartType: "xmr",
    unit: "minutes",
    multiplier: 1,
    direction: "lower",
    goal: null,
    cadence: "weekly",
    baselineEnd: BASELINE_END,
  },
  process: {
    id: "bm-process",
    projectId: BENCHMARK_PROJECT.id,
    name: "Process: Checklist completion",
    role: "process",
    chartType: "p",
    unit: "%",
    multiplier: 100,
    direction: "higher",
    goal: 90,
    cadence: "weekly",
    baselineEnd: BASELINE_END,
  },
};

export const BENCHMARK_OBSERVATIONS = [
  // p-chart: [defects, subgroup size n_i]
  ...rows("bm-p", [
    [22, 52], [20, 49], [24, 55], [21, 50], [26, 58], [21, 51],
    [12, 47], [11, 53], [9, 50], [10, 54], [8, 49], [7, 52],
  ]),
  // c-chart: counts per constant inspection unit. Runs two weeks longer than
  // the other fixtures: the Shewhart shift rule needs 8 consecutive points on
  // one side of the centre line, and 6 post-change points cannot form one.
  ...rows("bm-c", [
    [7], [6], [8], [5], [7], [9], [3], [2], [3], [1], [2], [2], [2], [1],
  ]),
  // XmR: individual continuous values
  ...rows("bm-xmr", [
    [45.2], [47.8], [44.1], [46.5], [48.0], [43.9],
    [32.1], [30.5], [28.9], [29.4], [27.8], [28.2],
  ]),
  // Process measure: first six weeks only, as in the draft; completed / audited
  ...rows("bm-process", [
    [13, 20], [17, 25], [14, 20], [17, 20], [23, 25], [19, 20],
  ]),
];

export const BENCHMARK_CYCLES = [
  {
    id: "bm-cycle-1",
    projectId: BENCHMARK_PROJECT.id,
    number: 1,
    title: "Cycle 1",
    startDate: "2026-02-16",
    annotate: true,
  },
];

/** Selector entries for the single-chart view, in display order. */
export const CHART_OPTIONS = [
  {
    id: "p",
    label: "P-Chart (Proportions)",
    title: "P-Chart Benchmark (Proportion of Defects)",
    description:
      "Binomial proportion with variable subgroup size (n_i). Benchmarks dynamic 3-sigma control limits.",
  },
  {
    id: "c",
    label: "C-Chart (Counts)",
    title: "C-Chart Benchmark (Count of Occurrences)",
    description:
      "Poisson distribution for non-conformities per constant inspection unit.",
  },
  {
    id: "xmr",
    label: "I-Chart (Individuals)",
    title: "I-Chart Benchmark (Individual Continuous Values)",
    description:
      "Continuous metrics evaluated using the moving range (MR) between consecutive intervals.",
  },
];

/** Family-of-measures view: outcome / process / balancing, in that order. */
export const FAMILY_MEASURES = [
  BENCHMARK_MEASURES.p,
  BENCHMARK_MEASURES.process,
  BENCHMARK_MEASURES.xmr,
];
