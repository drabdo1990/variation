# Cadence

A delivery dashboard for engineering leads: what is shipping, who is
overloaded, and which projects are drifting against their dates.

**Cadence starts empty.** You add your own people, projects, and tasks —
every number on every screen is calculated from what you enter. Nothing is
seeded, and nothing leaves your browser.

Built from scratch with React 19, React Router, Bootstrap 5, Recharts, and Vite.

**License:** MIT — see [LICENSE](LICENSE). All code, data, and assets in
this repository are original or MIT/permissively licensed.

---

## What it does

| Screen        | Purpose |
|---------------|---------|
| **Overview**  | Portfolio summary, projects needing a decision, phase mix, activity feed, and your approval queue |
| **Portfolio** | Every project with derived progress and health, filterable by phase |
| **People**    | Team roster sorted by workload, filterable by guild |
| **Board**     | Four-lane task board with drag-and-drop *and* keyboard moves |
| **Insights**  | Throughput and cycle time over three reporting windows, plus a delivery table |

---

## Design decisions worth knowing

### Nothing is stored that can be computed

Projects store only their dates and phase; tasks store their lane and
timestamps. Progress, health, workload, throughput, and cycle time are all
derived in [`src/lib/metrics.js`](src/lib/metrics.js) and
[`src/lib/insights.js`](src/lib/insights.js).

Dragging one card to *Shipped* therefore updates project progress, the
owner's workload, the portfolio health tile, and the delivery charts at
once — because none of those were ever written down.

Health compares **schedule elapsed** against **scope completed**. A project
that has burned 80% of its calendar but finished 40% of its work is
*Behind*, regardless of which phase it claims to be in. A project with no
tasks yet reads *No tasks* rather than a misleading 0%.

### The charts plot your actual history

`createdAt` and `completedAt` are stamped by the reducer when a task is
created and when it reaches Shipped. Throughput and median cycle time are
bucketed from those timestamps — so the Insights page is empty until you
have shipped something, instead of showing an invented trend.

### Workload is computed from real assignments

A person's load comes from their open tasks measured against their declared
weekly capacity. Someone with no capacity who still holds work reads as
fully overloaded rather than dividing by zero.

### State lives in your browser

Everything persists to `localStorage` under `cadence.state.v1`, written by
the reducer in [`src/store/`](src/store/). There is no account and no
server. A **Load sample data** button in the empty state fills in a demo
team if you want to see the app populated; the reset control in the topbar
clears it again.

### Routes live in the URL hash

The app uses `HashRouter`, so links look like `/#/portfolio`. This is what
lets a refresh or a deep link work on a static host — GitHub Pages
included — with no server-side rewrite rules.

### Avatars are generated

Initials on a hue derived from the name — deterministic, no image
requests, and no third-party photo licensing to worry about.

### Drag-and-drop has a keyboard equivalent

The board uses the native HTML5 drag-and-drop API (no DnD library). Every
card also carries arrow buttons that step it between lanes, so the board
is fully operable without a pointer.

### Colour tokens separate *fill* from *text*

Semantic colours ship in two values: a vivid one for bars, dots, and
chart marks, and a darker `-text` one for type. The vivid values are too
light to carry text at 4.5:1 on their own tinted backgrounds, so they are
never used for words.

---

## Accessibility

Audited programmatically against the live DOM across all five routes:

- **Contrast:** 0 failures. Every text/background pair meets WCAG AA
  (4.5:1, or 3:1 for large text).
- **Touch targets:** 0 interactive elements under 44×44px on touch
  devices. Compact 36px controls are used only where `pointer: fine`.
- **Keyboard:** visible `:focus-visible` rings throughout; the board is
  operable without dragging; filters are real radio groups.
- **Motion:** honours `prefers-reduced-motion`.
- **Layout:** 0 horizontal overflow at 375px through 1440px.

---

## Structure

```
src/
├── store/         state.js (reducer) · AppStore.jsx (provider + persistence)
│                  context.js (hooks)
├── data/          vocab.js (fixed choices) · sample.js (opt-in demo)
├── lib/           metrics.js · insights.js · format.js
├── styles/        tokens.css · base.css · layout.css
├── components/
│   ├── layout/    AppShell · SideNav · TopBar
│   └── ui/        Avatar · AvatarStack · Pill · Panel · Meter · Modal ·
│                  Field · SegmentedControl · PageHeader · EmptyState
├── features/
│   ├── welcome/   WelcomeDialog
│   ├── overview/  SummaryTiles · AtRiskList · PhaseMix · ActivityFeed
│   ├── portfolio/ ProjectCard · ProjectForm
│   ├── people/    PersonCard · PersonForm
│   ├── board/     useBoard · BoardLane · TaskCard · TaskForm
│   └── insights/  HeadlineRow · ThroughputChart · CycleTimeChart ·
│                  DeliveryTable · chartTheme.js
└── router/        AppRouter.jsx (HashRouter)
```

Every colour, radius, and shadow resolves to a token in
[`tokens.css`](src/styles/tokens.css). Components do not hard-code hex
values.

---

## Running it

Requires Node 18 or newer (CI builds on Node 20).

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

```bash
npm run build     # production build to dist/
npm run preview   # serve the built dist/ locally
npm run lint      # eslint — the only automated check; there is no test suite
```

Charts are code-split into their own chunk, so routes that do not render
a chart never download Recharts.

---

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds the
site and publishes `dist/` to GitHub Pages on every push to `main` (and on
a manual run). Because [`vite.config.js`](vite.config.js) sets
`base: "./"`, the same build works whether it is served from a domain root
or a Pages project subpath — no per-environment configuration.

---

## Wiring up a backend

All state flows through one reducer in
[`src/store/state.js`](src/store/state.js), and the only persistence is the
`localStorage` write in [`AppStore.jsx`](src/store/AppStore.jsx). Swap that
effect for API calls and the rest of the app is unchanged — components read
through `useAppState()` and hold no fetching logic of their own.
