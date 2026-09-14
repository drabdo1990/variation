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

Eight chart types, picked by asking what you are counting rather than guessing
from the numbers:

| Your data | Chart | Centre | Limits |
|---|---|---|---|
| A proportion of a group, group size varies | **p** | p̄ | p̄ ± 3√(p̄(1−p̄)/nᵢ) — per point |
| A proportion of a very large group | **P′** | p̄ | p̄ ± 3σᵢ·σ_z — Laney |
| A count out of a fixed sample | **np** | np̄ | np̄ ± 3√(np̄(1−p̄)) |
| A rate over changing exposure | **u** | ū | ū ± 3√(ū/nᵢ) — per point |
| A rate over very large exposure | **U′** | ū | ū ± 3σᵢ·σ_z — Laney |
| A count over steady exposure | **c** | c̄ | c̄ ± 3√c̄ |
| A measured value per period | **XmR** | x̄ | x̄ ± 2.660·MR̄ |
| Not sure yet | **run** | median | none — non-parametric |

Proportion limits are clamped to 0–100%; count and rate limits at zero, and
a clamped limit is reported rather than hidden.

### Laney P′ and U′, for hospital-scale denominators

A p-chart assumes the only variation between periods is binomial — the luck
of sampling. Real clinical data also varies because the periods genuinely
differ: case mix, staffing, season. At the n of a ward audit nobody notices.
At the n of a trust-wide one — tens of thousands of admissions — the binomial
term shrinks to almost nothing, the limits close in on the centre line, and
ordinary month-to-month noise is reported as special cause. In the worked
test case, a standard p-chart flags **10 of 12** perfectly ordinary months.

Laney's correction measures how much the subgroups actually disagree. Each
baseline point becomes a z-score against its own uncorrected σ, and σ_z comes
from the mean moving range of those z-scores, exactly as an XmR chart takes σ
from MR̄. Binomial-only variation gives σ_z ≈ 1; a σ_z of 2.4 says the real
spread is 2.4× what the model predicts, and the limits widen to match.

σ_z is applied **unconditionally**, following Laney's published method as
Minitab implements it, so the chart also corrects *under*dispersion — limits
too wide, hiding real signals. P′ therefore differs from P even on
well-behaved data. The factor is shown on the chart rather than buried,
because it is the whole justification for the wider limits.

### Phases

Freezing a baseline answers "has anything changed?". Once the answer is yes
and the new way of working has become standard practice, those limits have
outlived their question: they describe a process that no longer exists, and
holding the new one to them reports the same old news at every point.

So a measure can be split into phases, each with its own centre line, its own
limits and its own optional frozen baseline. The corollary matters as much:
**no rule may span a boundary.** A run of eight points below the old centre
line, caused by a change the team made deliberately and has already accounted
for, is not a discovery. Rules run per phase, so it is never reported as one.

A measure that has never been split is drawn as a single phase derived from
its baseline date, so nothing about an existing measure changes.

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

### A failed save is never silent

`localStorage` holds about 5 MB, and crossing that throws on write. Swallowing
that throw is the most damaging thing the app could do: it would keep
accepting data, look entirely healthy, and lose the lot on the next refresh.
So [`storage.js`](src/lib/storage.js) returns the outcome of every write
instead of throwing, the app shows a gauge from 75% full, and an actual
failure raises a banner that says changes are no longer being saved.

The gauge is advisory — browsers differ on what counts against the cap — but
a real write failure is authoritative, and that is what the banner reports.

### Getting data out

| Export | Contains | For |
|---|---|---|
| **Project JSON** | The whole project, ids rewritten on import | Handing a project to a colleague |
| **Project CSV** | Every reading: measure, period, value, denominator, note | A spreadsheet, or checking the raw record |
| **Chart CSV** | Each point beside the centre line and limits it was judged against, and any rules it broke | The appendix of a governance report |

The chart table is the one that settles arguments: a reader can see how a
conclusion was reached without rerunning the analysis.

CSV files lead with a UTF-8 byte order mark so Excel reads accented names
correctly, and any cell starting `=`, `+`, `-` or `@` is neutralised — notes
are free text, and a spreadsheet will happily execute one. Numbers are exempt
from that guard, so a negative reading stays a number.

---

## Structure

```
src/
├── lib/
│   ├── spc.js            All chart maths, phases and rule detection
│   ├── spc.test.js       Worked examples, one per chart type
│   ├── metrics.js        Project-level derivations
│   ├── storage.js        Persistence, quota detection, the save-outcome store
│   ├── csv.js            CSV formatting, escaping and the formula guard
│   ├── reports.js        The exported tables
│   ├── download.js       One file-download path for every export
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

Recharts is bundled into its own `charts` chunk, so it caches separately from
the app code and a change to either does not invalidate the other. It is still
a static dependency of the entry graph, so every route downloads it; making
that lazy is an open improvement, not something already done.

---

## Wiring up a backend

All state flows through one reducer in
[`src/store/state.js`](src/store/state.js), and the only persistence is the
`persist()` call in [`AppStore.jsx`](src/store/AppStore.jsx), which wraps
[`storage.js`](src/lib/storage.js). Replace that effect with API calls and the
rest of the app is unchanged — components read through `useAppState()` and
hold no fetching logic.

`persist()` already reports success or failure through a subscribable store,
so a network write can surface its own errors through the same banner without
touching any component.
