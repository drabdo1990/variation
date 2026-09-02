# Variation

Run charts and Shewhart control charts for clinical quality improvement.

Variation is built around the Model for Improvement: a project has an **aim**,
a **family of measures**, and the **PDSA cycles** you run to move them. You
enter your own data and it works out the chart — then tells you whether
something has genuinely changed or the numbers just wobbled.

**Live:** https://drabdo1990.github.io/variation/

**License:** MIT — see [LICENSE](LICENSE). All code and assets are original.

---

## Why another QI tool

Most QI measurement happens in a spreadsheet, and spreadsheets get two things
wrong that matter:

**They recalculate the limits every time you add a point.** As the process
improves, the mean drifts down with it, and the improvement quietly erases
its own evidence. Variation freezes the limits from a **baseline period** and
extends them forward, so a sustained shift shows up as the special-cause
signal it is.

**They plot a single number per period.** But most clinical measures are
fractions — 43 of 50 patients, 7 falls in 1,240 bed-days — and for p- and
u-charts the control limits *move with the denominator*: wider when you
audited twenty patients, tighter when you audited two hundred. Variation
stores the numerator and denominator and steps the limits accordingly.

---

## What it does

| Screen | Purpose |
|---|---|
| **Overview** | Which measures are signalling, which have stopped being collected, what changed recently |
| **Projects** | Every QI project, its phase, and whether its measures are moving |
| **Project** | The aim, the measure family, the PDSA log, and the practical tasks around it |
| **Measure** | The chart, its signals, and fast data entry |
| **Team** | Who is involved and what they are on |

### Charts

Six chart types, picked by asking what you are counting rather than guessing
from the numbers:

| Your data | Chart | Centre | Limits |
|---|---|---|---|
| A proportion of a group, group size varies | **p** | p̄ | p̄ ± 3√(p̄(1−p̄)/nᵢ) — per point |
| A count out of a fixed sample | **np** | np̄ | np̄ ± 3√(np̄(1−p̄)) |
| A rate over changing exposure | **u** | ū | ū ± 3√(ū/nᵢ) — per point |
| A count over steady exposure | **c** | c̄ | c̄ ± 3√c̄ |
| A measured value per period | **XmR** | x̄ | x̄ ± 2.660·MR̄ |
| Not sure yet | **run** | median | none — non-parametric |

Proportion limits are clamped to 0–100%; count and rate limits at zero, and
a clamped limit is reported rather than hidden.

### Signals

Run charts use the median and the standard run rules — a **shift** of 6
points one side (points *on* the median are skipped, neither counting nor
breaking a run), a **trend** of 5 in one direction (ties skipped), and a
**runs test** for too few or too many runs.

Control charts use the mean and 3σ limits — a point **outside the limits**,
**8** points one side of centre, **6** trending, and **2 of 3** beyond 2σ.
Overlapping windows of the same rule are merged, so one finding reports once
rather than twenty times.

Every signal names the exact points it covers, and flagged points are drawn
larger with a ring as well as a colour.

---

## Design decisions worth knowing

### A verdict is only read from a signal that reaches the latest point

A series that ran high for a year and has just come down is *improving* —
but the only rule firing may still be the old high period, because the
recent run is not yet long enough to qualify. Reading the verdict off the
most recent *flagged* point reports that backwards. Variation looks for a
signal covering the **last** data point; if there is none it says
**"past signal"** rather than claiming a direction it cannot support.

This was a real bug, caught by entering falls data that dropped from ten a
month to three and watching the badge say "Deteriorating". There is a
regression test for it in [`spc.test.js`](src/lib/spc.test.js).

### The statistics are tested before they are drawn

[`src/lib/spc.js`](src/lib/spc.js) is pure arithmetic with no dependencies,
and [`spc.test.js`](src/lib/spc.test.js) checks every chart type against a
worked example whose expected centre line and limits are computed
independently and written out in a comment above the case. There are also
tests for points sitting exactly on the median, ties in a trend, and — most
importantly — that frozen baseline limits **do not move** when improving data
is appended.

A control chart that is subtly wrong is worse than no control chart, because
you would believe it.

### Nothing is stored that can be computed

Projects hold dates and a phase; observations hold a value and a denominator.
Progress, signals, collection status and every limit are derived. Add one
data point and the chart, the project's verdict and the portfolio Overview
all update together, because none of them were written down.

### Your data stays in your browser

Everything persists to `localStorage` under `variation.state.v1`. There is no
account, no server, and nothing is transmitted. Enter **aggregate numbers
only** — never patient identifiers; the data entry screen says so too.

To share a project, export it as JSON and send the file. Import rewrites the
ids, so a colleague can take your project without it colliding with theirs.

---

## Structure

```
src/
├── lib/
│   ├── spc.js            All chart maths and rule detection
│   ├── spc.test.js       Worked examples, one per chart type
│   ├── metrics.js        Project-level derivations
│   └── format.js         Dates and initials
├── store/                state.js (reducer) · AppStore.jsx · context.js
├── data/                 vocab.js (fixed choices) · sample.js (worked example)
├── styles/               tokens.css · base.css · layout.css
├── components/
│   ├── layout/           AppShell · SideNav · TopBar
│   └── ui/               Modal · Field · Pill · Panel · Avatar · EmptyState …
├── features/
│   ├── overview/         SummaryTiles · SignalList · CollectionDue · PhaseMix
│   ├── projects/         ProjectsPage · ProjectDetailPage · ProjectCard · ProjectForm
│   ├── measures/         MeasureDetailPage · ChartCanvas · ObservationTable · Sparkline
│   ├── cycles/           CycleForm
│   └── people/           PeoplePage · PersonCard · PersonForm
└── router/               AppRouter.jsx
```

Every colour, radius and shadow resolves to a token in
[`tokens.css`](src/styles/tokens.css).

---

## Accessibility

Audited programmatically against the live DOM across every route, including
the dialogs and the chart pages:

- **Contrast:** 0 failures against WCAG AA.
- **Touch targets:** 0 interactive elements under 44×44px on touch. Compact
  36px controls appear only under `pointer: fine`. Inline breadcrumb links
  inside a sentence use the WCAG 2.5.8 inline exception.
- **Layout:** 0 horizontal page overflow from 375px up. Wide tables and
  charts scroll inside their own container.
- **Charts:** flagged points are marked by size and shape as well as colour;
  every signal is also written out as text beneath the chart.
- **Keyboard:** visible focus rings, dialogs trap focus and restore it, and
  Escape closes them.
- **Motion:** honours `prefers-reduced-motion`.

---

## Running it

```bash
npm install
npm run dev
```

```bash
npm test       # the statistics and the store
npm run build
npm run lint
```

Charts are code-split, so routes without one never download Recharts.

---

## Wiring up a backend

All state flows through one reducer in
[`src/store/state.js`](src/store/state.js), and the only persistence is the
`localStorage` write in [`AppStore.jsx`](src/store/AppStore.jsx). Replace that
effect with API calls and the rest of the app is unchanged — components read
through `useAppState()` and hold no fetching logic.
