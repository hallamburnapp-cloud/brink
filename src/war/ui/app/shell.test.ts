import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { must, newGame, pinAll, send, SAVE_KEY } from '../../engine';
import { backStep } from './history';
import { clearSave, DEFAULT_PREFS, readPrefs, readSave, sanitize, writePrefs, writeSave } from './storage';

describe('the back button', () => {
  const base = { screen: 'game' as const, sheetOpen: false, intro: false, balloonOpen: false, busy: false };

  it('opens the menu in a game, and closes what is open first', () => {
    expect(backStep(base)).toBe('menu');
    expect(backStep({ ...base, sheetOpen: true })).toBe('close-sheet');
    expect(backStep({ ...base, balloonOpen: true })).toBe('close-balloon');
    expect(backStep({ ...base, busy: true })).toBe('skip-and-menu');
    expect(backStep({ ...base, intro: true })).toBe('skip-intro');
  });

  it('leaves from the bare title, but closes a sheet over it', () => {
    expect(backStep({ ...base, screen: 'title' })).toBe('leave');
    expect(backStep({ ...base, screen: 'title', sheetOpen: true })).toBe('close-sheet');
  });
});

/** A Map-backed localStorage for the storage tests. */
function stubStorage(): Map<string, string> {
  const m = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
  return m;
}

describe('settings and the save', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = stubStorage();
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('keeps only well-formed settings', () => {
    expect(sanitize({ speed: 3, motion: 'loud', hints: ['a', 4], introSeen: 'yes' })).toEqual({ ...DEFAULT_PREFS, hints: ['a'] });
    writePrefs({ ...DEFAULT_PREFS, speed: 2, introSeen: true, hints: ['miss'] });
    expect(readPrefs()).toEqual({ ...DEFAULT_PREFS, speed: 2, introSeen: true, hints: ['miss'] });
  });

  it('saves a game under brink.war.v2.save and continues it exactly', () => {
    const s = must(send(pinAll(newGame('FIRST-WORLD'), ['SHL', 'LNK', 'PBB', 'MRM'])));
    writeSave(s);
    expect(store.has(SAVE_KEY)).toBe(true);
    const back = readSave();
    expect(back?.turn).toBe(1);
    expect(back?.owner).toEqual(s.owner);
    expect(back?.lastSend?.score).toBe(264n);
    clearSave();
    expect(readSave()).toBeNull();
  });

  it('discards an unreadable save, and a finished game is nothing to continue', () => {
    store.set(SAVE_KEY, '{not json');
    expect(readSave()).toBeNull();
    expect(store.has(SAVE_KEY)).toBe(false);
    const over = { ...newGame('W1'), phase: 'over' as const, ending: 'WAR' as const };
    writeSave(over);
    expect(store.has(SAVE_KEY)).toBe(false);
  });

  it('never throws when storage is blocked', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readPrefs()).toEqual(DEFAULT_PREFS);
    expect(readSave()).toBeNull();
    expect(() => writeSave(newGame('W1'))).not.toThrow();
  });
});
