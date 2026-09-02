import { describe, it, expect } from "vitest";
import { reducer, emptyState, exportProject } from "./state.js";

/** Apply a list of actions in order. */
const run = (actions, start = emptyState) =>
  actions.reduce((state, action) => reducer(state, action), start);

/** A project with one measure, two observations and a cycle. */
function seeded() {
  let state = reducer(emptyState, {
    type: "project/add",
    project: { name: "Falls", aim: "Fewer falls", phase: "testing", memberIds: [] },
  });
  const projectId = state.projects[0].id;

  state = reducer(state, {
    type: "measure/add",
    measure: { projectId, name: "Falls per month", role: "outcome", chartType: "c" },
  });
  const measureId = state.measures[0].id;

  state = run(
    [
      { type: "observation/add", observation: { measureId, period: "2026-01-01", value: 8, denominator: null } },
      { type: "observation/add", observation: { measureId, period: "2026-02-01", value: 5, denominator: null } },
      { type: "cycle/add", cycle: { projectId, title: "Hourly rounding", annotate: true, startDate: "2026-01-15" } },
      { type: "task/add", task: { projectId, title: "Book the meeting", assigneeIds: [] } },
    ],
    state,
  );

  return { state, projectId, measureId };
}

describe("cascading deletes", () => {
  it("takes a project's measures, observations, cycles and tasks with it", () => {
    const { state, projectId } = seeded();
    const after = reducer(state, { type: "project/remove", id: projectId });

    expect(after.projects).toHaveLength(0);
    expect(after.measures).toHaveLength(0);
    expect(after.observations).toHaveLength(0);
    expect(after.cycles).toHaveLength(0);
    expect(after.tasks).toHaveLength(0);
  });

  it("takes a measure's observations but leaves the project alone", () => {
    const { state, projectId, measureId } = seeded();
    const after = reducer(state, { type: "measure/remove", id: measureId });

    expect(after.measures).toHaveLength(0);
    expect(after.observations).toHaveLength(0);
    expect(after.projects).toHaveLength(1);
    expect(after.cycles).toHaveLength(1);
    expect(after.projects[0].id).toBe(projectId);
  });

  it("unassigns a removed person without deleting their work", () => {
    let state = reducer(emptyState, {
      type: "person/add",
      person: { name: "Sara Whitfield", role: "Consultant" },
    });
    const personId = state.people[0].id;

    state = reducer(state, {
      type: "project/add",
      project: { name: "Falls", leadId: personId, memberIds: [personId] },
    });
    state = reducer(state, {
      type: "task/add",
      task: { projectId: state.projects[0].id, title: "Audit", assigneeIds: [personId] },
    });

    const after = reducer(state, { type: "person/remove", id: personId });

    expect(after.people).toHaveLength(0);
    expect(after.projects).toHaveLength(1);
    expect(after.projects[0].leadId).toBeNull();
    expect(after.projects[0].memberIds).toEqual([]);
    expect(after.tasks[0].assigneeIds).toEqual([]);
  });
});

describe("observation import", () => {
  it("replaces a row for a period that already exists rather than duplicating", () => {
    const { state, measureId } = seeded();

    const after = reducer(state, {
      type: "observation/import",
      measureId,
      rows: [
        { period: "2026-01-01", value: 99, denominator: null },
        { period: "2026-03-01", value: 3, denominator: null },
      ],
    });

    const mine = after.observations.filter((o) => o.measureId === measureId);
    expect(mine).toHaveLength(3); // Jan replaced, Feb kept, Mar added

    const jan = mine.filter((o) => o.period === "2026-01-01");
    expect(jan).toHaveLength(1);
    expect(jan[0].value).toBe(99);
  });
});

describe("PDSA numbering", () => {
  it("numbers cycles per project, not globally", () => {
    let state = run([
      { type: "project/add", project: { name: "A", memberIds: [] } },
      { type: "project/add", project: { name: "B", memberIds: [] } },
    ]);
    const [a, b] = state.projects.map((p) => p.id);

    state = run(
      [
        { type: "cycle/add", cycle: { projectId: a, title: "A1" } },
        { type: "cycle/add", cycle: { projectId: b, title: "B1" } },
        { type: "cycle/add", cycle: { projectId: a, title: "A2" } },
      ],
      state,
    );

    const numberOf = (title) =>
      state.cycles.find((c) => c.title === title).number;

    expect(numberOf("A1")).toBe(1);
    expect(numberOf("A2")).toBe(2);
    expect(numberOf("B1")).toBe(1);
  });
});

describe("export and import a project", () => {
  it("round-trips a project with its measures, data and cycles", () => {
    const { state, projectId } = seeded();
    const bundle = exportProject(state, projectId);

    expect(bundle.format).toBe("variation.project.v1");
    expect(bundle.measures).toHaveLength(1);
    expect(bundle.observations).toHaveLength(2);
    expect(bundle.cycles).toHaveLength(1);

    // Import into a fresh store, as a colleague receiving the file would.
    const imported = reducer(emptyState, { type: "project/import", bundle });

    expect(imported.projects).toHaveLength(1);
    expect(imported.projects[0].name).toBe("Falls");
    expect(imported.measures).toHaveLength(1);
    expect(imported.observations).toHaveLength(2);
    expect(imported.observations.map((o) => o.value).sort()).toEqual([5, 8]);
    expect(imported.cycles).toHaveLength(1);
  });

  it("rewrites ids so an import cannot collide with what is already there", () => {
    const { state, projectId } = seeded();
    const bundle = exportProject(state, projectId);

    // Import the project back into the store it came from.
    const after = reducer(state, { type: "project/import", bundle });

    expect(after.projects).toHaveLength(2);
    expect(after.projects[0].id).not.toBe(after.projects[1].id);
    expect(after.measures).toHaveLength(2);
    expect(after.measures[0].id).not.toBe(after.measures[1].id);

    // Each copy's observations must point at its own measure.
    for (const measure of after.measures) {
      const mine = after.observations.filter((o) => o.measureId === measure.id);
      expect(mine).toHaveLength(2);
    }
  });

  it("keeps the imported project's data attached to the new project id", () => {
    const { state, projectId } = seeded();
    const bundle = exportProject(state, projectId);
    const imported = reducer(emptyState, { type: "project/import", bundle });

    const newId = imported.projects[0].id;
    expect(imported.measures[0].projectId).toBe(newId);
    expect(imported.cycles[0].projectId).toBe(newId);
  });
});

describe("reset", () => {
  it("clears the data but keeps who you are", () => {
    let { state } = seeded();
    state = reducer(state, {
      type: "settings/update",
      settings: { userName: "Mohamed Mansour" },
    });

    const after = reducer(state, { type: "state/reset" });

    expect(after.projects).toHaveLength(0);
    expect(after.measures).toHaveLength(0);
    expect(after.observations).toHaveLength(0);
    expect(after.settings.userName).toBe("Mohamed Mansour");
  });
});
