import { useEffect, useMemo, useReducer } from "react";
import { StoreContext } from "./context.js";
import { reducer, emptyState, STORAGE_KEY } from "./state.js";
import { readState, persist } from "../lib/storage.js";

export function AppStore({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    readState(STORAGE_KEY, emptyState),
  );

  /*
   * `persist` records whether the save actually succeeded. A failure — a full
   * store, or a browser refusing to persist at all — has to reach the user:
   * the app would otherwise keep accepting data it is no longer keeping and
   * lose it on the next refresh. StorageNotice reads the outcome.
   */
  useEffect(() => {
    persist(STORAGE_KEY, state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}
