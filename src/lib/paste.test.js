import { describe, it, expect } from "vitest";
import { parsePaste } from "./paste.js";

/** Copied out of the user's audit sheet, tabs and all. */
const SHEET = `date\ttotal number\tarrived in tears\tstandard
Jul-25\t21\t17\t10%
Aug-25\t18\t13\t10%
Jan-26\t12\t0\t10%`;

describe("parsePaste", () => {
  it("reads a real spreadsheet, totals first", () => {
    const { rows, errors } = parsePaste(SHEET, true, {
      cadence: "monthly",
      denominatorFirst: true,
    });

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      period: "2025-07-01",
      value: 17,
      denominator: 21,
    });
    expect(rows[2]).toMatchObject({ period: "2026-01-01", value: 0, denominator: 12 });
  });

  /*
   * The same paste without the swap. An audit sheet laid out total-then-count
   * reads as 17 out of 21 one way round and 21 out of 17 the other — a
   * proportion above 100%, which is why the option exists rather than the
   * importer quietly guessing.
   */
  it("takes the columns the other way round when told to", () => {
    const { rows } = parsePaste(SHEET, true, { cadence: "monthly" });
    expect(rows[0]).toMatchObject({ value: 21, denominator: 17 });
  });

  it("snaps every row to the collection period", () => {
    const { rows } = parsePaste("15/07/2025\t4\t20", true, { cadence: "monthly" });
    // A mid-month audit belongs to that month, not to its own row.
    expect(rows[0].period).toBe("2025-07-01");
  });

  it("skips a header row instead of reporting it", () => {
    const { errors } = parsePaste(SHEET, true, { denominatorFirst: true });
    expect(errors).toEqual([]);
  });

  it("reports a date it cannot read", () => {
    const { rows, errors } = parsePaste("not-a-date\t4\t20", true, {});
    expect(rows).toEqual([]);
    expect(errors[0]).toMatch(/is not a date/);
  });

  it("keeps the note column", () => {
    const { rows } = parsePaste("Jul-25\t4\t20\tshort list", true, {});
    expect(rows[0].note).toBe("short list");
  });

  it("takes two columns when the chart needs no denominator", () => {
    const { rows, errors } = parsePaste("Jul-25\t27.4", false, {});
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ value: 27.4, denominator: null });
  });
});
