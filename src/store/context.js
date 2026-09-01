import { createContext, useContext } from "react";

/**
 * Context and hooks live apart from the provider component so that the
 * provider module exports a component and nothing else — which is what
 * React Fast Refresh needs to hot-reload it cleanly.
 */
export const StoreContext = createContext(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <AppStore>");
  return ctx;
}

/** Most components only need the data. */
export function useAppState() {
  return useStore().state;
}

export function useDispatch() {
  return useStore().dispatch;
}
