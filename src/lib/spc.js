/**
 * Statistical process control for quality-improvement measures.
 *
 * Pure arithmetic, no dependencies. Every function takes plain data and
 * returns plain data, so the maths can be tested on its own — which it is,
 * in `spc.test.js`, against worked examples.
 *
 * Two things here matter more than the formulas:
 *
 * 1. **Limits are frozen from a baseline.** They are calculated only from
 *    observations up to `measure.baselineEnd` and then extended forward
 *    unchanged. Recalculating across all data lets an improvement drag the
 *    centre line along with it and erase its own evidence.
 *
 * 2. **p- and u-chart limits move with the denominator.** They are wider
 *    when you sampled 20 patients and tighter when you sampled 200, so
 *    limits are per-point, not constant.
 */

/* ------------------------------------------------------------------ *
 * Constants
 * ------------------------------------------------------------------ */

/** d2 for a moving range of n=2 — the bias-correction constant for XmR. */
const D2_N2 = 1.128;

/** 3 / d2. The multiplier on MR-bar that gives 3-sigma limits on an X chart. */
export const XMR_SIGMA_FACTOR = 3 / D2_N2; // 2.6596…

/** D4 for n=2 — the upper-limit multiplier on the moving-range chart. */
export const MR_UCL_FACTOR = 3.267;

/** Rule thresholds, named so they can be read and changed deliberately. */
export const RULES = {
  /** Run chart: consecutive points one side of the median. */
  runShift: 6,
  /** Run chart: consecutive points all rising or all falling. */
  runTrend: 5,
  /** Runs test needs enough data for the normal approximation to hold. */
  runsTestMin: 10,
  /** Shewhart: consecutive points one side of the centre line. */
  spcShift: 8,
  /** Shewhart: consecutive points all rising or all falling. */
  spcTrend: 6,
};

export const CHART_TYPES = {
  run: { label: "Run chart", needsDenominator: false, family: "run" },
  xmr: { label: "XmR (individuals)", needsDenominator: false, family: "spc" },
  p: { label: "p-chart (proportion)", needsDenominator: true, family: "spc" },
  np: { label: "np-chart (count, fixed n)", needsDenominator: true, family: "spc" },
  c: { label: "c-chart (count)", needsDenominator: false, family: "spc" },
  u: { label: "u-chart (rate)", needsDenominator: true, family: "spc" },
};

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function median(xs) {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/**
 * The number actually drawn for an observation.
 *
 * p and u divide by the denominator and scale by the measure's multiplier
 * (100 for a percentage, 1000 for "per 1000 bed-days"). np and c plot the
 * raw count. run and xmr divide only when a denominator was supplied.
 */
export function plottedValue(observation, measure) {
  const { value, denominator } = observation;
  const multiplier = measure.multiplier ?? 1;
  const type = measure.chartType;

  if (type === "np" || type === "c") return value;

  if (type === "p" || type === "u") {
    if (!denominator) return null;
    return (value / denominator) * multiplier;
  }

  // run and xmr
  if (denominator) return (value / denominator) * multiplier;
  return value;
}

/** Observations for a measure, chronological, with the plotted value added. */
export function buildSeries(measure, observations) {
  return observations
    .filter((o) => o.measureId === measure.id)
    .slice()
    .sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0))
    .map((o, index) => ({
      index,
      id: o.id,
      period: o.period,
      value: o.value,
      denominator: o.denominator ?? null,
      note: o.note ?? "",
      plotted: plottedValue(o, measure),
    }))
    .filter((p) => p.plotted !== null && Number.isFinite(p.plotted))
    .map((p, index) => ({ ...p, index }));
}

/**
 * Split a series into the points the limits are calculated from and the rest.
 * With no baselineEnd every point contributes, which is the honest default
 * but should be surfaced in the UI.
 */
