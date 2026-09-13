import { describe, it, expect } from "vitest";
import { periodLabel } from "./format.js";

/** Jul 2025 to Jul 2026 — thirteen months, starting and ending in July. */
const THIRTEEN_MONTHS = [
  "2025-07-01", "2025-08-01", "2025-09-01", "2025-10-01", "2025-11-01",
  "2025-12-01", "2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01",
  "2026-05-01", "2026-06-01", "2026-07-01",
];

describe("periodLabel", () => {
  /*
   * The reason this function exists. The x-axis is categorical, keyed on the
   * label, so two periods sharing a label are one slot — and any reference
   * line matched by label lands on whichever came first.
   */
  it("gives a year spanning series distinct labels", () => {
    const labels = THIRTEEN_MONTHS.map((p) => periodLabel(p, "monthly"));
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.at(0)).toBe("Jul 25");
    expect(labels.at(-1)).toBe("Jul 26");
  });

  it("drops the day for monthly and quarterly periods", () => {
    expect(periodLabel("2025-07-01", "monthly")).toBe("Jul 25");
    expect(periodLabel("2025-07-01", "quarterly")).toBe("Q3 25");
    expect(periodLabel("2025-01-01", "quarterly")).toBe("Q1 25");
    expect(periodLabel("2025-12-01", "quarterly")).toBe("Q4 25");
  });

  it("keeps the day where periods are shorter than a month", () => {
    expect(periodLabel("2025-07-07", "weekly")).toBe("7 Jul 25");
    expect(periodLabel("2025-07-07", "fortnightly")).toBe("7 Jul 25");
    expect(periodLabel("2025-07-07", "daily")).toBe("7 Jul 25");
  });

  it("does not shift a period across a timezone boundary", () => {
    // Parsed from the string, never through Date, so the first of the month
    // cannot come back as the last of the previous one.
    expect(periodLabel("2026-01-01", "monthly")).toBe("Jan 26");
  });

  it("survives a missing date", () => {
    expect(periodLabel(null)).toBe("");
    expect(periodLabel("")).toBe("");
  });
});
