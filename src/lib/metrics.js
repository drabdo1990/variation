/**
 * Derived values. Every function here is pure and takes the records it
 * needs, so nothing is stored that can be computed — a task moving lanes
 * updates project progress, team load, and portfolio health at once.
 */

/** Tasks belonging to a project. */
export function tasksOf(tasks, projectId) {
  return tasks.filter((task) => task.projectId === projectId);
}

/** Percentage of a project's tasks that have shipped. */
export function progressOf(project, tasks) {
  const mine = tasksOf(tasks, project.id);
  if (mine.length === 0) return null; // no tasks yet — not the same as 0%
  const done = mine.filter((task) => task.lane === "shipped").length;
  return Math.round((done / mine.length) * 100);
}

export function taskCountsOf(project, tasks) {
  const mine = tasksOf(tasks, project.id);
  return {
    total: mine.length,
    done: mine.filter((task) => task.lane === "shipped").length,
  };
}

/**
 * Health compares schedule elapsed against scope completed. A project
 * that has burned 80% of its calendar with 40% of the work done is behind,
 * whatever phase it claims to be in.
 */
export function healthOf(project, tasks, today = new Date()) {
  if (project.phase === "paused") return "paused";

  const pct = progressOf(project, tasks);
  if (pct === null) return "empty";
  if (project.phase === "shipped" || pct >= 100) return "done";

  const start = new Date(project.startDate).getTime();
  const target = new Date(project.targetDate).getTime();
  const now = today.getTime();

  if (!Number.isFinite(start) || !Number.isFinite(target) || target <= start) {
    return "steady";
  }
  if (now >= target) return "overdue";

  const elapsed = (now - start) / (target - start);
  const drift = pct / 100 - elapsed;

  if (drift < -0.2) return "behind";
  if (drift < -0.05) return "watch";
  return "steady";
}

/** Open (not shipped) tasks assigned to a person. */
export function openTasksFor(tasks, personId) {
  return tasks.filter(
    (task) => task.lane !== "shipped" && task.assigneeIds.includes(personId),
  );
}

/**
 * Load is open tasks against declared weekly capacity, at a nominal 6
 * hours per task. Someone with no capacity who still holds work reads as
 * fully overloaded rather than dividing by zero.
 */
export function loadFor(person, tasks) {
  const open = openTasksFor(tasks, person.id).length;
  if (!person.weeklyCapacity) return open > 0 ? 100 : 0;
  return Math.min(100, Math.round(((open * 6) / person.weeklyCapacity) * 100));
}

export function loadBand(load) {
  if (load >= 85) return { key: "over", label: "Overloaded", tone: "danger" };
  if (load >= 55) return { key: "full", label: "Committed", tone: "warning" };
  return { key: "open", label: "Has room", tone: "success" };
}

/** Headline tiles for the Overview. */
export function portfolioSummary({ projects, tasks, people }, today = new Date()) {
  const live = projects.filter(
    (p) => p.phase !== "shipped" && p.phase !== "paused",
  );
  const atRisk = projects.filter((p) =>
    ["behind", "overdue"].includes(healthOf(p, tasks, today)),
  );
  const open = tasks.filter((t) => t.lane !== "shipped");
  const overloaded = people.filter((p) => loadFor(p, tasks) >= 85);

  return [
    {
      id: "live",
      label: "Live projects",
      value: live.length,
      icon: "bi-collection",
      hint: `${projects.length} total`,
    },
    {
      id: "risk",
      label: "Need attention",
      value: atRisk.length,
      icon: "bi-exclamation-diamond",
      hint: atRisk.length ? "Behind schedule" : "All on pace",
      tone: atRisk.length ? "danger" : "success",
    },
    {
      id: "open",
      label: "Open tasks",
      value: open.length,
      icon: "bi-list-task",
      hint: `${tasks.length - open.length} shipped`,
    },
    {
      id: "load",
      label: "Overloaded",
      value: overloaded.length,
      icon: "bi-person-exclamation",
      hint: `of ${people.length} ${people.length === 1 ? "person" : "people"}`,
      tone: overloaded.length ? "warning" : "success",
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

export function findPerson(people, id) {
  return people.find((person) => person.id === id) ?? null;
}

export function findPeople(people, ids = []) {
  return ids.map((id) => findPerson(people, id)).filter(Boolean);
}
