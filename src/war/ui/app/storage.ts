/**
 * Local preferences for the war room: speed, motion, first-launch and one-time hints. Only
 * settings live here (no run data, no identifiers), and every storage access is guarded so private
 * windows and blocked storage never break the game.
 */

const KEY = 'brink.war.prefs';

export type MotionPref = 'system' | 'reduce' | 'full';

export interface Prefs {
  speed: 1 | 2 | 4;
  motion: MotionPref;
  /** The first night (seed FIRST-NIGHT) has been played through its first crisis. */
  playedFirstNight: boolean;
  /** One-time hints already shown. */
  hints: string[];
}

export const DEFAULT_PREFS: Prefs = { speed: 1, motion: 'system', playedFirstNight: false, hints: [] };

function store(): Storage | null {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    return ls && typeof ls.getItem === 'function' ? ls : null;
  } catch {
    return null;
  }
}

/** Reads prefs, keeping only well-formed fields. */
export function readPrefs(): Prefs {
  try {
    const raw = store()?.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return sanitize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writePrefs(p: Prefs): void {
  try {
    store()?.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: the in-memory prefs still apply for this session */
  }
}

export function sanitize(v: unknown): Prefs {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const speed = o.speed === 2 || o.speed === 4 ? o.speed : 1;
  const motion: MotionPref = o.motion === 'reduce' || o.motion === 'full' ? o.motion : 'system';
  const hints = Array.isArray(o.hints) ? o.hints.filter((h): h is string => typeof h === 'string').slice(0, 64) : [];
  return { speed, motion, playedFirstNight: o.playedFirstNight === true, hints };
}