export function splitBaseline(series, baselineEnd) {
  if (!baselineEnd) return { baseline: series, frozen: false };
  const baseline = series.filter((p) => p.period <= baselineEnd);
  // Two points is the minimum that yields a moving range; below that the
  // baseline cannot define limits and every point has to contribute.
  if (baseline.length < 2) return { baseline: series, frozen: false };
  return { baseline, frozen: true };
}

/* ------------------------------------------------------------------ *
 * Limit calculation, one function per chart type
 *
 * Each returns { centre, sigmaAt(point) } in *plotted* units, so the rule
 * engine downstream does not care which chart it is looking at.
 * ------------------------------------------------------------------ */

function xmrLimits(baseline) {
  const xs = baseline.map((p) => p.plotted);
  const centre = mean(xs);

  const movingRanges = xs.slice(1).map((x, i) => Math.abs(x - xs[i]));
  const mrBar = movingRanges.length ? mean(movingRanges) : 0;
  const sigma = mrBar / D2_N2;

  // Healthcare measures (times, counts, rates) cannot go below zero, so a
  // negative lower limit is clamped — and the fact is reported, not hidden.
  const nonNegative = xs.every((x) => x >= 0);
  const rawLcl = centre - 3 * sigma;

  return {
    centre,
    sigma: () => sigma,
    lclFloor: nonNegative ? 0 : null,
    lclClamped: nonNegative && rawLcl < 0,
    mrBar,
    movingRanges,
  };
}

function pLimits(baseline, measure) {
  const multiplier = measure.multiplier ?? 100;
  const totalNum = baseline.reduce((a, p) => a + p.value, 0);
  const totalDen = baseline.reduce((a, p) => a + p.denominator, 0);
  const pBar = totalDen ? totalNum / totalDen : 0;

  return {
    centre: pBar * multiplier,
    // Limits widen and narrow with each point's own sample size.
    sigma: (point) =>
      point.denominator
        ? Math.sqrt((pBar * (1 - pBar)) / point.denominator) * multiplier
        : null,
    lclFloor: 0,
    ceiling: multiplier, // a proportion cannot exceed 100%
    pBar,
  };
}

function npLimits(baseline) {
  const totalNum = baseline.reduce((a, p) => a + p.value, 0);
  const totalDen = baseline.reduce((a, p) => a + p.denominator, 0);
  const pBar = totalDen ? totalNum / totalDen : 0;
  const n = baseline[0]?.denominator ?? 0;

  return {
    centre: n * pBar,
    sigma: () => Math.sqrt(n * pBar * (1 - pBar)),
    lclFloor: 0,
    ceiling: n,
    pBar,
    n,
  };
}

function cLimits(baseline) {
  const cBar = mean(baseline.map((p) => p.plotted));
  return {
    centre: cBar,
    sigma: () => Math.sqrt(cBar),
    lclFloor: 0,
    cBar,
  };
}

function uLimits(baseline, measure) {
  const multiplier = measure.multiplier ?? 1;
  const totalEvents = baseline.reduce((a, p) => a + p.value, 0);
  const totalExposure = baseline.reduce((a, p) => a + p.denominator, 0);
  const uBar = totalExposure ? totalEvents / totalExposure : 0;

  return {
    centre: uBar * multiplier,
    sigma: (point) =>
      point.denominator
        ? Math.sqrt(uBar / point.denominator) * multiplier
        : null,
    lclFloor: 0,
    uBar,
  };
}

/* ------------------------------------------------------------------ *
 * Run-chart rules (median based, non-parametric)
 * ------------------------------------------------------------------ */

/**
 * Rule 1 — a shift: `RULES.runShift` or more consecutive points on the same
 * side of the median. Points sitting exactly on the median are skipped: they
 * neither count towards a run nor break one.
 */
