import { describe, expect, it } from 'vitest';
import { Rng, seedToState, shortHash } from './rng';

describe('Rng', () => {
  it('is deterministic for the same seed', () => {
    const a = new Rng('brink-1');
    const b = new Rng('brink-1');
    const xs = Array.from({ length: 50 }, () => a.next());
    const ys = Array.from({ length: 50 }, () => b.next());
    expect(xs).toEqual(ys);
  });
  it('differs across seeds', () => {
    const a = new Rng('brink-1').next();
    const b = new Rng('brink-2').next();
    expect(a).not.toBe(b);
  });
  it('round-trips its state', () => {
    const a = new Rng('x');
    a.next();
    a.next();
    const snap = a.snapshot();
    const b = new Rng(snap);
    expect(Array.from({ length: 10 }, () => a.next())).toEqual(Array.from({ length: 10 }, () => b.next()));
  });
  it('produces values in [0,1) with a roughly uniform mean', () => {
    const r = new Rng('uniform');
    let sum = 0;
    for (let i = 0; i < 20000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / 20000).toBeGreaterThan(0.48);
    expect(sum / 20000).toBeLessThan(0.52);
  });
  it('weightedIndex never picks zero-weight items and respects weights', () => {
    const r = new Rng('w');
    const counts = [0, 0, 0];
    for (let i = 0; i < 6000; i++) counts[r.weightedIndex([0, 1, 3])]++;
    expect(counts[0]).toBe(0);
    expect(counts[2] / counts[1]).toBeGreaterThan(2.4);
    expect(counts[2] / counts[1]).toBeLessThan(3.6);
    expect(r.weightedIndex([0, 0])).toBe(-1);
  });
  it('roll reports the raw roll for near-miss display', () => {
    const r = new Rng('roll');
    const { success, roll } = r.roll(0.5);
    expect(success).toBe(roll < 0.5);
  });
  it('seedToState avoids the all-zero state and shortHash is stable', () => {
    expect(seedToState('anything').some((x) => x !== 0)).toBe(true);
    expect(shortHash('daily-2026-09-28')).toBe(shortHash('daily-2026-09-28'));
    expect(shortHash('a')).not.toBe(shortHash('b'));
    expect(shortHash('a')).toHaveLength(6);
  });
});
