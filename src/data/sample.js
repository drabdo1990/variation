/**
 * A worked example, offered from the empty state.
 *
 * One peri-operative QI project with the full family of measures and two
 * PDSA cycles. The observation history is generated relative to today and
 * is shaped so the charts show something real: the process measure moves
 * first, the outcome follows after the second cycle, and the balancing
 * measure stays flat — which is exactly what a successful project looks
 * like, and what makes the charts worth reading.
 */

const DAY = 86_400_000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const weeksAgo = (n) => iso(Date.now() - n * 7 * DAY);

/** Deterministic jitter, so the sample looks natural but never changes. */
function wobble(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x); // 0..1
}

export function sampleState(settings = { userName: "" }) {
  const people = [
    { id: "s-p1", name: "Sara Whitfield", role: "Consultant Anaesthetist", department: "anaesthetics" },
    { id: "s-p2", name: "Idris Bello", role: "Anaesthetic Registrar", department: "anaesthetics" },
    { id: "s-p3", name: "Helen Marsh", role: "Theatre Sister", department: "nursing" },
    { id: "s-p4", name: "Rafael Ortiz", role: "Clinical Audit Lead", department: "other" },
  ];

  const projects = [
    {
      id: "s-pr1",
      name: "Antibiotic prophylaxis on time",
      aim: "Increase the proportion of elective orthopaedic patients receiving surgical antibiotic prophylaxis within 60 minutes of knife-to-skin from 62% to 90% by the end of the financial year.",
      department: "anaesthetics",
      phase: "testing",
      leadId: "s-p1",
      memberIds: ["s-p1", "s-p2", "s-p3"],
      // A year of history: long enough that the monthly outcome measure
      // has the ~12 points a signal needs before it means anything.
      startDate: weeksAgo(52),
      targetDate: iso(Date.now() + 120 * DAY),
    },
    {
      id: "s-pr2",
      name: "Reducing post-op nausea",
      aim: "Reduce the rate of clinically significant post-operative nausea and vomiting in day-case laparoscopic surgery from 28% to under 15% within twelve months.",
      department: "anaesthetics",
      phase: "baseline",
      leadId: "s-p2",
      memberIds: ["s-p2", "s-p4"],
      startDate: weeksAgo(10),
      targetDate: iso(Date.now() + 260 * DAY),
    },
  ];

  // The two PDSA cycles, in weeks before today. Everything downstream —
  // the baseline cut-off and both step changes — keys off these.
  const CYCLE_1 = 30;
  const CYCLE_2 = 16;

  const cycles = [
    {
      id: "s-c1",
      projectId: "s-pr1",
      number: 1,
      title: "Prompt card on the anaesthetic machine",
      plan: "Laminated card at every orthopaedic list reminding the team to give prophylaxis at induction. Sara to place them, Helen to replace weekly.",
      prediction: "Compliance rises from around 60% to about 75% within a month.",
      doNotes: "Cards placed on four of five machines in week one; the fifth was missed until week two.",
      studyNotes: "Compliance improved but only to the mid-seventies, and slipped on lists where the card had gone missing.",
      act: "adapt",
      startDate: weeksAgo(CYCLE_1),
      endDate: weeksAgo(CYCLE_2 + 1),
      annotate: true,
    },
    {
      id: "s-c2",
      projectId: "s-pr1",
      number: 2,
      title: "Prophylaxis added to the WHO checklist pause",
      plan: "Add an explicit 'antibiotics given?' item to the team brief, read aloud by the scrub practitioner.",
      prediction: "Compliance rises above 90% and holds, because the check no longer depends on anyone remembering.",
      doNotes: "Running on all orthopaedic lists since the start of the month.",
      studyNotes: "Compliance moved above 90% and has held there. Waiting to see whether the infection rate follows before adopting.",
      act: null,
      startDate: weeksAgo(CYCLE_2),
      endDate: null,
      annotate: true,
    },
  ];

  const measures = [
    {
      id: "s-m1",
      projectId: "s-pr1",
      name: "Prophylaxis within 60 minutes",
      role: "process",
      chartType: "p",
      unit: "%",
      multiplier: 100,
      direction: "higher",
      goal: 90,
      cadence: "weekly",
      baselineEnd: weeksAgo(CYCLE_1),
    },
    {
      id: "s-m2",
      projectId: "s-pr1",
      name: "Surgical site infections",
      role: "outcome",
      chartType: "u",
      unit: "per 1,000 procedures",
      multiplier: 1000,
      direction: "lower",
      goal: null,
      cadence: "monthly",
      baselineEnd: weeksAgo(CYCLE_1),
    },
    {
      id: "s-m3",
      projectId: "s-pr1",
      name: "Anaesthetic room turnaround",
      role: "balancing",
      chartType: "xmr",
      unit: "minutes",
      multiplier: 1,
      direction: "lower",
      goal: null,
      cadence: "weekly",
      baselineEnd: weeksAgo(CYCLE_1),
    },
    {
      id: "s-m4",
      projectId: "s-pr2",
      name: "PONV within 24 hours",
      role: "outcome",
      chartType: "p",
      unit: "%",
      multiplier: 100,
      direction: "lower",
      goal: 15,
      cadence: "weekly",
      baselineEnd: null,
    },
  ];

  const observations = [];
  let n = 0;
  const push = (measureId, week, value, denominator, note = "") =>
    observations.push({
      id: `s-o${n++}`,
      measureId,
      period: weeksAgo(week),
      value,
      denominator,
      note,
    });

  // --- Process measure: weekly, stepping up after each cycle ------------
  for (let w = 52; w >= 0; w -= 1) {
    const sampled = 18 + Math.round(wobble(w) * 10); // 18–28 cases audited
    const rate =
      w > CYCLE_1 ? 0.62 : w > CYCLE_2 ? 0.76 : 0.93; // the two step changes
    const jitter = (wobble(w * 3) - 0.5) * 0.1;
    const compliant = Math.max(
      0,
      Math.min(sampled, Math.round(sampled * (rate + jitter))),
    );
    push("s-m1", w, compliant, sampled);
  }

  // --- Outcome measure: monthly, lagging the process improvement --------
  // Volumes are those of a regional centre (600-900 elective procedures a
  // month). At a lower volume the monthly infection count would be three or
  // four, and a halving of the rate genuinely would not be detectable in a
  // year of data — the chart would be right to stay silent.
  for (let m = 12; m >= 0; m -= 1) {
    const week = m * 4;
    const procedures = 620 + Math.round(wobble(m * 7) * 280);
    const perThousand = week > CYCLE_1 ? 19 : week > CYCLE_2 ? 16 : 9;
    const infections = Math.max(
      0,
      Math.round((perThousand / 1000) * procedures + (wobble(m * 11) - 0.5) * 3),
    );
    push("s-m2", week, infections, procedures);
  }

  // --- Balancing measure: turnaround time, deliberately unchanged -------
  for (let w = 52; w >= 0; w -= 1) {
    const minutes = 21 + (wobble(w * 5) - 0.5) * 6;
    push("s-m3", w, Math.round(minutes * 10) / 10, null);
  }

  // --- Second project: baseline only, not enough data to say anything ---
  for (let w = 9; w >= 0; w -= 1) {
    const sampled = 22 + Math.round(wobble(w * 13) * 8);
    const affected = Math.round(sampled * (0.28 + (wobble(w * 17) - 0.5) * 0.12));
    push("s-m4", w, Math.max(0, affected), sampled);
  }

  return {
    projects,
    measures,
    observations,
    cycles,
    tasks: [
      {
        id: "s-t1",
        projectId: "s-pr1",
        title: "Ask pharmacy for the monthly prophylaxis extract",
        detail: "",
        done: true,
        due: null,
        assigneeIds: ["s-p2"],
      },
      {
        id: "s-t2",
        projectId: "s-pr1",
        title: "Present the run charts at the governance meeting",
        detail: "",
        done: false,
        due: null,
        assigneeIds: ["s-p1"],
      },
    ],
    people,
    events: [
      {
        id: "s-e1",
        at: new Date().toISOString(),
        kind: "project.import",
        subject: "Worked example",
        detail: "loaded — clear it any time from the topbar",
      },
    ],
    settings,
  };
}
