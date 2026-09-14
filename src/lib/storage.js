/**
 * Persistence and its limits.
 *
 * localStorage is the only store this app has, and browsers cap it at around
 * 5 MB per origin. Crossing that cap throws on write — and a swallowed throw
 * is the worst outcome available: the clinician keeps entering data into an
 * app that looks like it is working and has stopped saving. Every function
 * here exists to make that failure visible rather than quiet.
 */

/** Typical per-origin cap. Chrome and Firefox both sit at about 5 MB. */
export const STORAGE_BUDGET_BYTES = 5 * 1024 * 1024;

/** Where the gauge appears and the archive prompt starts. */
export const STORAGE_WARN_RATIO = 0.75;

/**
 * Serialised size in bytes.
 *
 * Browsers hold localStorage values as UTF-16, so a character costs two bytes
 * whatever its code point. This is an estimate, for the gauge only: browsers
 * differ on whether keys and overheads count against the cap, so a real write
 * failure — not this number — is the authoritative signal that space ran out.
 */
export function estimateBytes(serialised) {
  return serialised.length * 2;
}

// Firefox reports the legacy name and code; Safari and Chrome the modern one.
const QUOTA_NAMES = new Set([
  "QuotaExceededError",
  "NS_ERROR_DOM_QUOTA_REACHED",
]);
const QUOTA_CODES = new Set([22, 1014]);

/** Did this write fail because the store is full, rather than unavailable? */
export function isQuotaError(error) {
  if (!error || typeof error !== "object") return false;
  return QUOTA_NAMES.has(error.name) || QUOTA_CODES.has(error.code);
}

/** Read persisted state, tolerating a missing, corrupt, or blocked store. */
export function readState(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (!raw) return fallback;
    // Merge onto the fallback so state saved by an older build that lacks a
    // newer key still loads instead of crashing on undefined.
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

/**
 * Write, and report what happened. The caller is expected to surface a
 * failure to the user; this function deliberately returns a result rather
 * than throwing, so that a failed save cannot be ignored by an empty catch.
 *
 * @returns { ok, reason, bytes } — reason is "quota", "unavailable",
 *          "serialise", or null when the write succeeded.
 */
export function writeState(key, state) {
  let serialised;
  try {
    serialised = JSON.stringify(state);
  } catch {
    return { ok: false, reason: "serialise", bytes: 0 };
  }

  const bytes = estimateBytes(serialised);

  try {
    globalThis.localStorage.setItem(key, serialised);
    return { ok: true, reason: null, bytes };
  } catch (error) {
    return {
      ok: false,
      reason: isQuotaError(error) ? "quota" : "unavailable",
      bytes,
    };
  }
}

/** Dress a write result with the numbers the gauge needs. */
export function storageStatus(result, budget = STORAGE_BUDGET_BYTES) {
  const ratio = budget > 0 ? result.bytes / budget : 0;
  const full = !result.ok || ratio >= 1;

  return {
    ...result,
    budget,
    ratio,
    percent: Math.min(100, Math.round(ratio * 100)),
    crowded: ratio >= STORAGE_WARN_RATIO,
    tone: full ? "danger" : ratio >= STORAGE_WARN_RATIO ? "warning" : "primary",
  };
}

/** Bytes as a short human string: 480 KB, 3.6 MB. */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ *
 * The last save's outcome, as an external store
 *
 * Writing to localStorage is a side effect on an external system, and how it
 * went is external state — so it is kept here rather than in React state.
 * Components read it through `useSyncExternalStore`, which means the provider
 * never calls setState from an effect, and only the component displaying the
 * result re-renders rather than the whole app on every keystroke.
 * ------------------------------------------------------------------ */

let snapshot = storageStatus({ ok: true, reason: null, bytes: 0 });
const listeners = new Set();

export function subscribeToPersistence(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPersistence() {
  return snapshot;
}

/**
 * Save, and publish the outcome.
 *
 * The snapshot is only replaced when something a reader could actually see
 * has changed. `bytes` moves on every keystroke while the rounded percentage
 * and the failure state do not, so this keeps the snapshot referentially
 * stable — which `useSyncExternalStore` requires — and avoids a re-render per
 * character typed.
 */
export function persist(key, state) {
  const next = storageStatus(writeState(key, state));

  if (
    next.ok !== snapshot.ok ||
    next.reason !== snapshot.reason ||
    next.percent !== snapshot.percent
  ) {
    snapshot = next;
    for (const listener of listeners) listener();
  }

  return next;
}
