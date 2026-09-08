import { describe, it, expect } from "vitest";
import {
  canonicalPeriod,
  nextPeriod,
  dominantCadence,
  collectPeriods,
  observationAt,
  rowCompleteness,
} from "./matrix.js";

describe("canonicalPeriod", () => {
  it("snaps a monthly period to the first of the month", () => {
    expect(canonicalPeriod("2026-03-17", "monthly")).toBe("2026-03-01");
  });

  it("snaps a quarterly period to the first of the quarter", () => {
    expect(canonicalPeriod("2026-01-15", "quarterly")).toBe("2026-01-01");
    expect(canonicalPeriod("2026-05-31", "quarterly")).toBe("2026-04-01");
    expect(canonicalPeriod("2026-09-02", "quarterly")).toBe("2026-07-01");
    expect(canonicalPeriod("2026-12-31", "quarterly")).toBe("2026-10-01");
  });

  it("snaps a weekly period back to the Monday", () => {
    // 2026-09-08 is a Tuesday, so its week starts on the 7th.
    expect(canonicalPeriod("2026-09-08", "weekly")).toBe("2026-09-07");
    // A Monday is already the start of its week.
    expect(canonicalPeriod("2026-09-07", "weekly")).toBe("2026-09-07");
    // A Sunday belongs to the week that began six days earlier.
    expect(canonicalPeriod("2026-09-13", "weekly")).toBe("2026-09-07");
  });

  it("leaves a daily period alone", () => {
    expect(canonicalPeriod("2026-03-17", "daily")).toBe("2026-03-17");
  });

  it("does not drift across a month boundary in a western timezone", () => {
    // Parsing as local time would make this 2026-02-28 west of GMT.
    expect(canonicalPeriod("2026-03-01", "monthly")).toBe("2026-03-01");
  });
});

describe("nextPeriod", () => {
  it("steps a month, rolling the year over", () => {
    expect(nextPeriod("2026-03-01", "monthly")).toBe("2026-04-01");
    expect(nextPeriod("2026-12-01", "monthly")).toBe("2027-01-01");
  });

  it("steps a quarter", () => {
    expect(nextPeriod("2026-10-01", "quarterly")).toBe("2027-01-01");
  });

  it("steps a week and a fortnight", () => {
    expect(nextPeriod("2026-09-07", "weekly")).toBe("2026-09-14");
    expect(nextPeriod("2026-09-07", "fortnightly")).toBe("2026-09-21");
  });

  it("snaps an off-cadence date before stepping", () => {
    // Mid-month in, first of next month out — not the 18th.
    expect(nextPeriod("2026-03-17", "monthly")).toBe("2026-04-01");
  });

  it("falls back to the current period when there is nothing to follow", () => {
    expect(nextPeriod(null, "monthly")).toMatch(/^\d{4}-\d{2}-01$/);
  });
});

describe("dominantCadence", () => {
  it("picks the most common cadence", () => {
    expect(
      dominantCadence([
        { cadence: "monthly" },
        { cadence: "monthly" },
        { cadence: "weekly" },
      ]),
    ).toBe("monthly");
  });

  it("breaks a tie towards the more frequent cadence", () => {
    // Collecting too often can be thinned later; too rarely cannot be undone.
    expect(
      dominantCadence([{ cadence: "monthly" }, { cadence: "weekly" }]),
    ).toBe("weekly");
  });

  it("defaults to monthly with no measures", () => {
    expect(dominantCadence([])).toBe("monthly");
  });
});

describe("collectPeriods", () => {
  const measures = [{ id: "m1" }, { id: "m2" }];
  const observations = [
    { measureId: "m1", period: "2026-02-01" },
    { measureId: "m2", period: "2026-01-01" },
    { measureId: "m1", period: "2026-01-01" },
    { measureId: "other", period: "2026-12-01" },
  ];

  it("returns the sorted union across the project's measures", () => {
    expect(collectPeriods(measures, observations)).toEqual([
      "2026-01-01",
      "2026-02-01",
    ]);
  });

  it("ignores observations belonging to another project's measures", () => {
    expect(collectPeriods(measures, observations)).not.toContain("2026-12-01");
  });

  it("includes empty rows the user has added but not filled in", () => {
    expect(collectPeriods(measures, observations, ["2026-03-01"])).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
    ]);
  });
});

describe("observationAt", () => {
  const observations = [
    { id: "a", measureId: "m1", period: "2026-01-01", value: 5 },
    { id: "b", measureId: "m2", period: "2026-01-01", value: 9 },
  ];

  it("finds the cell for one measure in one period", () => {
    expect(observationAt(observations, "m2", "2026-01-01").id).toBe("b");
  });

  it("returns null for an empty cell", () => {
    expect(observationAt(observations, "m1", "2026-02-01")).toBeNull();
  });
});

describe("rowCompleteness", () => {
  const measures = [{ id: "m1" }, { id: "m2" }, { id: "m3" }];

  it("counts how many measures have a value that period", () => {
    const observations = [
      { measureId: "m1", period: "2026-01-01", value: 5 },
      { measureId: "m2", period: "2026-01-01", value: 0 },
    ];
    const row = rowCompleteness(measures, observations, "2026-01-01");
    expect(row).toEqual({ filled: 2, total: 3, complete: false });
  });

  it("treats zero as data but a null value as missing", () => {
    const observations = [
      { measureId: "m1", period: "2026-01-01", value: 0 },
      { measureId: "m2", period: "2026-01-01", value: null },
    ];
    expect(rowCompleteness(measures, observations, "2026-01-01").filled).toBe(1);
  });

  it("reports a fully entered row as complete", () => {
    const observations = measures.map((m) => ({
      measureId: m.id,
      period: "2026-01-01",
      value: 1,
    }));
    expect(rowCompleteness(measures, observations, "2026-01-01").complete).toBe(
      true,
    );
  });
});
