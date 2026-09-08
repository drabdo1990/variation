/**
 * Period alignment for the data-entry matrix.
 *
 * A QI team collects its whole measure family at the same time points — one
 * sitting a month, filling in the outcome, process and balancing measures
 * together. The matrix only works if those measures land on the *same*
 * period, so dates are snapped to a canonical start-of-period rather than
 * stored as whatever day the audit happened to be done.
 *
 * All arithmetic is UTC. Using local time here would shift a period across a
 * boundary for anyone east or west of GMT.
 */

const DAY = 86_400_000;

const pad = (n) => String(n).padStart(2, "0");

function toUTC(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Add months to an ISO date, returning the first of the resulting month. */
function addMonths(iso, n) {
  const [y, m] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-01`;
}

/**
 * Snap a date to the start of the period it falls in. Weekly periods start
 * on Monday, following ISO-8601 rather than the US convention.
 */
export function canonicalPeriod(iso, cadence) {
  if (!iso) return iso;
  const [y, m] = iso.split("-").map(Number);

  switch (cadence) {
    case "monthly":
      return `${y}-${pad(m)}-01`;

    case "quarterly":
      return `${y}-${pad(Math.floor((m - 1) / 3) * 3 + 1)}-01`;

    // A fortnight has no natural anchor without a reference date, so it
    // snaps to the week start and steps two weeks at a time.
    case "weekly":
    case "fortnightly": {
      const ms = toUTC(iso);
      const daysSinceMonday = (new Date(ms).getUTCDay() + 6) % 7;
      return fromUTC(ms - daysSinceMonday * DAY);
    }

    default: // daily
      return iso;
  }
}

/** The period following the given one. With no previous period, use today. */
export function nextPeriod(iso, cadence) {
  if (!iso) {
    return canonicalPeriod(new Date().toISOString().slice(0, 10), cadence);
  }
  const from = canonicalPeriod(iso, cadence);

  switch (cadence) {
    case "monthly":
      return addMonths(from, 1);
    case "quarterly":
      return addMonths(from, 3);
    case "weekly":
      return fromUTC(toUTC(from) + 7 * DAY);
    case "fortnightly":
      return fromUTC(toUTC(from) + 14 * DAY);
    default:
      return fromUTC(toUTC(from) + DAY);
  }
}

/**
 * The cadence most of a project's measures use — what the matrix suggests
 * when adding a period. Ties break towards the more frequent cadence, since
 * collecting too often is recoverable and collecting too rarely is not.
 */
export function dominantCadence(measures) {
  if (measures.length === 0) return "monthly";

  const order = ["daily", "weekly", "fortnightly", "monthly", "quarterly"];
  const counts = new Map();
  for (const m of measures) {
    counts.set(m.cadence, (counts.get(m.cadence) ?? 0) + 1);
  }

  let best = null;
  let bestCount = -1;
  for (const cadence of order) {
    const count = counts.get(cadence) ?? 0;
    if (count > bestCount) {
      best = cadence;
      bestCount = count;
    }
  }
  return best ?? "monthly";
}

/**
 * Every period the matrix should show: the union of periods already recorded
 * against any of the project's measures, plus any empty rows the user has
 * added but not yet filled in.
 */
export function collectPeriods(measures, observations, extra = []) {
  const ids = new Set(measures.map((m) => m.id));
  const periods = new Set(extra);

  for (const o of observations) {
    if (ids.has(o.measureId)) periods.add(o.period);
  }
  return [...periods].sort();
}

/** The observation for one measure in one period, if there is one. */
export function observationAt(observations, measureId, period) {
  return (
    observations.find((o) => o.measureId === measureId && o.period === period) ??
    null
  );
}

/**
 * How complete a period's row is — used to show at a glance which sittings
 * still need data, which is the commonest reason a QI chart has holes.
 */
export function rowCompleteness(measures, observations, period) {
  const filled = measures.filter((m) => {
    const o = observationAt(observations, m.id, period);
    return o && o.value !== null && o.value !== undefined;
  }).length;

  return { filled, total: measures.length, complete: filled === measures.length };
}
