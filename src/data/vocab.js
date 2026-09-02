/**
 * Fixed vocabulary for clinical quality improvement, following the Model
 * for Improvement. These are the choices offered in forms — unlike projects,
 * measures and observations, they are not user data.
 */

export const DEPARTMENTS = {
  anaesthetics: "Anaesthetics",
  surgery: "Surgery",
  medicine: "Medicine",
  emergency: "Emergency",
  critical: "Critical Care",
  paediatrics: "Paediatrics",
  obstetrics: "Obstetrics & Gynaecology",
  radiology: "Radiology",
  pathology: "Laboratory",
  pharmacy: "Pharmacy",
  nursing: "Nursing",
  other: "Other",
};

/** Where a QI project sits in its lifecycle. */
export const PROJECT_PHASES = {
  planning: { label: "Planning", tone: "neutral" },
  baseline: { label: "Baseline data", tone: "primary" },
  testing: { label: "Testing (PDSA)", tone: "warning" },
  implementing: { label: "Implementing", tone: "primary" },
  sustaining: { label: "Sustaining", tone: "success" },
  closed: { label: "Closed", tone: "success" },
  paused: { label: "Paused", tone: "danger" },
};

/**
 * The standard family of measures. A project needs all three to be
 * trustworthy: the outcome you want, the process you are changing, and the
 * thing you might accidentally break.
 */
export const MEASURE_ROLES = {
  outcome: {
    label: "Outcome",
    tone: "primary",
    hint: "The result you are trying to change — what the aim promises.",
  },
  process: {
    label: "Process",
    tone: "warning",
    hint: "Are the changes actually happening? Usually moves before the outcome.",
  },
  balancing: {
    label: "Balancing",
    tone: "neutral",
    hint: "What might get worse elsewhere as a side effect.",
  },
};

/** How often data is collected. Drives the "collection overdue" nudge. */
export const CADENCES = {
  daily: { label: "Daily", days: 1 },
  weekly: { label: "Weekly", days: 7 },
  fortnightly: { label: "Fortnightly", days: 14 },
  monthly: { label: "Monthly", days: 30 },
  quarterly: { label: "Quarterly", days: 91 },
};

export const DIRECTIONS = {
  lower: { label: "Lower is better", hint: "e.g. infection rate, waiting time" },
  higher: { label: "Higher is better", hint: "e.g. compliance, screening uptake" },
};

/** Rate denominators, e.g. falls per 1000 bed-days. */
export const MULTIPLIERS = {
  1: "per unit",
  100: "per 100 (%)",
  1000: "per 1,000",
  10000: "per 10,000",
};

/** How a PDSA cycle ended. */
export const CYCLE_ACTS = {
  adopt: { label: "Adopt", tone: "success", hint: "It worked — make it standard." },
  adapt: { label: "Adapt", tone: "warning", hint: "Promising — change it and test again." },
  abandon: { label: "Abandon", tone: "danger", hint: "It did not work — try something else." },
};

/**
 * The question the measure form asks to pick a chart. Deliberately phrased
 * as "what are you counting?" rather than guessing from the numbers, because
 * the right chart depends on how the data was collected, not how it looks.
 */
export const CHART_GUIDE = [
  {
    id: "p",
    question: "A proportion of a group",
    example: "% of patients who received antibiotics within 60 minutes",
    detail: "You count how many out of how many, and the group size changes each period.",
    needsDenominator: true,
  },
  {
    id: "np",
    question: "A count out of a fixed sample",
    example: "Number of non-compliant cases out of exactly 50 audited each month",
    detail: "Same as a proportion, but you audit the identical number every time.",
    needsDenominator: true,
  },
  {
    id: "u",
    question: "A rate over changing exposure",
    example: "Falls per 1,000 bed-days",
    detail: "You count events against an amount of opportunity that varies.",
    needsDenominator: true,
  },
  {
    id: "c",
    question: "A count over steady exposure",
    example: "Number of needlestick injuries per month",
    detail: "You count events and the opportunity is roughly the same each period.",
    needsDenominator: false,
  },
  {
    id: "xmr",
    question: "A measured value",
    example: "Mean theatre turnaround time each week",
    detail: "One number per period — a time, an average, a score.",
    needsDenominator: false,
  },
  {
    id: "run",
    question: "Not sure yet",
    example: "Anything — a run chart makes no assumptions",
    detail: "A median and the run rules. Always safe, and the right place to start.",
    needsDenominator: false,
  },
];

/** How a chart's verdict is shown. Keys match `interpretChart` statuses. */
export const SIGNAL_STATUS = {
  improving: { label: "Improving", tone: "success", icon: "bi-graph-up-arrow" },
  deteriorating: { label: "Deteriorating", tone: "danger", icon: "bi-graph-down-arrow" },
  stable: { label: "No signal", tone: "neutral", icon: "bi-dash-lg" },
  insufficient: { label: "Collecting data", tone: "neutral", icon: "bi-hourglass-split" },
  "past-signal": { label: "Past signal", tone: "warning", icon: "bi-clock-history" },
  signal: { label: "Signal present", tone: "warning", icon: "bi-exclamation-triangle" },
  "no-data": { label: "No data", tone: "neutral", icon: "bi-dash-lg" },
};
