/**
 * The audio module in a runtime with no AudioContext (Node): every method must be
 * a silent no-op, and mute must round-trip through localStorage.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sfx } from './index';

const ALL: Sfx[] = [
  'slide',
  'commit',
  'tick',
  'meter_up',
  'meter_down',
  'reveal',
  'roll',
  'roll_success',
  'roll_fail',
  'near_miss',
  'flashpoint_hit',
  'offer',
  'act',
  'ring',
  'nuclear',
  'ending',
];

function stubStorage(initial: Record<string, string> = {}): Map<string, string> {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  });
  return store;
}

async function load() {
  return import('./index');
}

describe('audio without an AudioContext', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('runs in an environment with no Web Audio and no storage', () => {
    expect(typeof (globalThis as { AudioContext?: unknown }).AudioContext).toBe('undefined');
    expect(typeof (globalThis as { localStorage?: unknown }).localStorage).toBe('undefined');
  });

  it('every method is a safe no-op and leaves no timers behind', async () => {
    vi.useFakeTimers();
    const { audio } = await load();
    expect(() => {
      audio.unlock();
      audio.unlock();
      for (const sfx of ALL) audio.play(sfx);
      audio.play('tick', { intensity: 0 });
      audio.play('tick', { intensity: 1 });
      audio.play('tick', { intensity: Number.NaN });
      audio.play('not-a-sound' as Sfx);
      audio.heartbeat(60);
      audio.heartbeat(180);
      audio.heartbeat(Number.NaN);
      audio.heartbeat(null);
      audio.drone(true, 0.7);
      audio.drone(true);
      audio.drone(false);
      audio.setVolume(0.5);
      audio.setVolume(Number.NaN);
      audio.setVolume(7);
      audio.setMuted(true);
      audio.setMuted(false);
    }).not.toThrow();
    expect(audio.isMuted()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('defaults to unmuted', async () => {
    const { audio } = await load();
    expect(audio.isMuted()).toBe(false);
  });

  it('persists mute under brink.audio.muted and reads it back in a fresh module', async () => {
    const store = stubStorage();
    const { audio } = await load();
    audio.setMuted(true);
    expect(audio.isMuted()).toBe(true);
    expect(store.get('brink.audio.muted')).toBe('1');

    vi.resetModules();
    const fresh = await load();
    expect(fresh.audio.isMuted()).toBe(true);
    fresh.audio.setMuted(false);
    expect(fresh.audio.isMuted()).toBe(false);
    expect(store.get('brink.audio.muted')).toBe('0');
  });

  it('honours a pre-existing persisted mute', async () => {
    stubStorage({ 'brink.audio.muted': '1' });
    const { audio } = await load();
    expect(audio.isMuted()).toBe(true);
  });

  it('keeps working when localStorage throws', async () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
    });
    const { audio } = await load();
    expect(audio.isMuted()).toBe(false);
    expect(() => audio.setMuted(true)).not.toThrow();
    expect(audio.isMuted()).toBe(true);
  });

  it('describes every sound in one line', async () => {
    const { describeSounds } = await load();
    const d = describeSounds();
    expect(Object.keys(d).sort()).toEqual([...ALL].sort());
    for (const line of Object.values(d)) {
      expect(line.length).toBeGreaterThan(10);
      expect(line).not.toContain('\n');
    }
  });
});
