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

  it("flags the post-change drop in the p and XmR fixtures", () => {
    for (const key of ["p", "xmr"]) {
      const chart = computeChart(BENCHMARK_MEASURES[key], BENCHMARK_OBSERVATIONS);
      expect(chart.signals.length, key).toBeGreaterThan(0);
    }
  });

  it("c fixture raises no signal: 6 post-change points cannot form an 8-point shift and stay above the 0 lower limit", () => {
    const chart = computeChart(BENCHMARK_MEASURES.c, BENCHMARK_OBSERVATIONS);
    expect(chart.centre).toBe(7);
    expect(chart.points[0].lcl).toBe(0);
    expect(chart.signals).toEqual([]);
  });
});
