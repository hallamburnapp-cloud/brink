/**
 * Safe JSON persistence over localStorage.
 *
 * Every access is wrapped in try/catch: private-mode browsers, disabled site
 * data, quota errors and non-browser environments (tests, SSR, workers) all
 * degrade to an in-memory Map so the game keeps working for the session.
 * Callers prefix their keys with 'brink.'.
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memory = new Map<string, string>();
const memoryStorage: StorageLike = {
  getItem: (key) => (memory.has(key) ? (memory.get(key) as string) : null),
  setItem: (key, value) => {
    memory.set(key, String(value));
  },
  removeItem: (key) => {
    memory.delete(key);
  },
};

/** Test override: a fake storage, or `null` to force the in-memory fallback. */
let forced: StorageLike | null = null;
let forceMemory = false;
/** Cached detection result: undefined = not probed yet, null = unavailable. */
let detected: StorageLike | null | undefined;

const PROBE_KEY = '__brink_probe__';

function probe(storage: StorageLike): boolean {
  try {
    storage.setItem(PROBE_KEY, '1');
    const ok = storage.getItem(PROBE_KEY) === '1';
    storage.removeItem(PROBE_KEY);
    return ok;
  } catch {
    return false;
  }
}

function detect(): StorageLike | null {
  try {
    const g = globalThis as { window?: { localStorage?: StorageLike }; localStorage?: StorageLike };
    const ls = typeof g.window !== 'undefined' && g.window ? g.window.localStorage : g.localStorage;
    if (!ls) return null;
    return probe(ls) ? ls : null;
  } catch {
    return null;
  }
}

function backend(): StorageLike {
  if (forced) return forced;
  if (forceMemory) return memoryStorage;
  if (detected === undefined) detected = detect();
  return detected ?? memoryStorage;
}

/** True when writes go to a real, working storage (they will survive a reload). */
export function storageAvailable(): boolean {
  const b = backend();
  if (b === memoryStorage) return false;
  return probe(b);
}

/** Read and JSON-parse `key`; any failure (missing, corrupt, throwing storage) yields `fallback`. */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = backend().getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const parsed = JSON.parse(raw) as T | null;
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/** JSON-serialise and write `value`; returns false if the write did not happen. */
export function save(key: string, value: unknown): boolean {
  try {
    backend().setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Delete `key`; returns false if the storage refused. */
export function remove(key: string): boolean {
  try {
    backend().removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Test hook. Pass a fake storage to route all reads and writes through it, or
 * `null` to behave as if localStorage were missing (a fresh in-memory Map).
 */
export function __setStorageForTests(storage: StorageLike | null): void {
  memory.clear();
  detected = undefined;
  forced = storage;
  forceMemory = storage === null;
}
