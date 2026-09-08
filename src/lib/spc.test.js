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
