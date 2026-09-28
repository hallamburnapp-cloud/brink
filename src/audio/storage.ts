/**
 * Persistence for the one audio preference we keep: mute.
 *
 * Every localStorage access is wrapped in try/catch — private browsing, disabled
 * storage, SSR and tests must never be able to throw out of the audio module.
 */

export const MUTED_KEY = 'brink.audio.muted';

function storage(): Storage | null {
  try {
    const g = globalThis as unknown as { localStorage?: Storage };
    const ls = g.localStorage;
    return ls && typeof ls.getItem === 'function' ? ls : null;
  } catch {
    return null;
  }
}

/** Reads the persisted mute flag. Default (missing, unreadable or broken storage) is unmuted. */
export function readMuted(): boolean {
  try {
    return storage()?.getItem(MUTED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Persists the mute flag as '1' / '0'. Silently ignores storage failures. */
export function writeMuted(muted: boolean): void {
  try {
    storage()?.setItem(MUTED_KEY, muted ? '1' : '0');
  } catch {
    /* storage unavailable — the in-memory flag still applies for this session */
  }
}