export function detectShift(series, centre, threshold = RULES.runShift) {
  const hits = [];
  let run = [];
  let side = null;

  for (const point of series) {
    if (point.plotted === centre) continue; // on the line — ignored
    const thisSide = point.plotted > centre ? "above" : "below";
    if (thisSide === side) {
      run.push(point.index);
    } else {
      if (run.length >= threshold) hits.push([...run]);
      side = thisSide;
      run = [point.index];
    }
  }
  if (run.length >= threshold) hits.push([...run]);

  return hits;
}

/**
 * Rule 2 — a trend: `RULES.runTrend` or more consecutive points all rising or
 * all falling. Equal consecutive values are ignored — they neither make nor
 * break a trend.
 */
export function detectTrend(series, threshold = RULES.runTrend) {
  const hits = [];
  let run = [];
  let direction = null;

  for (let i = 1; i < series.length; i += 1) {
    const prev = series[i - 1].plotted;
    const curr = series[i].plotted;
    if (curr === prev) continue; // tie — skip, do not break

    const thisDirection = curr > prev ? "up" : "down";
    if (thisDirection === direction) {
      run.push(series[i].index);
    } else {
      if (run.length >= threshold) hits.push([...run]);
      direction = thisDirection;
      run = [series[i - 1].index, series[i].index];
    }
  }
  if (run.length >= threshold) hits.push([...run]);

  return hits;
}

/**
 * Rule 3 — too few or too many runs.
 *
 * A "run" is an unbroken stretch of points on one side of the median. Too
 * few suggests a shift; too many suggests the data is not independent. This
 * is the Wald–Wolfowitz runs test under its normal approximation, which is
 * what the published run-chart lookup tables tabulate. It needs a reasonable
 * number of points, so it is skipped below `RULES.runsTestMin`.
 */
export function runsTest(series, centre) {
  const useful = series.filter((p) => p.plotted !== centre);
  const n1 = useful.filter((p) => p.plotted > centre).length;
  const n2 = useful.length - n1;

  if (useful.length < RULES.runsTestMin || n1 === 0 || n2 === 0) {
    return { applicable: false, runs: null, expected: null, z: null, signal: null };
  }

  let runs = 1;
  for (let i = 1; i < useful.length; i += 1) {
    const a = useful[i - 1].plotted > centre;
    const b = useful[i].plotted > centre;
    if (a !== b) runs += 1;
  }

  const n = n1 + n2;
  const expected = (2 * n1 * n2) / n + 1;
  const variance =
    (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n * n * (n - 1));
  const sd = Math.sqrt(variance);
  const z = sd > 0 ? (runs - expected) / sd : 0;

  let signal = null;
  if (z < -1.96) signal = "too-few-runs";
  else if (z > 1.96) signal = "too-many-runs";

  return { applicable: true, runs, expected, z, signal, n1, n2 };
}

/* ------------------------------------------------------------------ *
 * Shewhart rules
 * ------------------------------------------------------------------ */

/** Rule 1 — any point outside the 3-sigma limits. */
function detectBeyondLimits(points) {
  return points
    .filter(
      (p) =>
        (p.ucl !== null && p.plotted > p.ucl) ||
        (p.lcl !== null && p.plotted < p.lcl),
    )
    .map((p) => p.index);
}

/**
 * Merge overlapping index windows into contiguous spans.
 *
 * The 2-of-3 rule slides a three-point window along the series, so a long
 * stretch beyond 2 sigma fires it on every step. Reporting each window
 * separately would bury one finding under twenty near-identical rows.
 */
