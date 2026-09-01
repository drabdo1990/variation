import { useEffect, useMemo, useReducer } from "react";
import { StoreContext } from "./context.js";
import { reducer, emptyState, STORAGE_KEY } from "./state.js";

/** Read persisted state, tolerating a missing, corrupt, or blocked store. */
function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw);
    // Merge onto emptyState so a state saved by an older build that lacks
    // a newer key still loads instead of crashing on undefined.
    return { ...emptyState, ...parsed };
  } catch {
    return emptyState;
  }
}

export function AppStore({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private mode or a full quota — the app still works in-memory.
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}
