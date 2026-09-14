import { describe, it, expect, afterEach } from "vitest";
import {
  readState,
  writeState,
  storageStatus,
  isQuotaError,
  estimateBytes,
  formatBytes,
  persist,
  subscribeToPersistence,
  getPersistence,
  STORAGE_BUDGET_BYTES,
} from "./storage.js";

/**
 * Stand in for localStorage. `throws` lets a case simulate a full store or a
 * blocked one, which is the whole point of this module — the app must be able
 * to tell "saved" from "silently did not save".
 */
function fakeStorage({ throws = null, initial = {} } = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      if (throws) throw throws;
      data[k] = v;
    },
    data,
  };
}

const withStorage = (store) => {
  globalThis.localStorage = store;
  return store;
};

afterEach(() => {
  delete globalThis.localStorage;
});

describe("isQuotaError", () => {
  it("recognises the modern name", () => {
    expect(isQuotaError({ name: "QuotaExceededError" })).toBe(true);
  });

  it("recognises Firefox's legacy name and code", () => {
    expect(isQuotaError({ name: "NS_ERROR_DOM_QUOTA_REACHED" })).toBe(true);
    expect(isQuotaError({ name: "Whatever", code: 1014 })).toBe(true);
  });

  it("does not mistake an unrelated failure for a full store", () => {
    expect(isQuotaError(new TypeError("nope"))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
  });
});

describe("writeState", () => {
  it("reports success and the size written", () => {
    const store = withStorage(fakeStorage());
    const result = writeState("k", { a: 1 });

    expect(result.ok).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.bytes).toBe(estimateBytes(JSON.stringify({ a: 1 })));
    expect(store.data.k).toBe('{"a":1}');
  });

  it("reports a full store as a quota failure rather than swallowing it", () => {
    // The regression this module exists to prevent: before, this threw into an
    // empty catch and the user kept typing into an app that had stopped saving.
    const error = Object.assign(new Error("full"), { name: "QuotaExceededError" });
    withStorage(fakeStorage({ throws: error }));

    expect(writeState("k", { a: 1 })).toMatchObject({ ok: false, reason: "quota" });
  });

  it("distinguishes a blocked store from a full one", () => {
    withStorage(fakeStorage({ throws: new TypeError("blocked") }));
    expect(writeState("k", { a: 1 })).toMatchObject({
      ok: false,
      reason: "unavailable",
    });
  });

  it("reports unserialisable state instead of throwing", () => {
    withStorage(fakeStorage());
    const cyclic = {};
    cyclic.self = cyclic;

    expect(writeState("k", cyclic)).toMatchObject({ ok: false, reason: "serialise" });
  });
});

describe("readState", () => {
  it("merges onto the fallback so a newer key survives older saved state", () => {
    withStorage(fakeStorage({ initial: { k: '{"a":2}' } }));
    expect(readState("k", { a: 1, b: "new" })).toEqual({ a: 2, b: "new" });
  });

  it("falls back when nothing is stored", () => {
    withStorage(fakeStorage());
    expect(readState("k", { a: 1 })).toEqual({ a: 1 });
  });

  it("falls back on corrupt JSON rather than crashing the app", () => {
    withStorage(fakeStorage({ initial: { k: "{not json" } }));
    expect(readState("k", { a: 1 })).toEqual({ a: 1 });
  });

  it("falls back when storage is missing entirely", () => {
    expect(readState("k", { a: 1 })).toEqual({ a: 1 });
  });
});

describe("storageStatus", () => {
  const at = (ratio) =>
    storageStatus({ ok: true, reason: null, bytes: STORAGE_BUDGET_BYTES * ratio });

  it("stays quiet well below the budget", () => {
    expect(at(0.5)).toMatchObject({ percent: 50, crowded: false, tone: "primary" });
  });

  it("warns from 75% — the point of the gauge is to arrive before the failure", () => {
    expect(at(0.75)).toMatchObject({ percent: 75, crowded: true, tone: "warning" });
  });

  it("is danger at or past the budget", () => {
    expect(at(1).tone).toBe("danger");
  });

  it("caps the reported percentage at 100", () => {
    expect(at(3).percent).toBe(100);
  });

  it("is danger whenever the write actually failed, whatever the size", () => {
    expect(storageStatus({ ok: false, reason: "quota", bytes: 10 }).tone).toBe("danger");
  });
});

describe("persist", () => {
  it("publishes a failure to subscribers", () => {
    const error = Object.assign(new Error("full"), { name: "QuotaExceededError" });
    withStorage(fakeStorage({ throws: error }));

    let notified = 0;
    const stop = subscribeToPersistence(() => (notified += 1));

    persist("k", { a: 1 });

    expect(notified).toBe(1);
    expect(getPersistence()).toMatchObject({ ok: false, reason: "quota" });
    stop();
  });

  it("keeps the snapshot stable while nothing visible changes", () => {
    // Every keystroke saves. Re-rendering the app each time for a byte count
    // nobody is reading would be wasteful, and useSyncExternalStore requires
    // the snapshot to be referentially stable between notifications.
    withStorage(fakeStorage());
    persist("k", { a: 1 });

    let notified = 0;
    const stop = subscribeToPersistence(() => (notified += 1));
    const before = getPersistence();

    persist("k", { a: 12 }); // a few more bytes, same rounded percentage

    expect(notified).toBe(0);
    expect(getPersistence()).toBe(before);
    stop();
  });

  it("stops notifying once unsubscribed", () => {
    withStorage(fakeStorage());
    let notified = 0;
    subscribeToPersistence(() => (notified += 1))();

    persist("k", { a: 1 });
    withStorage(fakeStorage({ throws: new TypeError("blocked") }));
    persist("k", { a: 1 });

    expect(notified).toBe(0);
  });
});

describe("formatBytes", () => {
  it("scales the unit to the size", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.6 * 1024 * 1024)).toBe("3.6 MB");
  });
});
