/**
 * Insights are computed from the tasks themselves — `createdAt` and
 * `completedAt` are stamped by the reducer, so throughput and cycle time
 * reflect real activity. With no shipped tasks there is nothing to plot,
 * and the UI shows an empty state rather than a fabricated trend.
 */

const DAY = 86_400_000;

export const WINDOWS = [
  { id: "6w", label: "6 weeks", buckets: 6, unit: "week" },
  { id: "6m", label: "6 months", buckets: 6, unit: "month" },
  { id: "4q", label: "4 quarters", buckets: 4, unit: "quarter" },
];

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // ISO weeks start Monday.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Ordered bucket descriptors, oldest first, ending with the current one. */
export function buildBuckets({ buckets, unit }, now = new Date()) {
  const out = [];

  for (let i = buckets - 1; i >= 0; i -= 1) {
    let start;
    let end;
    let label;

    if (unit === "week") {
      start = startOfWeek(now);
      start.setDate(start.getDate() - i * 7);
      end = new Date(start.getTime() + 7 * DAY);
      label = start.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    } else if (unit === "month") {
      start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      label = start.toLocaleDateString("en-GB", { month: "short" });
    } else {
      const q = Math.floor(now.getMonth() / 3) - i;
      start = new Date(now.getFullYear(), q * 3, 1);
      end = new Date(now.getFullYear(), q * 3 + 3, 1);
      label = `Q${Math.floor(start.getMonth() / 3) + 1} ${String(start.getFullYear()).slice(2)}`;
    }

    out.push({ label, start: start.getTime(), end: end.getTime() });
  }

  return out;
}

function inBucket(iso, bucket) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= bucket.start && t < bucket.end;
}

export function throughputSeries(tasks, window, now = new Date()) {
  return buildBuckets(window, now).map((bucket) => ({
    bucket: bucket.label,
    opened: tasks.filter((t) => inBucket(t.createdAt, bucket)).length,
    closed: tasks.filter((t) => inBucket(t.completedAt, bucket)).length,
  }));
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Days from creation to shipping, for tasks completed in each bucket. */
export function cycleTimeSeries(tasks, window, now = new Date()) {
  return buildBuckets(window, now).map((bucket) => {
    const days = tasks
      .filter((t) => inBucket(t.completedAt, bucket) && t.createdAt)
      .map(
        (t) =>
          (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) /
          DAY,
      );
    const m = median(days);
    return { bucket: bucket.label, days: m === null ? null : +m.toFixed(1) };
  });
}

/** Headline figures for the selected window, with prior-period deltas. */
export function headlineMetrics(tasks, projects, window, now = new Date()) {
  const buckets = buildBuckets(window, now);
  const span = buckets[buckets.length - 1].end - buckets[0].start;
  const priorStart = buckets[0].start - span;

  const inRange = (iso, from, to) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= from && t < to;
  };

  const from = buckets[0].start;
  const to = buckets[buckets.length - 1].end;

  const closedNow = tasks.filter((t) => inRange(t.completedAt, from, to));
  const closedPrior = tasks.filter((t) => inRange(t.completedAt, priorStart, from));

  const cycle = (list) =>
    median(
      list
        .filter((t) => t.createdAt)
        .map(
          (t) =>
            (new Date(t.completedAt).getTime() -
              new Date(t.createdAt).getTime()) /
            DAY,
        ),
    );

  const cycleNow = cycle(closedNow);
  const cyclePrior = cycle(closedPrior);

  // Only tasks that actually had a due date can be on or off target —
  // counting undated ones as misses would read as 0% forever.
  const withDue = closedNow.filter((t) => t.due);
  const onTime = withDue.filter(
    (t) => new Date(t.completedAt) <= new Date(t.due),
  ).length;
  const onTimePct = withDue.length
    ? Math.round((onTime / withDue.length) * 100)
    : null;

  const carryOver = tasks.filter((t) => t.lane !== "shipped").length;

  const delta = (current, prior) => {
    if (prior === null || prior === 0 || current === null) return null;
    return Math.round(((current - prior) / prior) * 100);
  };

  return [
    {
      id: "closed",
      label: "Closed",
      value: String(closedNow.length),
      delta: delta(closedNow.length, closedPrior.length),
      icon: "bi-check2-circle",
    },
    {
      id: "cycle",
      label: "Median cycle",
      value: cycleNow === null ? "—" : `${cycleNow.toFixed(1)}d`,
      delta: delta(cycleNow, cyclePrior),
      lowerIsBetter: true,
      icon: "bi-stopwatch",
    },
    {
      id: "ontime",
      label: "On-target",
      value: onTimePct === null ? "—" : `${onTimePct}%`,
      delta: null,
      icon: "bi-crosshair",
    },
    {
      id: "carry",
      label: "Still open",
      value: String(carryOver),
      delta: null,
      lowerIsBetter: true,
      icon: "bi-arrow-repeat",
    },
  ];
}
