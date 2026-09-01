/**
 * Opt-in demo content, offered from the Overview empty state.
 *
 * Timestamps are generated relative to today so the Insights charts have
 * genuine history to plot — the sample is built the same way the app
 * would build it, not with pre-baked chart series.
 */

const DAY = 86_400_000;
const ago = (days) => new Date(Date.now() - days * DAY).toISOString();
const dateAgo = (days) => ago(days).slice(0, 10);
const dateIn = (days) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

export function sampleState(settings = { userName: "" }) {
  const people = [
    { id: "s-p1", name: "Amara Okafor", title: "Frontend Engineer", guild: "web", presence: "onsite", timezone: "GMT+1", weeklyCapacity: 36 },
    { id: "s-p2", name: "Tomas Vidal", title: "Backend Engineer", guild: "platform", presence: "remote", timezone: "GMT-3", weeklyCapacity: 36 },
    { id: "s-p3", name: "Priya Iyer", title: "Product Designer", guild: "product", presence: "onsite", timezone: "GMT+5:30", weeklyCapacity: 30 },
    { id: "s-p4", name: "Ewan Clarke", title: "QA Lead", guild: "quality", presence: "remote", timezone: "GMT+1", weeklyCapacity: 34 },
    { id: "s-p5", name: "Jonas Berg", title: "Platform Engineer", guild: "platform", presence: "away", timezone: "GMT+2", weeklyCapacity: 0 },
  ];

  const projects = [
    {
      id: "s-pr1",
      name: "Checkout Rebuild",
      summary: "Replace the legacy checkout with a three-step flow",
      phase: "building",
      leadId: "s-p1",
      memberIds: ["s-p1", "s-p3"],
      startDate: dateAgo(70),
      targetDate: dateIn(45),
    },
    {
      id: "s-pr2",
      name: "Billing API v2",
      summary: "Versioned billing endpoints with idempotency keys",
      phase: "hardening",
      leadId: "s-p2",
      memberIds: ["s-p2", "s-p4", "s-p5"],
      startDate: dateAgo(120),
      targetDate: dateIn(18),
    },
    {
      id: "s-pr3",
      name: "Design Tokens",
      summary: "Shared token pipeline across web and mobile",
      phase: "shipped",
      leadId: "s-p3",
      memberIds: ["s-p3"],
      startDate: dateAgo(150),
      targetDate: dateAgo(20),
    },
    {
      id: "s-pr4",
      name: "Search Relevance",
      summary: "Re-rank results with click-through feedback",
      phase: "discovery",
      leadId: "s-p1",
      memberIds: ["s-p1", "s-p2"],
      startDate: dateAgo(30),
      targetDate: dateIn(80),
    },
  ];

  /**
   * [id, title, project, lane, urgency, assignees, createdDaysAgo,
   *  shippedDaysAgo|null, dueDaysFromNow] — a negative due is in the past.
   * Shipped rows carry a due date too, so the on-target figure is a real
   * mix of hits and misses rather than a vacuous 100%.
   */
  const rows = [
    ["s-t1", "Split payment step into its own route", "s-pr1", "active", "critical", ["s-p1"], 24, null, 6],
    ["s-t2", "Cart state across step boundaries", "s-pr1", "review", "normal", ["s-p1", "s-p3"], 30, null, 3],
    ["s-t3", "Checkout visual pass", "s-pr1", "shipped", "normal", ["s-p3"], 46, 32, -30],
    ["s-t4", "Guest checkout flow", "s-pr1", "shipped", "low", ["s-p1"], 60, 41, -45],
    ["s-t5", "Idempotency key middleware", "s-pr2", "review", "critical", ["s-p2"], 20, null, 2],
    ["s-t6", "Deprecate v1 billing routes", "s-pr2", "active", "low", ["s-p2", "s-p5"], 16, null, 21],
    ["s-t7", "Billing regression suite", "s-pr2", "shipped", "normal", ["s-p4"], 52, 38, -40],
    ["s-t8", "Retry semantics doc", "s-pr2", "shipped", "low", ["s-p2"], 71, 60, -55],
    ["s-t9", "Token contrast audit", "s-pr3", "shipped", "normal", ["s-p3"], 88, 74, -78],
    ["s-t10", "Publish token pipeline", "s-pr3", "shipped", "normal", ["s-p3"], 110, 96, -99],
    ["s-t11", "Click-through event schema", "s-pr4", "backlog", "low", ["s-p1"], 8, null, 28],
    ["s-t12", "Ranking spike", "s-pr4", "backlog", "normal", ["s-p2"], 5, null, 35],
  ];

  const tasks = rows.map(
    ([id, title, projectId, lane, urgency, assigneeIds, made, shipped, dueIn]) => ({
      id,
      title,
      detail: "",
      projectId,
      lane,
      urgency,
      assigneeIds,
      due: dueIn === null ? null : dateIn(dueIn),
      createdAt: ago(made),
      completedAt: shipped === null ? null : ago(shipped),
    }),
  );

  return {
    people,
    projects,
    tasks,
    events: [
      {
        id: "s-e1",
        at: new Date().toISOString(),
        kind: "project.add",
        subject: "Sample data",
        detail: "loaded — clear it any time from the topbar",
      },
    ],
    settings,
  };
}
