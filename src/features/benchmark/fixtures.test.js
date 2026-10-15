import { describe, it, expect } from "vitest";
import { computeChart } from "../../lib/spc.js";
import {
  BENCHMARK_MEASURES,
  BENCHMARK_OBSERVATIONS,
  FAMILY_MEASURES,
} from "./fixtures.js";

describe("benchmark fixtures", () => {
  for (const [key, measure] of Object.entries(BENCHMARK_MEASURES)) {
    it(`${key}: plots every observation with a centre line`, () => {
      const chart = computeChart(measure, BENCHMARK_OBSERVATIONS);
      const expected = BENCHMARK_OBSERVATIONS.filter(
        (o) => o.measureId === measure.id,
      ).length;
      expect(chart.hasData).toBe(true);
      expect(chart.points).toHaveLength(expected);
      expect(chart.incomplete.count).toBe(0);
      expect(chart.centre).not.toBeNull();
    });
  }

  it("every family measure has a role the family view can place", () => {
    for (const m of FAMILY_MEASURES) {
      expect(["outcome", "process", "balancing"]).toContain(m.role);
    }
  });

  it("flags the post-change drop in the p, c and XmR fixtures", () => {
    for (const key of ["p", "c", "xmr"]) {
      const chart = computeChart(BENCHMARK_MEASURES[key], BENCHMARK_OBSERVATIONS);
      expect(chart.signals.length, key).toBeGreaterThan(0);
    }
  });

  it("c fixture: 8 post-change points below the baseline centre of 7 form a shift", () => {
    const chart = computeChart(BENCHMARK_MEASURES.c, BENCHMARK_OBSERVATIONS);
    expect(chart.centre).toBe(7);
    const shift = chart.signals.find((s) => s.rule === "shift");
    expect(shift?.indices).toEqual([6, 7, 8, 9, 10, 11, 12, 13]);
  });
});
