/**
 * Loose-typed adapter over the audio module so the UI can call sounds that are
 * added over time (tally, slams, breath, pulse) without coupling to the union.
 * Every call is a safe no-op if the sound or method does not exist.
 */
import { audio } from '../audio';

const a = audio as unknown as Record<string, (...args: any[]) => unknown>;

export const snd = {
  play(name: string, opts?: { intensity?: number }): void {
    try {
      a.play?.(name, opts);
    } catch {
      /* never break the game for a sound */
    }
  },
  breath(ms: number): void {
    try {
      a.holdBreath?.(ms);
    } catch {
      /* noop */
    }
  },
  pulse(bpm: number | null): void {
    try {
      a.pulse?.(bpm);
    } catch {
      /* noop */
    }
  },
  intensity(x: number): void {
    try {
      a.setIntensity?.(Math.max(0, Math.min(1, x)));
    } catch {
      /* noop */
    }
  },
  heartbeat(bpm: number | null): void {
    try {
      a.heartbeat?.(bpm);
    } catch {
      /* noop */
    }
  },
  drone(on: boolean, intensity?: number): void {
    try {
      a.drone?.(on, intensity);
    } catch {
      /* noop */
    }
  },
};
