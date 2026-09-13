/**
 * Reading a block of spreadsheet rows pasted into the app.
 *
 * Kept out of the component that shows the dialog so it can be tested on its
 * own, which is where the awkward cases live: the column order, the header
 * row, and the half-dozen ways a date arrives.
 */

import { canonicalPeriod } from "./matrix.js";
import { parseSpreadsheetDate } from "./dates.js";

/**
 * Parse pasted spreadsheet data. Accepts tab, comma or semicolon separated
 * columns in the order the table shows them, with an optional header row.
 *
 * Dates are taken in whatever form the spreadsheet produced them — a real
 * export gives "Jul-25", not "2025-07-01" — and snapped to the measure's
 * cadence, so every pasted row lands on a period the chart can line up.
 */
export function parsePaste(text, needsDenominator, options = {}) {
  const { cadence = "monthly", denominatorFirst = false } = options;
  const errors = [];
  const rows = [];

  for (const [i, raw] of text.trim().split(/\r?\n/).entries()) {
    if (!raw.trim()) continue;
    const cells = raw.split(/\t|,|;/).map((c) => c.trim());

    // Skip a header row rather than reporting it as an error.
    if (i === 0 && Number.isNaN(Number(cells[1]))) continue;

    const [rawPeriod, first, second, ...noteParts] = cells;
    // Audit sheets are commonly laid out total-then-events, which is the
    // reverse of numerator-then-denominator and would silently plot above
    // 100% rather than failing loudly.
    const value = needsDenominator && denominatorFirst ? second : first;
    const denominator = needsDenominator && denominatorFirst ? first : second;

    const period = parseSpreadsheetDate(rawPeriod);
    if (!period) {
      errors.push(`Line ${i + 1}: "${rawPeriod}" is not a date.`);
      continue;
    }
    if (value === undefined || value === "" || Number.isNaN(Number(value))) {
      errors.push(`Line ${i + 1}: "${value ?? ""}" is not a number.`);
      continue;
    }
    if (needsDenominator && (!denominator || Number.isNaN(Number(denominator)))) {
      errors.push(`Line ${i + 1}: this chart needs a denominator column.`);
      continue;
    }

    rows.push({
      period: canonicalPeriod(period, cadence),
      value: Number(value),
      denominator: needsDenominator ? Number(denominator) : null,
      note: noteParts.join(" ").trim(),
    });
  }

  return { rows, errors };
}
