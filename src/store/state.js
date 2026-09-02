/**
 * Application state and its reducer.
 *
 * The app ships empty — every project, measure, observation and PDSA cycle
 * is created by the user, and persists to localStorage. Nothing is ever
 * transmitted anywhere.
 */

export const STORAGE_KEY = "variation.state.v1";

export const emptyState = {
  projects: [],
  measures: [],
  observations: [],
  /** PDSA cycles. */
  cycles: [],
  /** Light admin tasks — distinct from PDSA cycles. */
  tasks: [],
  people: [],
  /** Append-only log driving the activity feed. */
  events: [],
  settings: { userName: "" },
};

const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function logEvent(state, entry) {
  const event = { id: newId(), at: new Date().toISOString(), ...entry };
  // Keep the log bounded so localStorage cannot grow without limit.
  return [event, ...state.events].slice(0, 300);
}

export function reducer(state, action) {
  switch (action.type) {
    /* -------------------------------------------------------- projects */
    case "project/add": {
      const project = { ...action.project, id: newId() };
      return {
        ...state,
        projects: [...state.projects, project],
        events: logEvent(state, {
          kind: "project.add",
          subject: project.name,
          detail: project.aim,
        }),
      };
    }

    case "project/update":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.project.id ? { ...p, ...action.project } : p,
        ),
        events: logEvent(state, {
          kind: "project.update",
          subject: action.project.name,
        }),
      };

    case "project/remove": {
      const gone = state.projects.find((p) => p.id === action.id);
      // A project owns its measures, so its data goes with it.
      const doomedMeasures = state.measures
        .filter((m) => m.projectId === action.id)
        .map((m) => m.id);

      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        measures: state.measures.filter((m) => m.projectId !== action.id),
        observations: state.observations.filter(
          (o) => !doomedMeasures.includes(o.measureId),
        ),
        cycles: state.cycles.filter((c) => c.projectId !== action.id),
        tasks: state.tasks.filter((t) => t.projectId !== action.id),
        events: logEvent(state, {
          kind: "project.remove",
          subject: gone?.name ?? "A project",
        }),
      };
    }

    /* -------------------------------------------------------- measures */
    case "measure/add": {
      const measure = { ...action.measure, id: newId() };
      return {
        ...state,
        measures: [...state.measures, measure],
        events: logEvent(state, {
          kind: "measure.add",
          subject: measure.name,
          detail: measure.role,
        }),
      };
    }

    case "measure/update":
      return {
        ...state,
        measures: state.measures.map((m) =>
          m.id === action.measure.id ? { ...m, ...action.measure } : m,
        ),
        events: logEvent(state, {
          kind: "measure.update",
          subject: action.measure.name,
        }),
      };

    case "measure/remove": {
      const gone = state.measures.find((m) => m.id === action.id);
      return {
        ...state,
        measures: state.measures.filter((m) => m.id !== action.id),
        observations: state.observations.filter((o) => o.measureId !== action.id),
        events: logEvent(state, {
          kind: "measure.remove",
          subject: gone?.name ?? "A measure",
        }),
      };
    }

    /* ---------------------------------------------------- observations */
    case "observation/add": {
      const observation = { ...action.observation, id: newId() };
      return {
        ...state,
        observations: [...state.observations, observation],
      };
    }

    case "observation/update":
      return {
        ...state,
        observations: state.observations.map((o) =>
          o.id === action.observation.id ? { ...o, ...action.observation } : o,
        ),
      };

    case "observation/remove":
      return {
        ...state,
        observations: state.observations.filter((o) => o.id !== action.id),
      };

    /**
     * Bulk entry from a paste or CSV import. Rows replace any existing
     * observation for the same measure and period, so re-importing a
     * corrected spreadsheet updates rather than duplicates.
     */
    case "observation/import": {
      const { measureId, rows } = action;
      const incoming = rows.map((row) => ({
        id: newId(),
        measureId,
        period: row.period,
        value: row.value,
        denominator: row.denominator ?? null,
        note: row.note ?? "",
      }));
      const periods = new Set(incoming.map((r) => r.period));

      return {
        ...state,
        observations: [
          ...state.observations.filter(
            (o) => o.measureId !== measureId || !periods.has(o.period),
          ),
          ...incoming,
        ],
        events: logEvent(state, {
          kind: "observation.import",
          subject: `${incoming.length} data point${incoming.length === 1 ? "" : "s"}`,
        }),
      };
    }

    /* ----------------------------------------------------- PDSA cycles */
    case "cycle/add": {
      const forProject = state.cycles.filter(
        (c) => c.projectId === action.cycle.projectId,
      );
      const cycle = {
        ...action.cycle,
        id: newId(),
        // Cycles are numbered per project, in the order they are created.
        number: forProject.length + 1,
      };
      return {
        ...state,
        cycles: [...state.cycles, cycle],
        events: logEvent(state, {
          kind: "cycle.add",
          subject: cycle.title,
          detail: `PDSA ${cycle.number}`,
        }),
      };
    }

    case "cycle/update":
      return {
        ...state,
        cycles: state.cycles.map((c) =>
          c.id === action.cycle.id ? { ...c, ...action.cycle } : c,
        ),
        events: logEvent(state, {
          kind: "cycle.update",
          subject: action.cycle.title,
        }),
      };

    case "cycle/remove": {
      const gone = state.cycles.find((c) => c.id === action.id);
      return {
        ...state,
        cycles: state.cycles.filter((c) => c.id !== action.id),
        events: logEvent(state, {
          kind: "cycle.remove",
          subject: gone?.title ?? "A cycle",
        }),
      };
    }

    /* ----------------------------------------------------------- tasks */
    case "task/add":
      return {
        ...state,
        tasks: [...state.tasks, { ...action.task, id: newId(), done: false }],
      };

    case "task/update":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.task.id ? { ...t, ...action.task } : t,
        ),
      };

    case "task/toggle":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, done: !t.done } : t,
        ),
      };

    case "task/remove":
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };

    /* ---------------------------------------------------------- people */
    case "person/add": {
      const person = { ...action.person, id: newId() };
      return {
        ...state,
        people: [...state.people, person],
        events: logEvent(state, { kind: "person.add", subject: person.name }),
      };
    }

    case "person/update":
      return {
        ...state,
        people: state.people.map((p) =>
          p.id === action.person.id ? { ...p, ...action.person } : p,
        ),
        events: logEvent(state, {
          kind: "person.update",
          subject: action.person.name,
        }),
      };

    case "person/remove": {
      const gone = state.people.find((p) => p.id === action.id);
      return {
        ...state,
        people: state.people.filter((p) => p.id !== action.id),
        // Clear them out of every project and task they were on.
        projects: state.projects.map((project) => ({
          ...project,
          leadId: project.leadId === action.id ? null : project.leadId,
          memberIds: project.memberIds.filter((m) => m !== action.id),
        })),
        tasks: state.tasks.map((task) => ({
          ...task,
          assigneeIds: task.assigneeIds.filter((a) => a !== action.id),
        })),
        events: logEvent(state, {
          kind: "person.remove",
          subject: gone?.name ?? "Someone",
        }),
      };
    }

    /* -------------------------------------------------------- settings */
    case "settings/update":
      return { ...state, settings: { ...state.settings, ...action.settings } };

    /* ------------------------------------------------------ bulk state */
    /**
     * Merge an imported project and everything hanging off it. Ids are
     * rewritten so an import can never collide with existing records.
     */
    case "project/import": {
      const { bundle } = action;
      const projectId = newId();
      const measureIdMap = new Map();

      const measures = (bundle.measures ?? []).map((m) => {
        const id = newId();
        measureIdMap.set(m.id, id);
        return { ...m, id, projectId };
      });

      return {
        ...state,
        projects: [
          ...state.projects,
          { ...bundle.project, id: projectId, leadId: null, memberIds: [] },
        ],
        measures: [...state.measures, ...measures],
        observations: [
          ...state.observations,
          ...(bundle.observations ?? [])
            .filter((o) => measureIdMap.has(o.measureId))
            .map((o) => ({
              ...o,
              id: newId(),
              measureId: measureIdMap.get(o.measureId),
            })),
        ],
        cycles: [
          ...state.cycles,
          ...(bundle.cycles ?? []).map((c) => ({ ...c, id: newId(), projectId })),
        ],
        events: logEvent(state, {
          kind: "project.import",
          subject: bundle.project?.name ?? "A project",
        }),
      };
    }

    case "state/replace":
      return action.state;

    case "state/reset":
      return { ...emptyState, settings: state.settings };

    default:
      return state;
  }
}

/** Everything belonging to one project, for export. */
export function exportProject(state, projectId) {
  const measures = state.measures.filter((m) => m.projectId === projectId);
  const measureIds = new Set(measures.map((m) => m.id));

  return {
    format: "variation.project.v1",
    exportedAt: new Date().toISOString(),
    project: state.projects.find((p) => p.id === projectId),
    measures,
    observations: state.observations.filter((o) => measureIds.has(o.measureId)),
    cycles: state.cycles.filter((c) => c.projectId === projectId),
  };
}
