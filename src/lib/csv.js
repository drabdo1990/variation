/**
 * CSV formatting, to RFC 4180, for spreadsheets a clinical team will open in
 * Excel and paste into a governance report.
 *
 * No app knowledge lives here — see `reports.js` for the tables themselves.
 */

/**
 * Excel assumes the system codepage unless a file opens with a byte order
 * mark. Without it, a name with an accent and a unit like µg arrive mangled.
 */
export const CSV_BOM = "﻿";

/**
 * A cell opening with one of these is executed as a formula by Excel, Sheets
 * and LibreOffice. Notes here are free text typed by a user, so a note reading
 * `=cmd|...` in an exported file is a genuine attack on whoever opens it.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Anything that would otherwise break the row or column structure. */
const NEEDS_QUOTING = /["\n\r,;]/;

export function escapeCell(value) {
  if (value === null || value === undefined) return "";

  /*
   * Numbers bypass the formula guard deliberately. A negative reading starts
   * with "-", and prefixing it would turn a measurement into text that no
   * longer charts or averages in the spreadsheet.
   */
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  if (NEEDS_QUOTING.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * Rows to CSV text.
 *
 * @param columns  [{ key, label, value? }] — `value(row)` overrides `row[key]`
 *                 and the header falls back to the key.
 */
export function toCsv(rows, columns) {
  const line = (cells) => cells.map(escapeCell).join(",");

  return [
    line(columns.map((c) => c.label ?? c.key)),
    ...rows.map((row) => line(columns.map((c) => (c.value ? c.value(row) : row[c.key])))),
  ].join("\r\n");
}

/** CSV text ready to be written to a file, byte order mark included. */
export function csvFile(rows, columns) {
  return CSV_BOM + toCsv(rows, columns);
}
