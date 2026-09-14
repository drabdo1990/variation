import { describe, it, expect } from "vitest";
import { escapeCell, toCsv, csvFile, CSV_BOM } from "./csv.js";
import { chartRows, observationRows, fileStem, CHART_COLUMNS } from "./reports.js";
import { computeChart } from "./spc.js";

describe("escapeCell", () => {
  it("leaves ordinary text alone", () => {
    expect(escapeCell("Theatre 3")).toBe("Theatre 3");
  });

  it("renders nothing for null and undefined", () => {
    expect(escapeCell(null)).toBe("");
    expect(escapeCell(undefined)).toBe("");
  });

  it("quotes separators and newlines, doubling interior quotes", () => {
    expect(escapeCell("a,b")).toBe('"a,b"');
    expect(escapeCell("a;b")).toBe('"a;b"');
    expect(escapeCell("line\nbreak")).toBe('"line\nbreak"');
    expect(escapeCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("defuses a formula so a note cannot execute on open", () => {
    // Notes are free text. Excel, Sheets and LibreOffice all run a cell
    // beginning with one of these, so the export must neutralise it.
    expect(escapeCell("=1+1")).toBe("'=1+1");
    expect(escapeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCell("+44 20 7946")).toBe("'+44 20 7946");
    expect(escapeCell("-- note")).toBe("'-- note");
  });

  it("quotes a defused formula that also contains a separator", () => {
    expect(escapeCell("=cmd|'/c calc',1")).toBe(`"'=cmd|'/c calc',1"`);
  });

  it("never prefixes a negative number, which would make it text", () => {
    // The formula guard must not corrupt a reading: a cell of '-4 would no
    // longer chart or average in the spreadsheet.
    expect(escapeCell(-4)).toBe("-4");
    expect(escapeCell(-4.25)).toBe("-4.25");
    expect(escapeCell(0)).toBe("0");
  });

  it("renders a non-finite number as empty rather than NaN", () => {
    expect(escapeCell(NaN)).toBe("");
    expect(escapeCell(Infinity)).toBe("");
  });
});

describe("toCsv", () => {
  const columns = [
    { key: "a", label: "First" },
    { key: "b", label: "Second" },
  ];

  it("writes a header from the labels and CRLF line endings", () => {
    const out = toCsv([{ a: 1, b: "x" }], columns);
    expect(out).toBe("First,Second\r\n1,x");
  });

  it("falls back to the key when a column has no label", () => {
    expect(toCsv([], [{ key: "raw" }])).toBe("raw");
  });

  it("supports a derived column", () => {
    const out = toCsv([{ a: 2, b: 3 }], [{ key: "sum", label: "Sum", value: (r) => r.a + r.b }]);
    expect(out).toBe("Sum\r\n5");
  });

  it("writes a header-only file for no rows", () => {
    expect(toCsv([], columns)).toBe("First,Second");
  });
});

describe("csvFile", () => {
  it("leads with a byte order mark so Excel reads it as UTF-8", () => {
    const out = csvFile([{ a: "Dr Ahmed Alì" }], [{ key: "a", label: "Name" }]);
    expect(out.startsWith(CSV_BOM)).toBe(true);
    expect(out).toContain("Dr Ahmed Alì");
  });
});

describe("fileStem", () => {
  it("slugifies a project name", () => {
    expect(fileStem("Sepsis: door to needle (ED)")).toBe("sepsis-door-to-needle-ed");
  });

  it("falls back rather than producing an empty filename", () => {
    expect(fileStem("***")).toBe("export");
  });
});

/* ==================================================================== *
 * The tables themselves
 * ==================================================================== */

const measure = {
  id: "m1",
  projectId: "pr1",
  name: "Antibiotics within 60 min",
  role: "process",
  chartType: "p",
  multiplier: 100,
  unit: "%",
  direction: "higher",
  baselineEnd: null,
  goal: null,
};

const observations = [
  [20, 100], [25, 100], [30, 100], [22, 100], [28, 100], [24, 100],
  [26, 100], [23, 100], [27, 100], [21, 100], [29, 100], [25, 100],
].map(([value, denominator], i) => ({
  id: `o${i}`,
  measureId: "m1",
  period: `2026-01-${String(i + 1).padStart(2, "0")}`,
  value,
  denominator,
  note: "",
}));

describe("chartRows", () => {
  // Same worked p-chart as spc.test.js: centre 25%, limits 12.009619-37.990381.
  const chart = computeChart(measure, observations);

  it("puts every point beside the limits it was judged against", () => {
    const rows = chartRows(chart);
    expect(rows).toHaveLength(12);
    expect(rows[0]).toMatchObject({
      period: "2026-01-01",
      value: 20,
      denominator: 100,
      plotted: 20,
      centre: 25,
      lcl: 12.009619,
      ucl: 37.990381,
    });
  });

  it("names the rules a point broke", () => {
    const breached = computeChart(measure, [
      ...observations,
      { id: "x", measureId: "m1", period: "2026-02-01", value: 90, denominator: 100, note: "" },
    ]);
    const rows = chartRows(breached);
    expect(rows.at(-1).violations).toContain("beyond-limits");
  });

  it("is empty for a chart with no data", () => {
    expect(chartRows(computeChart(measure, []))).toEqual([]);
  });

  it("produces a spreadsheet with one header and one row per point", () => {
    const text = csvFile(chartRows(chart), CHART_COLUMNS);
    expect(text.split("\r\n")).toHaveLength(13);
  });
});

describe("observationRows", () => {
  const state = {
    projects: [{ id: "pr1", name: "Sepsis" }],
    measures: [measure],
    observations: [
      { ...observations[1], note: "=1+1" },
      observations[0],
      { id: "other", measureId: "elsewhere", period: "2026-01-01", value: 1, denominator: 1 },
    ],
  };

  it("returns only this project's observations, in period order", () => {
    const rows = observationRows(state, "pr1");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.period)).toEqual(["2026-01-01", "2026-01-02"]);
  });

  it("labels the role and chart for a reader who does not know the codes", () => {
    const [row] = observationRows(state, "pr1");
    expect(row).toMatchObject({
      project: "Sepsis",
      measure: "Antibiotics within 60 min",
      role: "Process",
      chart: "p-chart (proportion)",
      plotted: 20,
    });
  });

  it("carries a note through the formula guard on the way to a file", () => {
    const text = csvFile(observationRows(state, "pr1"), [
      { key: "note", label: "Note" },
    ]);
    expect(text).toContain("'=1+1");
  });
});
