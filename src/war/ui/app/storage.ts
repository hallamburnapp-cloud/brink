/**
 * Local storage for the war room: settings, and the one saved game (SPEC section 11). Nothing else
 * is stored (no identifiers, no history), and every storage access is guarded so private windows
 * and blocked storage never break the game.
 */
import { SAVE_KEY, loadGame, saveGame, type GameState } from '../../engine';

const PREFS_KEY = 'brink.war.v2.prefs';

export type MotionPref = 'system' | 'reduce' | 'full';

export interface Prefs {
  speed: 1 | 2 | 4;
  motion: MotionPref;
  /** The three intro screens have been seen (or skipped) once. */
  introSeen: boolean;
  /** The first game on this device (seed FIRST-WORLD) has sent its first turn. */
  playedFirst: boolean;
  /** One-time coach lines already shown on this device. */
  hints: string[];
}

export const DEFAULT_PREFS: Prefs = { speed: 1, motion: 'system', introSeen: false, playedFirst: false, hints: [] };

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

/** Reads prefs, keeping only well-formed fields. */
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

export function sanitize(v: unknown): Prefs {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const speed = o.speed === 2 || o.speed === 4 ? o.speed : 1;
  const motion: MotionPref = o.motion === 'reduce' || o.motion === 'full' ? o.motion : 'system';
  const hints = Array.isArray(o.hints) ? o.hints.filter((h): h is string => typeof h === 'string').slice(0, 64) : [];
  return { speed, motion, introSeen: o.introSeen === true, playedFirst: o.playedFirst === true, hints };
}

/** The saved game, if there is one worth continuing (a finished game is not). */
export function readSave(): GameState | null {
  const raw = read(SAVE_KEY);
  if (raw === null) return null;
  const s = loadGame(raw);
  // Unreadable data, or a finished game: nothing to continue, so it is discarded.
  if (!s || s.phase === 'over') {
    clearSave();
    return null;
  }
  return s;
}

/** Save the game; a finished game clears the save instead (there is nothing to continue). */
export function writeSave(s: GameState): void {
  if (s.phase === 'over') clearSave();
  else write(SAVE_KEY, saveGame(s));
}

export function clearSave(): void {
  write(SAVE_KEY, null);
}

export function hasSave(): boolean {
  return readSave() !== null;
}