export function mergeSpans(windows) {
  if (windows.length === 0) return [];

  const spans = windows
    .map((w) => [Math.min(...w), Math.max(...w)])
    .sort((a, b) => a[0] - b[0]);

  const merged = [spans[0]];
  for (const [start, end] of spans.slice(1)) {
    const last = merged[merged.length - 1];
    if (start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  return merged.map(([s, e]) =>
    Array.from({ length: e - s + 1 }, (_, i) => s + i),
  );
}

/**
 * Rule 4 — two out of three consecutive points beyond 2 sigma on the same
 * side of the centre line. Overlapping windows are merged into one span.
 */
function detectTwoOfThree(points) {
  const hits = [];
  for (let i = 2; i < points.length; i += 1) {
    const window = [points[i - 2], points[i - 1], points[i]];
    for (const dir of [1, -1]) {
      const beyond = window.filter((p) => {
        if (p.sigma === null || !Number.isFinite(p.sigma)) return false;
        const distance = (p.plotted - p.centre) * dir;
        return distance > 2 * p.sigma;
      });
      if (beyond.length >= 2) hits.push(window.map((p) => p.index));
    }
  }
  return mergeSpans(hits);
}

/* ------------------------------------------------------------------ *
 * The public entry point
 * ------------------------------------------------------------------ */

/**
 * Build everything a chart needs: plotted points with their limits, the
 * centre line, and every rule violation with the exact indices it covers.
 *
 * @param measure  { chartType, multiplier, baselineEnd, goal, direction }
 * @param observations  all observations in the store (filtered by measureId)
 */
export function computeChart(measure, observations) {
  const type = measure.chartType ?? "run";
  const spec = CHART_TYPES[type];

  const empty = {
    chartType: type,
    points: [],
    centre: null,
    signals: [],
    warnings: [],
    baseline: { frozen: false, count: 0, end: measure.baselineEnd ?? null },
    hasData: false,
  };

  // Check the raw observations before plotting: a p- or u-chart observation
  // with no denominator plots as null and would silently vanish from the
  // series, leaving "no data" where the real answer is "no denominator".
  const mine = observations.filter((o) => o.measureId === measure.id);
  if (mine.length > 0 && spec?.needsDenominator && mine.some((o) => !o.denominator)) {
    return { ...empty, warnings: ["missing-denominator"] };
  }

  const series = buildSeries(measure, observations);
  if (series.length === 0) return empty;

  const { baseline, frozen } = splitBaseline(series, measure.baselineEnd);
  const warnings = [];

  /* --- run chart: median only, no limits ------------------------------ */
  if (type === "run") {
    const centre = median(baseline.map((p) => p.plotted));
    const points = series.map((p) => ({
      ...p,
      centre,
      sigma: null,
      ucl: null,
      lcl: null,
      violations: [],
    }));

    const signals = [];
    for (const run of detectShift(points, centre)) {
      signals.push({ rule: "shift", indices: run, label: `Shift — ${run.length} points one side of the median` });
    }
    for (const run of detectTrend(points)) {
      signals.push({ rule: "trend", indices: run, label: `Trend — ${run.length} points in one direction` });
    }
    const runs = runsTest(points, centre);
    if (runs.signal) {
      signals.push({
        rule: runs.signal,
        indices: [],
        label:
          runs.signal === "too-few-runs"
            ? `Too few runs (${runs.runs}, expected about ${runs.expected.toFixed(1)})`
            : `Too many runs (${runs.runs}, expected about ${runs.expected.toFixed(1)})`,
      });
    }
    if (series.length < 12) warnings.push("few-points");

    for (const signal of signals) {
      for (const i of signal.indices) {
        const point = points.find((p) => p.index === i);
        if (point && !point.violations.includes(signal.rule)) {
          point.violations.push(signal.rule);
        }
      }
    }

    return {
      chartType: type,
      points,
      centre,
      median: centre,
      signals,
      warnings,
      runsTest: runs,
      baseline: { frozen, count: baseline.length, end: measure.baselineEnd ?? null },
      hasData: true,
    };
  }

  /* --- control charts -------------------------------------------------- */
  if (spec?.needsDenominator && baseline.some((p) => !p.denominator)) {
    return { ...empty, warnings: ["missing-denominator"], hasData: false };
  }
  if (type === "np") {
    const denominators = new Set(series.map((p) => p.denominator));
    if (denominators.size > 1) {
      return { ...empty, warnings: ["np-needs-constant-denominator"], hasData: false };
    }
  }

  const limits =
    type === "xmr"
      ? xmrLimits(baseline)
      : type === "p"
        ? pLimits(baseline, measure)
        : type === "np"
          ? npLimits(baseline)
          : type === "c"
            ? cLimits(baseline)
            : uLimits(baseline, measure);

  const points = series.map((p) => {
    const sigma = limits.sigma(p);
    const centre = limits.centre;
    let ucl = sigma === null ? null : centre + 3 * sigma;
    let lcl = sigma === null ? null : centre - 3 * sigma;

    if (lcl !== null && limits.lclFloor !== null && limits.lclFloor !== undefined) {
      lcl = Math.max(limits.lclFloor, lcl);
    }
    if (ucl !== null && limits.ceiling !== undefined) {
      ucl = clamp(ucl, 0, limits.ceiling);
    }

    return { ...p, centre, sigma, ucl, lcl, violations: [] };
  });

  const signals = [];

  const beyond = detectBeyondLimits(points);
  if (beyond.length) {
    signals.push({ rule: "beyond-limits", indices: beyond, label: `${beyond.length} point${beyond.length === 1 ? "" : "s"} outside the control limits` });
  }
  for (const run of detectShift(points, limits.centre, RULES.spcShift)) {
    signals.push({ rule: "shift", indices: run, label: `Shift — ${run.length} points one side of the centre line` });
  }
  for (const run of detectTrend(points, RULES.spcTrend)) {
    signals.push({ rule: "trend", indices: run, label: `Trend — ${run.length} points in one direction` });
  }
  for (const span of detectTwoOfThree(points)) {
    signals.push({
      rule: "two-of-three",
      indices: span,
      label: `2 of 3 points beyond 2 sigma, across ${span.length} points`,
    });
  }

  for (const signal of signals) {
    for (const i of signal.indices) {
      const point = points.find((p) => p.index === i);
      if (point && !point.violations.includes(signal.rule)) {
        point.violations.push(signal.rule);
      }
    }
  }

  if (baseline.length < 12) warnings.push("few-baseline-points");
  if (limits.lclClamped) warnings.push("lcl-clamped-at-zero");

  return {
    chartType: type,
    points,
    centre: limits.centre,
    signals,
    warnings,
    detail: limits,
    baseline: { frozen, count: baseline.length, end: measure.baselineEnd ?? null },
    hasData: true,
  };
}

/**
 * Turn raw signals into a verdict, using the measure's direction to decide
 * whether a shift is good news or bad. A shift below the centre line is an
 * improvement for "lower is better" and a deterioration for "higher".
 */
export function interpretChart(chart, measure) {
  if (!chart.hasData || chart.points.length === 0) {
    return { status: "no-data", label: "No data yet", tone: "neutral" };
  }
  if (chart.points.length < 10) {
    return {
      status: "insufficient",
      label: "Collecting data",
      tone: "neutral",
      detail: `${chart.points.length} of about 10 points needed before signals mean much`,
    };
  }
  if (chart.signals.length === 0) {
    return { status: "stable", label: "No signal", tone: "neutral" };
  }

  /*
   * Only a signal that reaches the most recent data point describes where
   * the process is *now*. Judging by the latest flagged point across all
   * signals gets this backwards: a series that ran high for a year and has
   * just come down would be read off its old high period and reported as
   * deteriorating, which is the opposite of the truth.
   */
  const lastIndex = chart.points.at(-1).index;
  const current = chart.signals.filter((s) => s.indices.includes(lastIndex));

  if (current.length === 0) {
    return {
      status: "past-signal",
      label: "Past signal",
      tone: "warning",
      detail: "Something changed earlier in the series, but the latest point is not part of it.",
    };
  }

  const point = chart.points.at(-1);
  const above = point.plotted > chart.centre;
  const better = measure.direction === "lower" ? !above : above;

  return better
    ? { status: "improving", label: "Improving", tone: "success" }
    : { status: "deteriorating", label: "Deteriorating", tone: "danger" };
}
