import { describe, it, expect } from "vitest";
import {
  computeChart,
  detectShift,
  detectTrend,
  runsTest,
  median,
  buildSeries,
  mergeSpans,
  interpretChart,
  resolvePhases,
  XMR_SIGMA_FACTOR,
} from "./spc.js";

/**
 * Every expected centre line and limit below was computed independently from
 * the published formula and is written out in the comment above the case, so
 * a failure points at the arithmetic rather than at a magic number.
 */

/** Build observations for a measure from bare values or [value, denominator]. */
function obs(rows, measureId = "m1") {
  return rows.map((row, i) => {
    const [value, denominator] = Array.isArray(row) ? row : [row, null];
    // Sequential ISO dates so ordering and baseline slicing are unambiguous.
    const day = String(i + 1).padStart(2, "0");
    return {
      id: `o${i}`,
      measureId,
      period: `2026-01-${day}`,
      value,
      denominator,
      note: "",
    };
  });
}

const measure = (over = {}) => ({
  id: "m1",
  chartType: "run",
  multiplier: 1,
  direction: "lower",
  baselineEnd: null,
  goal: null,
  ...over,
});

/* ==================================================================== *
 * Helpers
 * ==================================================================== */

describe("median", () => {
  it("averages the middle pair for an even count", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it("takes the middle value for an odd count", () => {
    expect(median([3, 1, 2])).toBe(2);
  });
  it("is null for no data", () => {
    expect(median([])).toBeNull();
  });
});

describe("buildSeries", () => {
  it("sorts by period and reindexes", () => {
    const measureId = "m1";
    const out = buildSeries(measure(), [
      { id: "b", measureId, period: "2026-02-01", value: 2, denominator: null },
      { id: "a", measureId, period: "2026-01-01", value: 1, denominator: null },
    ]);
    expect(out.map((p) => p.value)).toEqual([1, 2]);
    expect(out.map((p) => p.index)).toEqual([0, 1]);
  });

  it("ignores observations belonging to another measure", () => {
    const out = buildSeries(measure(), [
      ...obs([1, 2], "m1"),
      ...obs([99], "other"),
    ]);
    expect(out).toHaveLength(2);
  });
});

/* ==================================================================== *
 * XmR
 * ==================================================================== */

describe("XmR chart", () => {
  // values: 10 12 11 13 12 14 13 15 14 16 15 17
  // x-bar    = 162 / 12          = 13.5
  // moving ranges 2 1 2 1 2 1 2 1 2 1 2  -> sum 17 over 11 -> MRbar = 1.545454…
  // sigma    = MRbar / 1.128     = 1.370084…
  // UCL      = 13.5 + 3*sigma    = 17.610251…
  // LCL      = 13.5 - 3*sigma    =  9.389748…
  const values = [10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17];

  it("computes the centre line and 3-sigma limits", () => {
    const chart = computeChart(measure({ chartType: "xmr" }), obs(values));
    expect(chart.centre).toBeCloseTo(13.5, 10);
    expect(chart.detail.mrBar).toBeCloseTo(17 / 11, 10);
    expect(chart.points[0].ucl).toBeCloseTo(17.610251, 5);
    expect(chart.points[0].lcl).toBeCloseTo(9.389748, 5);
  });

  it("uses 3/d2 = 2.66 as the sigma factor", () => {
    expect(XMR_SIGMA_FACTOR).toBeCloseTo(2.6595744, 6);
  });

  it("holds limits constant across every point", () => {
    const chart = computeChart(measure({ chartType: "xmr" }), obs(values));
    const uniqueUcl = new Set(chart.points.map((p) => p.ucl.toFixed(9)));
    expect(uniqueUcl.size).toBe(1);
  });

  it("finds no signal in stable data", () => {
    const chart = computeChart(measure({ chartType: "xmr" }), obs(values));
    expect(chart.signals).toEqual([]);
  });

  it("clamps a negative lower limit at zero and says so", () => {
    // 1 9 1 9 … gives a huge moving range, so the raw LCL is well below zero.
    const chart = computeChart(
      measure({ chartType: "xmr" }),
      obs([1, 9, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9]),
    );
    expect(chart.points[0].lcl).toBe(0);
    expect(chart.warnings).toContain("lcl-clamped-at-zero");
  });
});

/* ==================================================================== *
 * p-chart
 * ==================================================================== */

describe("p-chart", () => {
  // 12 samples of n=100, numerators summing to 300
  // p-bar = 300 / 1200 = 0.25 -> centre 25%
  // sigma = sqrt(.25*.75/100) = 0.0433013 -> 4.33013%
  // UCL   = 25 + 3*4.33013 = 37.990381
  // LCL   = 25 - 3*4.33013 = 12.009619
  const rows = [
    [20, 100], [25, 100], [30, 100], [22, 100], [28, 100], [24, 100],
    [26, 100], [23, 100], [27, 100], [21, 100], [29, 100], [25, 100],
  ];

  it("computes p-bar and limits as percentages", () => {
    const chart = computeChart(
      measure({ chartType: "p", multiplier: 100 }),
      obs(rows),
    );
    expect(chart.centre).toBeCloseTo(25, 10);
    expect(chart.points[0].ucl).toBeCloseTo(37.990381, 5);
    expect(chart.points[0].lcl).toBeCloseTo(12.009619, 5);
  });

  it("widens the limits when the sample is smaller", () => {
    // p-bar = 30/250 = 0.12
    // n=50  -> sigma = sqrt(.12*.88/50)  = 0.04595650 -> UCL 25.786950
    // n=200 -> sigma = sqrt(.12*.88/200) = 0.02297825 -> UCL 18.893475
    const chart = computeChart(
      measure({ chartType: "p", multiplier: 100 }),
      obs([[10, 50], [20, 200]]),
    );
    expect(chart.points[0].ucl).toBeCloseTo(25.786950, 5);
    expect(chart.points[1].ucl).toBeCloseTo(18.893475, 5);
    expect(chart.points[0].ucl).toBeGreaterThan(chart.points[1].ucl);
  });

  it("never puts a limit outside 0-100%", () => {
    const chart = computeChart(
      measure({ chartType: "p", multiplier: 100 }),
      obs([[49, 50], [48, 50], [50, 50], [49, 50], [47, 50], [50, 50]]),
    );
    for (const p of chart.points) {
      expect(p.ucl).toBeLessThanOrEqual(100);
      expect(p.lcl).toBeGreaterThanOrEqual(0);
    }
  });

  it("refuses to plot without denominators", () => {
    const chart = computeChart(measure({ chartType: "p" }), obs([1, 2, 3]));
    expect(chart.hasData).toBe(false);
    expect(chart.warnings).toContain("missing-denominator");
  });
});

/* ==================================================================== *
 * np-chart
 * ==================================================================== */

describe("np-chart", () => {
  // n = 50 throughout; counts sum to 72 over 600 -> p-bar = 0.12
  // np-bar = 50 * 0.12 = 6
  // sigma  = sqrt(6 * 0.88) = 2.2978251
  // UCL    = 6 + 3*sigma = 12.893475 ; LCL = -0.893475 -> clamped to 0
  const rows = [5, 8, 6, 7, 4, 6, 5, 7, 6, 5, 8, 5].map((v) => [v, 50]);

  it("computes np-bar and limits", () => {
    const chart = computeChart(measure({ chartType: "np" }), obs(rows));
    expect(chart.centre).toBeCloseTo(6, 10);
    expect(chart.points[0].ucl).toBeCloseTo(12.893475, 5);
    expect(chart.points[0].lcl).toBe(0);
  });

  it("rejects a varying denominator, which np cannot model", () => {
    const chart = computeChart(
      measure({ chartType: "np" }),
      obs([[5, 50], [6, 60]]),
    );
    expect(chart.hasData).toBe(false);
    expect(chart.warnings).toContain("np-needs-constant-denominator");
  });
});

/* ==================================================================== *
 * c-chart
 * ==================================================================== */

describe("c-chart", () => {
  // counts sum to 78 over 12 -> c-bar = 6.5
  // sigma = sqrt(6.5) = 2.5495098
  // UCL = 6.5 + 3*sigma = 14.148529 ; LCL = -1.148529 -> clamped to 0
  const values = [5, 8, 6, 7, 9, 4, 6, 7, 5, 8, 6, 7];

  it("computes c-bar and limits", () => {
    const chart = computeChart(measure({ chartType: "c" }), obs(values));
    expect(chart.centre).toBeCloseTo(6.5, 10);
    expect(chart.points[0].ucl).toBeCloseTo(14.148529, 5);
    expect(chart.points[0].lcl).toBe(0);
  });
});

/* ==================================================================== *
 * u-chart
 * ==================================================================== */

describe("u-chart", () => {
  // 39 events over 6300 bed-days -> u-bar = 0.00619047… per bed-day
  // per 1000 -> centre 6.190476
  // n=1000 -> sigma = sqrt(u-bar/1000)*1000 = 2.488067
  // UCL = 6.190476 + 3*2.488067 = 13.654678 ; LCL clamped to 0
  const rows = [[5, 1000], [8, 1200], [6, 900], [7, 1100], [4, 800], [9, 1300]];

  it("computes u-bar scaled by the multiplier", () => {
    const chart = computeChart(
      measure({ chartType: "u", multiplier: 1000 }),
      obs(rows),
    );
    expect(chart.centre).toBeCloseTo(6.190476, 6);
    expect(chart.points[0].ucl).toBeCloseTo(13.654678, 5);
    expect(chart.points[0].lcl).toBe(0);
  });

  it("varies the limits with each period's exposure", () => {
    const chart = computeChart(
      measure({ chartType: "u", multiplier: 1000 }),
      obs(rows),
    );
    // Row 4 has the smallest exposure (800) so must have the widest limit.
    const widest = chart.points.reduce((a, b) => (a.ucl > b.ucl ? a : b));
    expect(widest.denominator).toBe(800);
  });
});

/* ==================================================================== *
 * Run-chart rules
 * ==================================================================== */

describe("run chart rules", () => {
  it("flags a shift of six or more points one side of the median", () => {
    const chart = computeChart(
      measure({ chartType: "run" }),
      obs([5, 5, 5, 5, 5, 5, 10, 10, 10, 10, 10, 10]),
    );
    expect(chart.median).toBe(7.5);
    const shifts = chart.signals.filter((s) => s.rule === "shift");
    expect(shifts).toHaveLength(2);
    expect(shifts[0].indices).toEqual([0, 1, 2, 3, 4, 5]);
    expect(shifts[1].indices).toEqual([6, 7, 8, 9, 10, 11]);
  });

  it("does not let a point sitting on the median break a run", () => {
    // 7 ones, a single 5 (which is exactly the median), then 7 nines.
    // The 5 must be skipped: neither counted nor treated as a break.
    const series = [1, 1, 1, 1, 1, 1, 1, 5, 9, 9, 9, 9, 9, 9, 9];
    const chart = computeChart(measure({ chartType: "run" }), obs(series));
    expect(chart.median).toBe(5);

    const shifts = chart.signals.filter((s) => s.rule === "shift");
    expect(shifts).toHaveLength(2);
    expect(shifts[0].indices).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(shifts[1].indices).toEqual([8, 9, 10, 11, 12, 13, 14]);
    // index 7 is the on-median point and must appear in neither run
    expect(shifts.flatMap((s) => s.indices)).not.toContain(7);
  });

  it("flags a trend of five or more points in one direction", () => {
    const points = buildSeries(measure(), obs([9, 1, 2, 3, 4, 5]));
    const trends = detectTrend(points);
    expect(trends).toHaveLength(1);
    expect(trends[0]).toEqual([1, 2, 3, 4, 5]);
  });

  it("treats equal consecutive values as neither making nor breaking a trend", () => {
    // 1 2 3 3 4 5 — the tie at index 3 is skipped, so this is still a trend.
    const points = buildSeries(measure(), obs([1, 2, 3, 3, 4, 5]));
    const trends = detectTrend(points);
    expect(trends).toHaveLength(1);
    expect(trends[0].length).toBeGreaterThanOrEqual(5);
  });

  it("finds no trend in alternating data", () => {
    const points = buildSeries(measure(), obs([1, 2, 1, 2, 1, 2, 1, 2]));
    expect(detectTrend(points)).toEqual([]);
  });

  it("finds no shift in alternating data", () => {
    const points = buildSeries(measure(), obs([1, 2, 1, 2, 1, 2, 1, 2]));
    expect(detectShift(points, 1.5)).toEqual([]);
  });

  describe("runs test", () => {
    it("flags too few runs", () => {
      // six 1s then six 2s: median 1.5, n1 = n2 = 6, runs = 2
      // expected = 2*6*6/12 + 1 = 7 ; sd = sqrt(4320/1584) = 1.651446
      // z = (2 - 7) / 1.651446 = -3.028  -> below -1.96
      const points = buildSeries(
        measure(),
        obs([1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2]),
      );
      const result = runsTest(points, 1.5);
      expect(result.applicable).toBe(true);
      expect(result.runs).toBe(2);
      expect(result.expected).toBeCloseTo(7, 10);
      expect(result.z).toBeCloseTo(-3.0277, 3);
      expect(result.signal).toBe("too-few-runs");
    });

    it("flags too many runs when the data alternates", () => {
      const values = Array.from({ length: 16 }, (_, i) => (i % 2 ? 2 : 1));
      const points = buildSeries(measure(), obs(values));
      const result = runsTest(points, 1.5);
      expect(result.runs).toBe(16);
      expect(result.signal).toBe("too-many-runs");
    });

    it("is skipped when there are too few points to be meaningful", () => {
      const points = buildSeries(measure(), obs([1, 2, 1, 2]));
      expect(runsTest(points, 1.5).applicable).toBe(false);
    });
  });
});

/* ==================================================================== *
 * Shewhart rules
 * ==================================================================== */

describe("mergeSpans", () => {
  it("merges overlapping windows into one span", () => {
    // The sliding 2-of-3 window fires on every step through a long
    // stretch; one finding should be reported, not a dozen.
    expect(
      mergeSpans([
        [0, 1, 2],
        [1, 2, 3],
        [2, 3, 4],
      ]),
    ).toEqual([[0, 1, 2, 3, 4]]);
  });

  it("keeps separate stretches apart", () => {
    expect(
      mergeSpans([
        [0, 1, 2],
        [8, 9, 10],
      ]),
    ).toEqual([
      [0, 1, 2],
      [8, 9, 10],
    ]);
  });

  it("is empty for no input", () => {
    expect(mergeSpans([])).toEqual([]);
  });
});

describe("Shewhart rules", () => {
  it("flags a point outside the limits", () => {
    const chart = computeChart(
      measure({ chartType: "xmr" }),
      obs([20, 21, 19, 20, 22, 18, 21, 19, 20, 21, 20, 60]),
    );
    const beyond = chart.signals.find((s) => s.rule === "beyond-limits");
    expect(beyond).toBeTruthy();
    expect(beyond.indices).toContain(11);
  });

  it("needs eight points, not six, for a shift on a control chart", () => {
    // Seven points above the centre is not yet a Shewhart shift.
    const seven = computeChart(
      measure({ chartType: "xmr" }),
      obs([10, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 11]),
    );
    expect(seven.signals.filter((s) => s.rule === "shift")).toHaveLength(0);
  });

  /*
   * The 2-of-3 rule is "two of three beyond 2 sigma ON THE SAME SIDE". The
   * same twelve baseline points as the freezing suite below: mean 20,
   * sigma 1.531270, so 2 sigma reaches 23.062540 above and 16.937460 below,
   * and the 3-sigma limits are 24.593810 / 15.406190. A point at 24 is
   * therefore beyond 2 sigma above without being outside the limits, and 16
   * is the mirror of it below.
   */
  const twoSigmaBaseline = [20, 21, 19, 20, 22, 18, 21, 19, 20, 21, 20, 19];
  const twoSigmaEnd = "2026-01-12"; // the twelfth generated date
  const twoOfThree = (tail) =>
    computeChart(
      measure({ chartType: "xmr", baselineEnd: twoSigmaEnd }),
      obs([...twoSigmaBaseline, ...tail]),
    ).signals.filter((s) => s.rule === "two-of-three");

  it("reports an excursion above and one below as two separate findings", () => {
    // Two points beyond 2 sigma above, then two beyond 2 sigma below — an
    // over-correction after an intervention. Merging the windows without
    // regard to side would collapse these into one span reading 11-15,
    // which describes a stretch wider than either real violation.
    const signals = twoOfThree([24, 24, 16, 16]);

    expect(signals).toHaveLength(2);
    expect(signals.map((s) => s.side)).toEqual(["above", "below"]);
    expect(signals[0].indices).toEqual([11, 12, 13, 14]);
    expect(signals[1].indices).toEqual([13, 14, 15]);
    expect(signals[0].indices).not.toContain(15);
  });

  it("names the side in the label, so the two findings read differently", () => {
    const signals = twoOfThree([24, 24, 16, 16]);
    expect(signals[0].label).toContain("above the centre line");
    expect(signals[1].label).toContain("below the centre line");
  });

  it("still merges overlapping windows on the same side into one span", () => {
    // Guards against over-correcting the fix: a single long stretch beyond
    // 2 sigma is one finding, not one per sliding window.
    const signals = twoOfThree([24, 24, 24, 24]);

    expect(signals).toHaveLength(1);
    expect(signals[0].side).toBe("above");
    expect(signals[0].indices).toEqual([11, 12, 13, 14, 15]);
  });
});

/* ==================================================================== *
 * Baseline freezing — the behaviour that makes the tool honest
 * ==================================================================== */

describe("baseline freezing", () => {
  // Twelve baseline points averaging 20, then eight points averaging 10.
  // Baseline: mean 20, MRbar = 19/11 = 1.727273, sigma = 1.531270
  //           UCL 24.593810, LCL 15.406190
  const baseline = [20, 21, 19, 20, 22, 18, 21, 19, 20, 21, 20, 19];
  const improved = [10, 11, 9, 10, 11, 10, 9, 10];
  const all = obs([...baseline, ...improved]);
  const baselineEnd = "2026-01-12"; // the twelfth generated date

  it("calculates limits from the baseline only", () => {
    const chart = computeChart(
      measure({ chartType: "xmr", baselineEnd }),
      all,
    );
    expect(chart.baseline.frozen).toBe(true);
    expect(chart.baseline.count).toBe(12);
    expect(chart.centre).toBeCloseTo(20, 10);
    expect(chart.points[0].ucl).toBeCloseTo(24.59381, 4);
    expect(chart.points[0].lcl).toBeCloseTo(15.40619, 4);
  });

  it("keeps those limits for the improved points, so the shift shows", () => {
    const chart = computeChart(
      measure({ chartType: "xmr", baselineEnd }),
      all,
    );
    const beyond = chart.signals.find((s) => s.rule === "beyond-limits");
    // Every one of the eight improved points sits below the frozen LCL.
    expect(beyond.indices).toEqual([12, 13, 14, 15, 16, 17, 18, 19]);
  });

  it("drags the centre line down without a baseline, hiding the improvement", () => {
    // This is the failure mode freezing exists to prevent: (240+80)/20 = 16.
    const chart = computeChart(measure({ chartType: "xmr" }), all);
    expect(chart.baseline.frozen).toBe(false);
    expect(chart.centre).toBeCloseTo(16, 10);
    expect(chart.centre).not.toBeCloseTo(20, 1);
  });

  it("ignores a baseline too short to define limits", () => {
    const chart = computeChart(
      measure({ chartType: "xmr", baselineEnd: "2026-01-01" }),
      all,
    );
    expect(chart.baseline.frozen).toBe(false);
  });
});

/* ==================================================================== *
 * Laney P' and U' — the correction for overdispersion
 * ==================================================================== */

describe("Laney P′", () => {
  /*
   * A hospital-scale audit: 10,000 admissions a month and a compliance rate
   * that genuinely moves between months. Worked from the published formula:
   *   pBar    = 24300/120000 = 0.2025,  centre = 20.25%
   *   sigma_i = sqrt(0.2025 x 0.7975 / 10000) x 100 = 0.40186285
   *   z_i     = (plotted - centre) / sigma_i
   *   MRbar(z) = 10.63230223,  sigma_z = MRbar / 1.128 = 9.42579985
   * so P limits are 20.25 +/- 1.2056 and P' limits 20.25 +/- 11.3636.
   */
  const bigN = [1800, 2200, 1900, 2300, 1700, 2100, 2400, 1600, 2000, 2200, 1800, 2300].map(
    (x) => [x, 10000],
  );
  const pct = (over = {}) => measure({ multiplier: 100, ...over });

  it("derives sigma_z from the moving range of the baseline z-scores", () => {
    const chart = computeChart(pct({ chartType: "p-prime" }), obs(bigN));
    expect(chart.detail.sigmaZ).toBeCloseTo(9.4258, 4);
    expect(chart.detail.dispersionApplicable).toBe(true);
    expect(chart.detail.zCount).toBe(12);
  });

  it("widens the limits by sigma_z, leaving the centre line alone", () => {
    const plain = computeChart(pct({ chartType: "p" }), obs(bigN));
    const prime = computeChart(pct({ chartType: "p-prime" }), obs(bigN));

    expect(prime.centre).toBeCloseTo(plain.centre, 10);
    expect(plain.points[0].ucl).toBeCloseTo(21.455589, 5);
    expect(prime.points[0].ucl).toBeCloseTo(31.613636, 5);
    expect(prime.points[0].lcl).toBeCloseTo(8.886364, 5);
  });

  it("stops ordinary variation being reported as special cause at large n", () => {
    // This is the whole point of the chart: at n = 10,000 the binomial limits
    // are so tight that 10 of these 12 ordinary months breach them.
    const plain = computeChart(pct({ chartType: "p" }), obs(bigN));
    const prime = computeChart(pct({ chartType: "p-prime" }), obs(bigN));

    const breaches = (chart) =>
      chart.signals.find((s) => s.rule === "beyond-limits")?.indices.length ?? 0;

    expect(breaches(plain)).toBe(10);
    expect(breaches(prime)).toBe(0);
  });

  it("keeps the per-point sigma when denominators vary", () => {
    // Same shape, changing sample sizes: sigma_z = 7.74406412.
    const varying = [
      [1800, 10000], [2310, 11000], [1710, 9000], [2400, 12000],
      [1360, 8000], [2100, 10000], [2640, 11000], [1440, 9000],
      [2000, 10000], [2640, 12000], [1620, 9000], [2530, 11000],
    ];
    const chart = computeChart(pct({ chartType: "p-prime" }), obs(varying));

    expect(chart.detail.sigmaZ).toBeCloseTo(7.744064, 5);
    // The 12,000-admission months still get tighter limits than the 8,000 ones.
    const width = (i) => chart.points[i].ucl - chart.points[i].lcl;
    expect(width(3)).toBeLessThan(width(4));
  });

  it("narrows the limits when the data is underdispersed", () => {
    /*
     * Deliberate: this follows Laney's published method, which applies
     * sigma_z unconditionally. n = 100 gives a binomial sigma of 5%, but
     * these months move by about 1%, so sigma_z = 0.20954252 and the limits
     * tighten from +/-15 to +/-3.14. Limits that are too wide hide real
     * signals, so correcting this direction is a feature, not an oversight.
     */
    const tight = [50, 51, 49, 50, 51, 49, 50, 50, 51, 49, 50, 51].map((x) => [x, 100]);
    const plain = computeChart(pct({ chartType: "p" }), obs(tight));
    const prime = computeChart(pct({ chartType: "p-prime" }), obs(tight));

    expect(prime.detail.sigmaZ).toBeCloseTo(0.209543, 5);
    expect(prime.points[0].ucl).toBeLessThan(plain.points[0].ucl);
    expect(prime.points[0].ucl).toBeCloseTo(53.226467, 5);
  });

  it("falls back to an uncorrected chart when the baseline never moves", () => {
    // Flat data gives MRbar = 0, and a sigma_z of 0 would collapse the limits
    // onto the centre line and flag every future point.
    const flat = Array.from({ length: 12 }, () => [2000, 10000]);
    const chart = computeChart(pct({ chartType: "p-prime" }), obs(flat));

    expect(chart.detail.sigmaZ).toBe(1);
    expect(chart.detail.dispersionApplicable).toBe(false);
    expect(chart.warnings).toContain("dispersion-not-estimated");
  });

  it("warns when the baseline is too short to estimate dispersion from", () => {
    const short = computeChart(
      pct({ chartType: "p-prime" }),
      obs(bigN.slice(0, 6)),
    );
    expect(short.warnings).toContain("few-points-for-dispersion");
  });

  it("takes sigma_z from the baseline only, so frozen limits stay frozen", () => {
    // Limits must not be renegotiated by the very improvement they exist to
    // detect — that applies to the dispersion factor as much as to the centre.
    const improved = [...bigN, ...Array.from({ length: 6 }, () => [500, 10000])];
    const frozen = computeChart(
      pct({ chartType: "p-prime", baselineEnd: "2026-01-12" }),
      obs(improved),
    );

    expect(frozen.baseline.frozen).toBe(true);
    expect(frozen.detail.sigmaZ).toBeCloseTo(9.4258, 4);
    expect(frozen.detail.zCount).toBe(12);
  });
});

describe("Laney U′", () => {
  it("corrects a rate chart the same way", () => {
    // Falls per 1,000 bed-days over large exposures.
    const rows = [
      [90, 12000], [140, 12000], [100, 12000], [150, 12000],
      [85, 12000], [135, 12000], [155, 12000], [80, 12000],
      [110, 12000], [145, 12000], [95, 12000], [150, 12000],
    ];
    const m = (type) => measure({ chartType: type, multiplier: 1000 });
    const plain = computeChart(m("u"), obs(rows));
    const prime = computeChart(m("u-prime"), obs(rows));

    expect(prime.detail.sigmaZ).toBeGreaterThan(1);
    expect(prime.centre).toBeCloseTo(plain.centre, 10);
    expect(prime.points[0].ucl).toBeGreaterThan(plain.points[0].ucl);
  });
});

/* ==================================================================== *
 * Phases — re-baselining once a change has become standard practice
 * ==================================================================== */

describe("resolvePhases", () => {
  it("reads a measure that has never been split as one phase", () => {
    // Every measure saved before phases existed must keep working, which is
    // why this is derived rather than migrated.
    expect(resolvePhases(measure({ baselineEnd: "2026-01-12" }))).toEqual([
      { id: "phase-1", label: "Baseline", startsAt: null, baselineEnd: "2026-01-12" },
    ]);
  });

  it("orders declared phases by their start date", () => {
    const out = resolvePhases(
      measure({
        phases: [
          { id: "b", label: "After", startsAt: "2026-01-13" },
          { id: "a", label: "Before", startsAt: "2026-01-01" },
        ],
      }),
    );
    expect(out.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("runs the first phase from the beginning whatever it claims", () => {
    // Otherwise observations before its start date belong to no phase at all
    // and would silently vanish from the chart.
    const [first] = resolvePhases(
      measure({ phases: [{ id: "a", startsAt: "2026-06-01" }] }),
    );
    expect(first.startsAt).toBeNull();
  });

  it("names an unlabelled phase by its position", () => {
    const out = resolvePhases(measure({ phases: [{}, { startsAt: "2026-01-13" }] }));
    expect(out.map((p) => p.label)).toEqual(["Phase 1", "Phase 2"]);
  });
});

describe("re-baselined charts", () => {
  /*
   * Twelve points averaging 20, then twelve averaging 10 after an
   * intervention that has since become standard practice. Per phase:
   *   phase 1  MRbar = 1.72727273  sigma = 1.53127015  24.593810 / 15.406190
   *   phase 2  MRbar = 1.09090909  sigma = 0.96711799  12.901354 /  7.098646
   * Treated as one phase the centre falls to 15 and the limits become
   * 19.625347 / 10.374653.
   */
  const before = [20, 21, 19, 20, 22, 18, 21, 19, 20, 21, 20, 19];
  const after = [10, 11, 9, 10, 11, 10, 9, 10, 11, 9, 10, 10];
  const all = obs([...before, ...after]);
  const split = {
    phases: [
      { id: "p1", label: "Before", startsAt: null },
      { id: "p2", label: "After", startsAt: "2026-01-13" },
    ],
  };

  it("gives each phase its own centre line and limits", () => {
    const chart = computeChart(measure({ chartType: "xmr", ...split }), all);

    expect(chart.phases.map((p) => p.centre)).toEqual([20, 10]);
    expect(chart.points[0].ucl).toBeCloseTo(24.593810, 5);
    expect(chart.points[0].lcl).toBeCloseTo(15.406190, 5);
    expect(chart.points[12].ucl).toBeCloseTo(12.901354, 5);
    expect(chart.points[12].lcl).toBeCloseTo(7.098646, 5);
  });

  it("stops reporting a change the team made on purpose", () => {
    /*
     * Held to one set of limits this is a chart screaming about a step
     * change everybody already knows about: twelve points above the centre,
     * twelve below, and most of them outside the limits. Re-baselined, both
     * phases are simply stable — which is the truth once the new way of
     * working is standard practice.
     */
    const one = computeChart(measure({ chartType: "xmr" }), all);
    const two = computeChart(measure({ chartType: "xmr", ...split }), all);

    expect(one.signals.filter((s) => s.rule === "shift")).toHaveLength(2);
    expect(one.signals.some((s) => s.rule === "beyond-limits")).toBe(true);
    expect(two.signals).toEqual([]);
  });

  it("never lets a run span a boundary", () => {
    // Six points below phase 1's centre running straight into phase 2 would
    // be eight in a row if the rule were allowed to cross.
    const straddling = obs([
      ...[20, 21, 19, 20, 22, 18, 21, 19, 20, 21, 20, 19],
      ...[19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19],
    ]);
    const chart = computeChart(
      measure({ chartType: "xmr", ...split }),
      straddling,
    );

    for (const signal of chart.signals) {
      const phasesTouched = new Set(
        signal.indices.map((i) => chart.points.find((p) => p.index === i).phaseId),
      );
      expect(phasesTouched.size).toBeLessThanOrEqual(1);
    }
  });

  it("stamps every point with the phase it belongs to", () => {
    const chart = computeChart(measure({ chartType: "xmr", ...split }), all);
    expect(chart.points[11].phaseId).toBe("p1");
    expect(chart.points[12].phaseId).toBe("p2");
  });

  it("names the phase in a signal's label, but only when there is a choice", () => {
    const one = computeChart(measure({ chartType: "xmr" }), all);
    expect(one.signals[0].label).not.toContain("(");

    const drifting = computeChart(
      measure({ chartType: "xmr", ...split }),
      obs([...before, ...[9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 12, 9]]),
    );
    const shift = drifting.signals.find((s) => s.rule === "shift");
    expect(shift.label).toContain("(After)");
    expect(shift.phaseId).toBe("p2");
  });

  it("freezes each phase against its own baseline", () => {
    // Phase 2's limits come from its first six points only, so the later
    // improvement shows as a signal instead of moving the line with it.
    const chart = computeChart(
      measure({
        chartType: "xmr",
        phases: [
          { id: "p1", label: "Before", startsAt: null },
          { id: "p2", label: "After", startsAt: "2026-01-13", baselineEnd: "2026-01-18" },
        ],
      }),
      obs([...before, ...[10, 11, 9, 10, 11, 10, 2, 2, 2, 2, 2, 2]]),
    );

    const second = chart.phases[1];
    expect(second.baseline.frozen).toBe(true);
    expect(second.baseline.count).toBe(6);
    expect(second.centre).toBeCloseTo(10.166667, 5);
    expect(chart.signals.some((s) => s.rule === "beyond-limits")).toBe(true);
  });

  it("reports the last phase as the chart's centre line", () => {
    const chart = computeChart(measure({ chartType: "xmr", ...split }), all);
    expect(chart.centre).toBe(10);
    // The first phase's baseline stays where callers have always found it.
    expect(chart.baseline.count).toBe(12);
  });

  it("warns about a phase too short to draw limits from", () => {
    const chart = computeChart(
      measure({
        chartType: "xmr",
        phases: [
          { id: "p1", startsAt: null },
          { id: "p2", startsAt: "2026-01-22" },
        ],
      }),
      all,
    );
    expect(chart.warnings).toContain("short-phase");
  });

  it("gives a run chart a median per phase", () => {
    const chart = computeChart(measure({ chartType: "run", ...split }), all);
    expect(chart.phases.map((p) => p.centre)).toEqual([20, 10]);
    expect(chart.median).toBe(10);
  });

  it("lets np accept a sample size that changed at a boundary", () => {
    // Auditing 50 cases a month and then 80 is a perfectly ordinary thing to
    // do at a re-baseline; only points sharing limits must share an n.
    const rows = [
      ...[5, 8, 6, 7, 4, 6, 5, 7, 6, 5, 8, 5].map((v) => [v, 50]),
      ...[9, 12, 10, 11, 8, 10, 9, 11, 10, 9, 12, 9].map((v) => [v, 80]),
    ];
    const one = computeChart(measure({ chartType: "np" }), obs(rows));
    const two = computeChart(measure({ chartType: "np", ...split }), obs(rows));

    expect(one.hasData).toBe(false);
    expect(one.warnings).toContain("np-needs-constant-denominator");
    expect(two.hasData).toBe(true);
    expect(two.phases).toHaveLength(2);
  });

  it("judges the latest point against its own phase, not the chart's", () => {
    // A point at 10 is far below the combined centre of 15 but exactly on
    // phase 2's. Reading it against the wrong line inverts the verdict.
    const chart = computeChart(measure({ chartType: "xmr", ...split }), all);
    const point = chart.points.at(-1);

    expect(point.centre).toBe(10);
    expect(point.plotted).toBe(10);
    expect(chart.centre).toBe(10);
  });
});

/* ==================================================================== *
 * Reading a verdict off the chart
 * ==================================================================== */

describe("interpretChart", () => {
  const withDirection = (dir, values, chartType = "c") =>
    interpretChart(
      computeChart(measure({ chartType, direction: dir }), obs(values)),
      measure({ chartType, direction: dir }),
    );

  it("waits for enough data before calling anything", () => {
    expect(withDirection("lower", [5, 6, 5]).status).toBe("insufficient");
  });

  it("reports no signal for ordinary variation", () => {
    const v = withDirection("lower", [8, 9, 7, 8, 10, 7, 9, 8, 9, 7, 8, 9]);
    expect(v.status).toBe("stable");
  });

  it("calls a sustained drop an improvement when lower is better", () => {
    // Twelve points near 20, then ten near 5 — the recent run is long
    // enough to be the signal that reaches the last point.
    const v = withDirection(
      "lower",
      [20, 21, 19, 20, 22, 18, 21, 19, 20, 21, 20, 19, 5, 6, 4, 5, 6, 5, 4, 6, 5, 5],
    );
    expect(v.status).toBe("improving");
  });

  it("calls the same drop a deterioration when higher is better", () => {
    const v = withDirection(
      "higher",
      [20, 21, 19, 20, 22, 18, 21, 19, 20, 21, 20, 19, 5, 6, 4, 5, 6, 5, 4, 6, 5, 5],
    );
    expect(v.status).toBe("deteriorating");
  });

  /*
   * The case that caught a real bug: a series that ran high for a year and
   * has recently come down, where the recent run is still too short to be
   * a shift. Reading the verdict off the latest *flagged* point reported
   * this as deteriorating — the exact opposite of what the data shows.
   */
  it("does not read a verdict off an old signal the latest point is not in", () => {
    const values = [
      9, 11, 8, 12, 10, 9, 13, 8, 11, 10, 12, 9, // twelve points above centre
      4, 3, 5, 2, 4, 3, // six below — short of the eight a shift needs
    ];
    const chart = computeChart(measure({ chartType: "c" }), obs(values));

    // The only signal covers the early high period.
    const shift = chart.signals.find((s) => s.rule === "shift");
    expect(shift.indices).not.toContain(17);

    const verdict = interpretChart(chart, measure({ direction: "lower" }));
    expect(verdict.status).toBe("past-signal");
    expect(verdict.status).not.toBe("deteriorating");
  });
});

/* ==================================================================== *
 * Empty and degenerate input
 * ==================================================================== */

describe("missing values", () => {
  it("skips an observation whose value was cleared, rather than plotting zero", () => {
    // A cleared numerator with the denominator still present must not
    // divide to 0 and drag the centre line down.
    const rows = [
      { id: "o1", measureId: "m1", period: "2026-01-01", value: 40, denominator: 50 },
      { id: "o2", measureId: "m1", period: "2026-01-02", value: null, denominator: 50 },
      { id: "o3", measureId: "m1", period: "2026-01-03", value: 44, denominator: 50 },
    ];
    const chart = computeChart(
      measure({ chartType: "run", multiplier: 100 }),
      rows,
    );
    expect(chart.points).toHaveLength(2);
    expect(chart.points.map((p) => p.plotted)).toEqual([80, 88]);
  });

  it("skips an undefined value on a plain run chart", () => {
    const chart = computeChart(measure({ chartType: "run" }), [
      { id: "o1", measureId: "m1", period: "2026-01-01", value: 5, denominator: null },
      { id: "o2", measureId: "m1", period: "2026-01-02", value: undefined, denominator: null },
    ]);
    expect(chart.points).toHaveLength(1);
  });
});

describe("empty input", () => {
  it("returns a no-data chart rather than throwing", () => {
    const chart = computeChart(measure({ chartType: "xmr" }), []);
    expect(chart.hasData).toBe(false);
    expect(chart.points).toEqual([]);
    expect(chart.centre).toBeNull();
  });

  it("handles a single observation", () => {
    const chart = computeChart(measure({ chartType: "xmr" }), obs([5]));
    expect(chart.points).toHaveLength(1);
    expect(chart.centre).toBeCloseTo(5, 10);
  });
});

/* ------------------------------------------------------------------ *
 * A real dataset
 *
 * Thirteen months of a paediatric QI project, from the audit sheet the
 * user supplied: how many children arrived in the anaesthetic room in
 * tears, out of how many on the list. The intervention was January 2026.
 * ------------------------------------------------------------------ */

const TEARS = [
  ["2025-07-01", 17, 21], ["2025-08-01", 13, 18], ["2025-09-01", 7, 12],
  ["2025-10-01", 7, 15],  ["2025-11-01", 6, 14],  ["2025-12-01", 9, 18],
  ["2026-01-01", 0, 12],  ["2026-02-01", 0, 13],  ["2026-03-01", 0, 8],
  ["2026-04-01", 1, 19],  ["2026-05-01", 0, 8],   ["2026-06-01", 0, 16],
  ["2026-07-01", 0, 17],
].map(([period, value, denominator], i) => ({
  id: `t${i}`, measureId: "m1", period, value, denominator, note: "",
}));

const tearsMeasure = (over = {}) =>
  measure({
    chartType: "p",
    multiplier: 100,
    direction: "lower",
    goal: 10,
    cadence: "monthly",
    ...over,
  });

describe("p-chart on the arriving-in-tears series", () => {
  /*
   * Baseline is the six months to Dec 2025: 59 of 98 children.
   *   p-bar = 59/98 = 0.602041 -> 60.2041%
   * At n = 12 (January):
   *   sigma = sqrt(0.6020408 * 0.3979592 / 12) = 0.1412998 -> 14.12998%
   *   LCL   = 60.20408 - 3(14.12998) = 17.81414%
   *   UCL   = 60.20408 + 3(14.12998) = 102.594% -> clamped to 100%
   */
  it("freezes the limits on the pre-intervention baseline", () => {
    const chart = computeChart(tearsMeasure({ baselineEnd: "2025-12-01" }), TEARS);

    expect(chart.baseline.frozen).toBe(true);
    expect(chart.baseline.count).toBe(6);
    expect(chart.centre).toBeCloseTo(60.2041, 3);

    const january = chart.points[6];
    expect(january.lcl).toBeCloseTo(17.81414, 4);
    // A proportion cannot exceed 100%, so the upper limit is held there.
    expect(january.ucl).toBeCloseTo(100, 10);
  });

  it("puts every post-intervention month outside the limits", () => {
    const chart = computeChart(tearsMeasure({ baselineEnd: "2025-12-01" }), TEARS);
    const beyond = chart.signals.find((s) => s.rule === "beyond-limits");

    expect(beyond.indices).toEqual([6, 7, 8, 9, 10, 11, 12]);
    expect(chart.points[6].period).toBe("2026-01-01");
    expect(interpretChart(chart, tearsMeasure()).status).toBe("improving");
  });

  /*
   * The reason freezing matters. Across all thirteen months the centre is
   * 60/191 = 0.314136 -> 31.4136%, and the lower limit falls below zero at
   * every sample size — so the improvement swallows its own evidence and
   * not one point can be flagged as beyond the limits.
   */
  it("loses the evidence when the limits are not frozen", () => {
    const chart = computeChart(tearsMeasure({ baselineEnd: null }), TEARS);

    expect(chart.centre).toBeCloseTo(31.4136, 3);
    const beyond = chart.signals.find((s) => s.rule === "beyond-limits");
    expect(beyond.indices).not.toContain(12);
  });

  it("plots percentages, not fractions", () => {
    const asFraction = computeChart(tearsMeasure({ multiplier: 1 }), TEARS);
    const asPercent = computeChart(tearsMeasure(), TEARS);

    // 17 of 21 is 80.95% — and 0.8095 on the scale that hides the goal line.
    expect(asFraction.points[0].plotted).toBeCloseTo(0.809524, 6);
    expect(asPercent.points[0].plotted).toBeCloseTo(80.9524, 4);
  });
});

describe("rows that are still being filled in", () => {
  /*
   * The data matrix creates a row with a numerator and no denominator the
   * moment someone types the first number. Refusing to draw anything at all
   * until the row is finished makes a working chart vanish mid-entry.
   */
  it("plots the complete points and names the incomplete ones", () => {
    const halfTyped = [
      ...TEARS.slice(0, 12),
      { id: "tx", measureId: "m1", period: "2026-07-01", value: 0, denominator: null, note: "" },
    ];
    const chart = computeChart(tearsMeasure({ baselineEnd: "2025-12-01" }), halfTyped);

    expect(chart.hasData).toBe(true);
    expect(chart.points).toHaveLength(12);
    expect(chart.warnings).toContain("partial-rows");
    expect(chart.incomplete).toEqual({ count: 1, periods: ["2026-07-01"] });
    // The limits are untouched: they come from the baseline, which is intact.
    expect(chart.centre).toBeCloseTo(60.2041, 3);
  });

  it("still says missing-denominator when nothing is complete", () => {
    const chart = computeChart(tearsMeasure(), [
      { id: "a", measureId: "m1", period: "2026-01-01", value: 3, denominator: null, note: "" },
    ]);

    expect(chart.hasData).toBe(false);
    expect(chart.warnings).toContain("missing-denominator");
  });

  it("drops an np point with no denominator instead of returning NaN", () => {
    // np plots the raw count, so it survives plottedValue without a
    // denominator and would otherwise reach the limit maths as NaN.
    const chart = computeChart(measure({ chartType: "np" }), [
      { id: "a", measureId: "m1", period: "2026-01-01", value: 4, denominator: 50, note: "" },
      { id: "b", measureId: "m1", period: "2026-01-02", value: 6, denominator: 50, note: "" },
      { id: "c", measureId: "m1", period: "2026-01-03", value: 5, denominator: null, note: "" },
    ]);

    expect(chart.points).toHaveLength(2);
    expect(Number.isFinite(chart.centre)).toBe(true);
    expect(chart.warnings).toContain("partial-rows");
  });
});
