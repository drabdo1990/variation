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

/**
 * `plotsAs` says what the drawn number *is*, which is what decides whether the
 * denominator divides: "ratio" divides and scales by the multiplier, "count"
 * plots the raw number, "value" plots the number as given. Keeping it here
 * means a new chart type cannot be added without saying how it plots.
 */
export const CHART_TYPES = {
  run: { label: "Run chart", needsDenominator: false, family: "run", plotsAs: "value" },
  xmr: { label: "XmR (individuals)", needsDenominator: false, family: "spc", plotsAs: "value" },
  p: { label: "p-chart (proportion)", needsDenominator: true, family: "spc", plotsAs: "ratio" },
  "p-prime": {
    label: "P′ (Laney, large samples)",
    needsDenominator: true,
    family: "spc",
    plotsAs: "ratio",
  },
  np: { label: "np-chart (count, fixed n)", needsDenominator: true, family: "spc", plotsAs: "count" },
  c: { label: "c-chart (count)", needsDenominator: false, family: "spc", plotsAs: "count" },
  u: { label: "u-chart (rate)", needsDenominator: true, family: "spc", plotsAs: "ratio" },
  "u-prime": {
    label: "U′ (Laney, large samples)",
    needsDenominator: true,
    family: "spc",
    plotsAs: "ratio",
  },
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
 * A "ratio" chart (p, u and their Laney variants) divides by the denominator
 * and scales by the measure's multiplier — 100 for a percentage, 1000 for
 * "per 1000 bed-days". A "count" chart (np, c) plots the raw count. run and
 * xmr plot the value as given, dividing only when a denominator was supplied.
 */
export function plottedValue(observation, measure) {
  const { value, denominator } = observation;
  const multiplier = measure.multiplier ?? 1;
  const plotsAs = CHART_TYPES[measure.chartType]?.plotsAs ?? "value";

  // A cell cleared in the data matrix leaves a row with no numerator. Left
  // unguarded that divides to a plotted zero, which would draw a real data
  // point where there is none — worse than a gap, because it moves the
  // centre line.
  if (value === null || value === undefined || Number.isNaN(value)) return null;

  if (plotsAs === "count") return value;

  if (plotsAs === "ratio") {
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
 * Phases
 * ------------------------------------------------------------------ */

/**
 * The phases a measure is drawn in.
 *
 * Freezing a baseline answers "has anything changed?". Once the answer is yes
 * and the new way of working has become standard practice, those limits have
 * outlived their question: they describe a process that no longer exists, and
 * holding the new one to them reports the same old news at every point. So QI
 * practice re-baselines, and each phase gets its own centre line and limits.
 *
 * The corollary matters as much: no rule may span a boundary. A run of eight
 * points below the old centre line, caused by a change the team made
 * deliberately and has already accounted for, is not a discovery.
 *
 * A measure that has never been split reads as a single phase derived from its
 * `baselineEnd`, so stored state, saved exports and existing charts keep
 * working untouched and no migration is needed.
 */
export function resolvePhases(measure) {
  const declared = Array.isArray(measure.phases) ? measure.phases : [];

  if (declared.length === 0) {
    return [
      {
        id: "phase-1",
        label: "Baseline",
        startsAt: null,
        baselineEnd: measure.baselineEnd ?? null,
      },
    ];
  }

  const key = (phase) => phase.startsAt ?? "";

  return declared
    .map((phase, i) => ({
      id: phase.id ?? `phase-${i + 1}`,
      label: phase.label?.trim() || `Phase ${i + 1}`,
      startsAt: phase.startsAt ?? null,
      baselineEnd: phase.baselineEnd ?? null,
    }))
    .sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0))
    // Whatever the first phase claims, it runs from the beginning: otherwise
    // the earliest observations would fall outside every phase and vanish.
    .map((phase, i) => (i === 0 ? { ...phase, startsAt: null } : phase));
}

/** Split a series so each phase carries the points that fall inside it. */
export function segmentSeries(series, phases) {
  return phases.map((phase, i) => {
    const endsBefore = phases[i + 1]?.startsAt ?? null;
    return {
      phase,
      points: series.filter(
        (p) =>
          (phase.startsAt === null || p.period >= phase.startsAt) &&
          (endsBefore === null || p.period < endsBefore),
      ),
    };
  });
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
 * Laney's correction for overdispersion
 * ------------------------------------------------------------------ */

/**
 * Laney's dispersion factor, sigma-z.
 *
 * A p-chart's limits assume the only variation between periods is binomial —
 * the luck of sampling. Real clinical data also varies because the periods
 * genuinely differ: case mix, staffing, season. At small n the binomial term
 * dominates and nobody notices. At the n of a hospital-wide audit — tens of
 * thousands of admissions — it shrinks to almost nothing, the limits close in
 * on the centre line, and ordinary week-to-week noise is reported as special
 * cause. That is overdispersion.
 *
 * The correction measures how much the subgroups actually disagree. Each
 * baseline point is converted to a z-score against its own *unadjusted*
 * sigma, and sigma-z is then taken from the mean moving range of those
 * z-scores exactly as an XmR chart takes sigma from MR-bar. If the only
 * variation were binomial the z-scores would behave like standard normal
 * values and sigma-z would come out at 1; a sigma-z of 2.4 says the real
 * spread is 2.4 times what the binomial model predicts.
 *
 * @param sigmaAt  the chart's own per-point sigma, before any correction
 */
export function dispersionFactor(baseline, centre, sigmaAt) {
  const z = [];
  for (const point of baseline) {
    const sigma = sigmaAt(point);
    if (sigma === null || !Number.isFinite(sigma) || sigma === 0) continue;
    z.push((point.plotted - centre) / sigma);
  }

  const notEstimated = (mrBar) => ({
    sigmaZ: 1,
    applicable: false,
    count: z.length,
    mrBar,
  });

  if (z.length < 2) return notEstimated(null);

  const movingRanges = z.slice(1).map((v, i) => Math.abs(v - z[i]));
  const mrBar = mean(movingRanges);
  const sigmaZ = mrBar / D2_N2;

  /*
   * A baseline that never moves gives MR-bar = 0 and so sigma-z = 0, which
   * would collapse the limits onto the centre line and flag every point
   * thereafter. There is no dispersion estimate to be had from flat data, so
   * fall back to the uncorrected chart and say so.
   */
  if (!Number.isFinite(sigmaZ) || sigmaZ <= 0) return notEstimated(mrBar);

  return { sigmaZ, applicable: true, count: z.length, mrBar };
}

/**
 * Wrap a p- or u-chart's limits with the dispersion factor, giving P′ or U′.
 *
 * This follows Laney's published method, as Minitab implements it: sigma-z
 * applies unconditionally, so the chart corrects *under*dispersion — limits
 * too wide, hiding real signals — as well as over. P′ therefore differs from
 * P even on well-behaved data, which is the intended behaviour and not a bug.
 */
function laney(base, baseline) {
  const { sigmaZ, applicable, count, mrBar } = dispersionFactor(
    baseline,
    base.centre,
    base.sigma,
  );

  return {
    ...base,
    sigma: (point) => {
      const sigma = base.sigma(point);
      return sigma === null ? null : sigma * sigmaZ;
    },
    sigmaZ,
    dispersionApplicable: applicable,
    zCount: count,
    mrBarZ: mrBar,
  };
}

/**
 * Which builder computes limits for each control chart. A lookup rather than
 * a conditional chain, so adding a chart type is one line and the Laney
 * variants sit visibly next to the charts they correct.
 */
const LIMIT_BUILDERS = {
  xmr: (baseline) => xmrLimits(baseline),
  p: (baseline, measure) => pLimits(baseline, measure),
  "p-prime": (baseline, measure) => laney(pLimits(baseline, measure), baseline),
  np: (baseline) => npLimits(baseline),
  c: (baseline) => cLimits(baseline),
  u: (baseline, measure) => uLimits(baseline, measure),
  "u-prime": (baseline, measure) => laney(uLimits(baseline, measure), baseline),
};

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
 * side of the centre line. Overlapping windows are merged into one span,
 * but only within a side: a stretch above the centre line and a stretch
 * below it are two findings, even where their windows overlap. Merging
 * across sides would report them as one long span and flag every point
 * bridging them.
 */
function detectTwoOfThree(points) {
  const spans = [];

  for (const [dir, side] of [
    [1, "above"],
    [-1, "below"],
  ]) {
    const hits = [];
    for (let i = 2; i < points.length; i += 1) {
      const window = [points[i - 2], points[i - 1], points[i]];
      const beyond = window.filter((p) => {
        if (p.sigma === null || !Number.isFinite(p.sigma)) return false;
        const distance = (p.plotted - p.centre) * dir;
        return distance > 2 * p.sigma;
      });
      if (beyond.length >= 2) hits.push(window.map((p) => p.index));
    }
    for (const indices of mergeSpans(hits)) spans.push({ indices, side });
  }

  return spans.sort((a, b) => a.indices[0] - b.indices[0]);
}

/**
 * Mark each point with the rules it broke, so the renderer can flag a dot
 * without re-deriving anything from the signal list.
 */
function flagViolations(points, signals) {
  const byIndex = new Map(points.map((p) => [p.index, p]));

  for (const signal of signals) {
    for (const i of signal.indices) {
      const point = byIndex.get(i);
      if (point && !point.violations.includes(signal.rule)) {
        point.violations.push(signal.rule);
      }
    }
  }
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
    incomplete: { count: 0, periods: [] },
    phases: [],
    baseline: { frozen: false, count: 0, end: measure.baselineEnd ?? null },
    hasData: false,
  };

  const mine = observations.filter((o) => o.measureId === measure.id);

  /*
   * A row with a numerator but no denominator yet cannot be plotted. It must
   * not take the rest of the chart down with it, though: half-filled rows are
   * the normal state of the data matrix while someone is working through it,
   * and a chart that disappears mid-entry reads as broken rather than as
   * incomplete. So the incomplete periods are named and the rest is drawn.
   */
  const incompletePeriods = spec?.needsDenominator
    ? mine
        .filter(
          (o) =>
            o.value !== null &&
            o.value !== undefined &&
            !Number.isNaN(o.value) &&
            !o.denominator,
        )
        .map((o) => o.period)
        .sort()
    : [];

  // np plots the raw count, so unlike p and u it survives `plottedValue`
  // without a denominator and has to be dropped here instead.
  const series = buildSeries(measure, observations)
    .filter((p) => !spec?.needsDenominator || p.denominator)
    .map((p, index) => ({ ...p, index }));

  const incomplete = { count: incompletePeriods.length, periods: incompletePeriods };

  if (series.length === 0) {
    // Nothing plots at all. If the reason is missing denominators, say so —
    // "no data" would send the user looking for data they have already typed.
    return incompletePeriods.length > 0
      ? { ...empty, warnings: ["missing-denominator"], incomplete }
      : { ...empty, incomplete };
  }

  /*
   * Each phase is computed on its own and the results concatenated. Because
   * every point keeps the global `index` it was given above, and every rule
   * reports the indices of the points it covers, running the rules on one
   * phase's slice yields correct global indices with no offset arithmetic —
   * and, by construction, no rule can reach across a boundary.
   */
  const segments = segmentSeries(series, resolvePhases(measure)).filter(
    (s) => s.points.length > 0,
  );
  const multiPhase = segments.length > 1;

  const warnings = [];
  if (incompletePeriods.length > 0) warnings.push("partial-rows");
  // Limits computed from a handful of points are not worth the confidence
  // their solid lines imply.
  if (multiPhase && segments.some((s) => s.points.length < 8)) {
    warnings.push("short-phase");
  }

  const points = [];
  const signals = [];
  const phases = [];

  /** Name the phase in a signal's label, but only when there is a choice. */
  const named = (phase, label) =>
    multiPhase ? `${label} (${phase.label})` : label;

  /* --- run chart: median only, no limits ------------------------------ */
  if (type === "run") {
    let runs = null;

    for (const segment of segments) {
      const { phase } = segment;
      const { baseline, frozen } = splitBaseline(segment.points, phase.baselineEnd);
      const centre = median(baseline.map((p) => p.plotted));

      const stamped = segment.points.map((p) => ({
        ...p,
        phaseId: phase.id,
        centre,
        sigma: null,
        ucl: null,
        lcl: null,
        violations: [],
      }));
      points.push(...stamped);

      for (const run of detectShift(stamped, centre)) {
        signals.push({
          rule: "shift",
          indices: run,
          phaseId: phase.id,
          label: named(phase, `Shift — ${run.length} points one side of the median`),
        });
      }
      for (const run of detectTrend(stamped)) {
        signals.push({
          rule: "trend",
          indices: run,
          phaseId: phase.id,
          label: named(phase, `Trend — ${run.length} points in one direction`),
        });
      }

      runs = runsTest(stamped, centre);
      if (runs.signal) {
        const expected = runs.expected.toFixed(1);
        signals.push({
          rule: runs.signal,
          indices: [],
          phaseId: phase.id,
          label: named(
            phase,
            runs.signal === "too-few-runs"
              ? `Too few runs (${runs.runs}, expected about ${expected})`
              : `Too many runs (${runs.runs}, expected about ${expected})`,
          ),
        });
      }

      phases.push({
        ...phase,
        centre,
        count: stamped.length,
        baseline: { frozen, count: baseline.length, end: phase.baselineEnd ?? null },
      });
    }

    if (series.length < 12) warnings.push("few-points");
    flagViolations(points, signals);

    return {
      chartType: type,
      points,
      // The last phase is the one the process is in now, so it is what the
      // latest point is judged against.
      centre: phases.at(-1).centre,
      median: phases.at(-1).centre,
      signals,
      warnings: [...new Set(warnings)],
      runsTest: runs,
      incomplete,
      phases,
      baseline: phases[0].baseline,
      hasData: true,
    };
  }

  /* --- control charts -------------------------------------------------- */
  if (type === "np") {
    // Checked per phase, not across the whole series: only the points sharing
    // a set of limits need to share a sample size, and a re-baseline often
    // follows a change in how many cases are audited.
    for (const segment of segments) {
      if (new Set(segment.points.map((p) => p.denominator)).size > 1) {
        return { ...empty, warnings: ["np-needs-constant-denominator"], hasData: false };
      }
    }
  }

  let detail = null;

  for (const segment of segments) {
    const { phase } = segment;
    const { baseline, frozen } = splitBaseline(segment.points, phase.baselineEnd);
    const limits = LIMIT_BUILDERS[type](baseline, measure);
    detail = limits;

    const stamped = segment.points.map((p) => {
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

      return { ...p, phaseId: phase.id, centre, sigma, ucl, lcl, violations: [] };
    });
    points.push(...stamped);

    const beyond = detectBeyondLimits(stamped);
    if (beyond.length) {
      signals.push({
        rule: "beyond-limits",
        indices: beyond,
        phaseId: phase.id,
        label: named(
          phase,
          `${beyond.length} point${beyond.length === 1 ? "" : "s"} outside the control limits`,
        ),
      });
    }
    for (const run of detectShift(stamped, limits.centre, RULES.spcShift)) {
      signals.push({
        rule: "shift",
        indices: run,
        phaseId: phase.id,
        label: named(phase, `Shift — ${run.length} points one side of the centre line`),
      });
    }
    for (const run of detectTrend(stamped, RULES.spcTrend)) {
      signals.push({
        rule: "trend",
        indices: run,
        phaseId: phase.id,
        label: named(phase, `Trend — ${run.length} points in one direction`),
      });
    }
    for (const { indices, side } of detectTwoOfThree(stamped)) {
      signals.push({
        rule: "two-of-three",
        indices,
        side,
        phaseId: phase.id,
        label: named(
          phase,
          `2 of 3 points beyond 2 sigma ${side} the centre line, across ${indices.length} points`,
        ),
      });
    }

    if (baseline.length < 12) warnings.push("few-baseline-points");
    if (limits.lclClamped) warnings.push("lcl-clamped-at-zero");

    // Laney charts only: sigma-z comes from moving ranges, so it is as shaky
    // on a short baseline as any other moving-range estimate — and if it could
    // not be estimated at all, the chart is quietly a plain p- or u-chart.
    if ("sigmaZ" in limits) {
      if (!limits.dispersionApplicable) warnings.push("dispersion-not-estimated");
      else if (limits.zCount < 10) warnings.push("few-points-for-dispersion");
    }

    phases.push({
      ...phase,
      centre: limits.centre,
      count: stamped.length,
      detail: limits,
      baseline: { frozen, count: baseline.length, end: phase.baselineEnd ?? null },
    });
  }

  flagViolations(points, signals);

  return {
    chartType: type,
    points,
    centre: phases.at(-1).centre,
    signals,
    // Warnings name a condition, not an occurrence: repeating "few baseline
    // points" once per phase would be noise.
    warnings: [...new Set(warnings)],
    detail,
    incomplete,
    phases,
    baseline: phases[0].baseline,
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
  // The point's own centre line, not the chart's: with more than one phase
  // they differ, and the latest point must be judged against the process it
  // actually belongs to.
  const above = point.plotted > point.centre;
  const better = measure.direction === "lower" ? !above : above;

  return better
    ? { status: "improving", label: "Improving", tone: "success" }
    : { status: "deteriorating", label: "Deteriorating", tone: "danger" };
}
