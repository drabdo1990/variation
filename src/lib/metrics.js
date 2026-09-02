/**
 * Derived values for QI projects. Nothing here is stored — progress,
 * signals and collection status are all computed from the measures and
 * their observations, so adding one data point updates every screen.
 */

import { computeChart, interpretChart } from "./spc.js";
import { CADENCES } from "../data/vocab.js";

const DAY = 86_400_000;

export function measuresOf(measures, projectId) {
  return measures.filter((m) => m.projectId === projectId);
}

export function observationsOf(observations, measureId) {
  return observations.filter((o) => o.measureId === measureId);
}

export function cyclesOf(cycles, projectId) {
  return cycles
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.number - b.number);
}

export function tasksOf(tasks, projectId) {
  return tasks.filter((t) => t.projectId === projectId);
}

/** Chart plus verdict for one measure. */
export function measureStatus(measure, observations) {
  const chart = computeChart(measure, observations);
  return { chart, verdict: interpretChart(chart, measure) };
}

/**
 * Whether a measure is due another data point. A measure that has stopped
 * being collected is the commonest way a QI project quietly dies, so this
 * is surfaced rather than left to be noticed.
 */
export function collectionStatus(measure, observations, today = new Date()) {
  const mine = observationsOf(observations, measure.id);
  if (mine.length === 0) {
    return { state: "none", label: "No data yet", overdueBy: null };
  }

  const latest = mine
    .map((o) => o.period)
    .sort()
    .at(-1);

  const interval = CADENCES[measure.cadence]?.days ?? 30;
  const elapsed = (today.getTime() - new Date(latest).getTime()) / DAY;

  // One full interval of slack before nagging; two means it has lapsed.
  if (elapsed > interval * 2) {
    return {
      state: "overdue",
      label: "Collection overdue",
      overdueBy: Math.round(elapsed - interval),
      latest,
    };
  }
  if (elapsed > interval) {
    return { state: "due", label: "Data due", overdueBy: null, latest };
  }
  return { state: "current", label: "Up to date", overdueBy: null, latest };
}

/**
 * A project's headline verdict. Outcome measures decide it — a process
 * measure moving while the outcome does not is exactly the situation a QI
 * lead needs to see, so it must not be averaged away.
 */
export function projectSignal(project, measures, observations) {
  const mine = measuresOf(measures, project.id);
  if (mine.length === 0) return { status: "no-measures", label: "No measures" };

  const outcomes = mine.filter((m) => m.role === "outcome");
  const judged = (outcomes.length ? outcomes : mine).map(
    (m) => measureStatus(m, observations).verdict,
  );

  if (judged.some((v) => v.status === "deteriorating")) {
    return { status: "deteriorating", label: "Deteriorating" };
  }
  if (judged.some((v) => v.status === "improving")) {
    return { status: "improving", label: "Improving" };
  }
  if (judged.every((v) => v.status === "no-data")) {
    return { status: "no-data", label: "No data" };
  }
  if (judged.some((v) => v.status === "insufficient")) {
    return { status: "insufficient", label: "Collecting data" };
  }
  return { status: "stable", label: "No signal" };
}

/** Headline tiles for the Overview. */
export function portfolioSummary(
  { projects, measures, observations, cycles },
  today = new Date(),
) {
  const active = projects.filter(
    (p) => !["closed", "paused"].includes(p.phase),
  );

  const improving = projects.filter(
    (p) => projectSignal(p, measures, observations).status === "improving",
  );

  const lapsed = measures.filter(
    (m) => collectionStatus(m, observations, today).state === "overdue",
  );

  const openCycles = cycles.filter((c) => !c.act);

  return [
    {
      id: "active",
      label: "Active projects",
      value: active.length,
      icon: "bi-clipboard2-pulse",
      hint: `${projects.length} total`,
    },
    {
      id: "improving",
      label: "Showing improvement",
      value: improving.length,
      icon: "bi-graph-up-arrow",
      hint: improving.length ? "Signal in the outcome measure" : "No signals yet",
      tone: improving.length ? "success" : undefined,
    },
    {
      id: "lapsed",
      label: "Collection overdue",
      value: lapsed.length,
      icon: "bi-calendar-x",
      hint: lapsed.length ? "Measures needing data" : "All measures current",
      tone: lapsed.length ? "warning" : "success",
    },
    {
      id: "cycles",
      label: "Open PDSA cycles",
      value: openCycles.length,
      icon: "bi-arrow-repeat",
      hint: `${cycles.length} run in total`,
    },
  ];
}

export function phaseCounts(projects) {
  const counts = new Map();
  for (const project of projects) {
    counts.set(project.phase, (counts.get(project.phase) ?? 0) + 1);
  }
  return counts;
}

/** Measures currently signalling, across every project — for the Overview. */
export function signallingMeasures({ projects, measures, observations }) {
  return measures
    .map((measure) => {
      const { chart, verdict } = measureStatus(measure, observations);
      const project = projects.find((p) => p.id === measure.projectId);
      return { measure, project, chart, verdict };
    })
    .filter(
      (row) =>
        row.project &&
        ["improving", "deteriorating", "signal", "past-signal"].includes(
          row.verdict.status,
        ),
    );
}

export function findPerson(people, id) {
  return people.find((person) => person.id === id) ?? null;
}

export function findPeople(people, ids = []) {
  return ids.map((id) => findPerson(people, id)).filter(Boolean);
}
