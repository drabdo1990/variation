/**
 * Application state and its reducer.
 *
 * The app ships empty — every person, project, and task is created by the
 * user. State is persisted to localStorage so work survives a reload.
 */

export const STORAGE_KEY = "cadence.state.v1";

export const emptyState = {
  people: [],
  projects: [],
  tasks: [],
  /** Append-only log; drives the activity feed and the Insights charts. */
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
    /* ---------------------------------------------------------- people */
    case "person/add": {
      const person = { ...action.person, id: newId() };
      return {
        ...state,
        people: [...state.people, person],
        events: logEvent(state, {
          kind: "person.add",
          subject: person.name,
          detail: person.title,
        }),
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
        // Clear the person out of every project and task they touched.
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

    /* -------------------------------------------------------- projects */
    case "project/add": {
      const project = { ...action.project, id: newId() };
      return {
        ...state,
        projects: [...state.projects, project],
        events: logEvent(state, {
          kind: "project.add",
          subject: project.name,
          detail: project.summary,
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
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        // Detach tasks rather than deleting them silently.
        tasks: state.tasks.map((t) =>
          t.projectId === action.id ? { ...t, projectId: null } : t,
        ),
        events: logEvent(state, {
          kind: "project.remove",
          subject: gone?.name ?? "A project",
        }),
      };
    }

    /* ----------------------------------------------------------- tasks */
    case "task/add": {
      const task = {
        ...action.task,
        id: newId(),
        createdAt: new Date().toISOString(),
        completedAt: action.task.lane === "shipped" ? new Date().toISOString() : null,
      };
      return {
        ...state,
        tasks: [...state.tasks, task],
        events: logEvent(state, { kind: "task.add", subject: task.title }),
      };
    }

    case "task/update":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.task.id ? { ...t, ...action.task } : t,
        ),
        events: logEvent(state, {
          kind: "task.update",
          subject: action.task.title,
        }),
      };

    case "task/move": {
      const moving = state.tasks.find((t) => t.id === action.id);
      if (!moving || moving.lane === action.lane) return state;

      const entering = action.lane === "shipped";
      const updated = {
        ...moving,
        lane: action.lane,
        // Stamp completion the first time it reaches Shipped; clear it if
        // the task is pulled back out, so cycle time stays truthful.
        completedAt: entering ? new Date().toISOString() : null,
      };

      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? updated : t)),
        events: logEvent(state, {
          kind: entering ? "task.ship" : "task.move",
          subject: moving.title,
          detail: action.lane,
        }),
      };
    }

    case "task/remove": {
      const gone = state.tasks.find((t) => t.id === action.id);
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
        events: logEvent(state, {
          kind: "task.remove",
          subject: gone?.title ?? "A task",
        }),
      };
    }

    /* -------------------------------------------------------- settings */
    case "settings/update":
      return { ...state, settings: { ...state.settings, ...action.settings } };

    /* ------------------------------------------------------ bulk state */
    case "state/replace":
      return action.state;

    case "state/reset":
      return { ...emptyState, settings: state.settings };

    default:
      return state;
  }
}
