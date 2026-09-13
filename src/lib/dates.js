/**
 * Reading dates out of a spreadsheet.
 *
 * Nobody types `2025-07-01` into Excel. They type `Jul-25`, or the cell is
 * formatted that way, or the copy carries `01/07/2025`, or — if the paste
 * went through a CSV on the way — the raw serial number `45839`. Rejecting
 * all of those and demanding ISO is a fair rule for a machine and a useless
 * one for a clinician with an audit sheet in front of them.
 *
 * Everything is resolved in UTC and returned as `YYYY-MM-DD`; the caller
 * snaps it to the measure's cadence.
 */

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

/**
 * Excel counts days from 1900-01-01 as day 1, and wrongly believes 1900 was
 * a leap year — so from March 1900 onwards its serials are one day ahead of
 * reality. The epoch below already absorbs that, which is why 45839 comes
 * back as 1 July 2025 rather than the 2nd.
 */
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const DAY = 86_400_000;

/** Two-digit years: 70–99 are last century, 00–69 are this one. */
function fullYear(n) {
  if (n >= 100) return n;
  return n >= 70 ? 1900 + n : 2000 + n;
}

function valid(y, m, d) {
  if (!Number.isInteger(y) || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  // Catches 31 February and friends, which Date would roll forward silently.
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return iso(y, m, d);
}

/**
 * Parse a date cell into `YYYY-MM-DD`, or null if it cannot be read.
 *
 * Day-first is assumed for ambiguous slash dates (`01/07/2025` is 1 July),
 * matching UK practice — which is also the only reading that can be right
 * for a user writing `13/07/2025`.
 */
export function parseSpreadsheetDate(input) {
  if (input === null || input === undefined) return null;
  const text = String(input).trim();
  if (!text) return null;

  // 2025-07-01
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch.map(Number);
    return valid(y, m, d);
  }

  // 2025-07 — a month with no day is the first of that month.
  const isoMonth = text.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMonth) {
    const [, y, m] = isoMonth.map(Number);
    return valid(y, m, 1);
  }

  // Jul-25, Jul 2025, July-25
  const monthYear = text.match(/^([A-Za-z]{3,9})[\s\-/](\d{2,4})$/);
  if (monthYear) {
    const month = MONTHS[monthYear[1].slice(0, 3).toLowerCase()];
    if (month) return valid(fullYear(Number(monthYear[2])), month, 1);
  }

  // 01-Jul-25, 1 Jul 2025
  const dayMonthYear = text.match(/^(\d{1,2})[\s\-/]([A-Za-z]{3,9})[\s\-/](\d{2,4})$/);
  if (dayMonthYear) {
    const month = MONTHS[dayMonthYear[2].slice(0, 3).toLowerCase()];
    if (month) {
      return valid(fullYear(Number(dayMonthYear[3])), month, Number(dayMonthYear[1]));
    }
  }

  // 01/07/2025 and 07/2025
  const slash = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (slash) {
    const [, a, b, c] = slash.map(Number);
    return valid(fullYear(c), b, a);
  }
  const monthSlashYear = text.match(/^(\d{1,2})[/\-.](\d{4})$/);
  if (monthSlashYear) {
    const [, m, y] = monthSlashYear.map(Number);
    return valid(y, m, 1);
  }

  // A bare Excel serial. Bounded to a plausible range so a stray count in
  // the date column is reported as a bad date rather than parsed as 1904.
  if (/^\d{4,6}$/.test(text)) {
    const serial = Number(text);
    if (serial >= 20000 && serial <= 80000) {
      return new Date(EXCEL_EPOCH + serial * DAY).toISOString().slice(0, 10);
    }
  }

  return null;
}
