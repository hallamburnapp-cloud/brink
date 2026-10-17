/**
 * Local storage: the settings and the one saved game (brink.redlines.v1.save), nothing else. Every
 * access is in try/catch, so a private window or blocked storage never breaks the game.
 */
import { loadGame, SAVE_KEY, saveGame, type GameState } from './engine';

export const PREFS_KEY = 'brink.redlines.v1.prefs';

export interface Prefs {
  /** The three explanation lines have been seen (or skipped) once; a new game then starts at its collision slip. */
  explained: boolean;
  /** SOUND in the menu. Off by default; there is no sound in this build. */
  sound: boolean;
}

export const DEFAULT_PREFS: Prefs = { explained: false, sound: false };

function store(): Storage | null {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    return ls && typeof ls.getItem === 'function' ? ls : null;
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    const ls = store();
    if (!ls) return;
    if (value === null) ls.removeItem(key);
    else ls.setItem(key, value);
  } catch {
    /* storage unavailable or full: the in-memory state still applies for this session */
  }
}

/** Only well-formed fields survive a read. */
export function sanitize(v: unknown): Prefs {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { explained: o.explained === true, sound: o.sound === true };
}

export function readPrefs(): Prefs {
  try {
    const raw = read(PREFS_KEY);
    return raw ? sanitize(JSON.parse(raw)) : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writePrefs(p: Prefs): void {
  write(PREFS_KEY, JSON.stringify(p));
}

/** The saved game, if there is one the engine can continue. Unreadable data is discarded. */
export function readSave(): GameState | null {
  const raw = read(SAVE_KEY);
  if (raw === null) return null;
  const s = loadGame(raw);
  if (!s) {
    clearSave();
    return null;
  }
  return s;
}

export function writeSave(s: GameState): void {
  write(SAVE_KEY, saveGame(s));
}

export function clearSave(): void {
  write(SAVE_KEY, null);
}

export function hasSave(): boolean {
  return readSave() !== null;
}
