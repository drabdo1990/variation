import { describe, it, expect } from "vitest";
import { parseSpreadsheetDate } from "./dates.js";

describe("parseSpreadsheetDate", () => {
  it("reads the forms a real spreadsheet produces", () => {
    // Every one of these is the same July 2025, written as Excel might.
    for (const form of [
      "2025-07-01",
      "2025-07",
      "Jul-25",
      "Jul 2025",
      "July-25",
      "01/07/2025",
      "1-Jul-25",
      "07/2025",
    ]) {
      expect(parseSpreadsheetDate(form), form).toBe("2025-07-01");
    }
  });

  it("reads Excel serial numbers", () => {
    // The serials actually stored in the user's worksheet.
    expect(parseSpreadsheetDate("45839")).toBe("2025-07-01");
    expect(parseSpreadsheetDate("45870")).toBe("2025-08-01");
    expect(parseSpreadsheetDate("46204")).toBe("2026-07-01");
  });

  it("reads slash dates day-first", () => {
    expect(parseSpreadsheetDate("13/07/2025")).toBe("2025-07-13");
  });

  it("resolves two-digit years either side of the pivot", () => {
    expect(parseSpreadsheetDate("Jan-99")).toBe("1999-01-01");
    expect(parseSpreadsheetDate("Jan-26")).toBe("2026-01-01");
  });

  it("rejects what it cannot read rather than guessing", () => {
    for (const junk of ["", "   ", "banana", "31/02/2025", "Foo-25", null, undefined]) {
      expect(parseSpreadsheetDate(junk), String(junk)).toBeNull();
    }
  });

  it("does not mistake a count for a date", () => {
    // A stray number in the date column must fail, not land in 1971.
    expect(parseSpreadsheetDate("12")).toBeNull();
    expect(parseSpreadsheetDate("1500")).toBeNull();
  });
});
