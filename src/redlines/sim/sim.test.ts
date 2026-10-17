import { describe, expect, it } from 'vitest';
import { FIXTURE_CONTENT } from '../engine/testkit.ts';
import { BOTS, farPromiseTarget } from './bots.ts';
import { evaluateGates } from './gates.ts';
import { playGame } from './play.ts';
import { simulate } from './simulate.ts';
import { newGame } from '../engine/run.ts';
import { holdInfo } from '../engine/board.ts';

const c = FIXTURE_CONTENT;

describe('the simulator', () => {
  const res = simulate(c, { games: 150, bots: ['passive', 'far-promise', 'sensible'], prefix: 'U' });
  it('plays every game to an ending, deterministically', () => {
    for (const rows of Object.values(res.games)) for (const g of rows!) expect(g.ending).not.toBe('STALL');
    const again = playGame(c, BOTS.sensible, 'U3');
    expect(again).toEqual(res.games.sensible![3]);
  });
  it('the passive bot loses most games', () => {
    const p = res.stats.passive!;
    expect((p.war + p.frozen) / p.games).toBeGreaterThan(0.7);
  });
  it('the solved opening does not beat sensible play', () => {
    const f = res.stats['far-promise']!;
    const s = res.stats.sensible!;
    expect(f.treaty / f.games).toBeLessThanOrEqual(s.treaty / s.games);
    expect(s.treaty / s.games).toBeGreaterThan(0.2);
  });
  it('every debrief has at least six hidden lines', () => {
    for (const st of Object.values(res.stats)) expect(st!.minHidden).toBeGreaterThanOrEqual(6);
  });
  it('the gates read the statistics', () => {
    const gates = evaluateGates(res.stats);
    expect(gates.map((g) => g.id)).toEqual(['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']);
    expect(gates.find((g) => g.id === 'G1')!.pass).toBe(true);
    expect(gates.find((g) => g.id === 'G2')!.pass).toBe(true);
    expect(gates.find((g) => g.id === 'G7')!.pass).toBe(true);
  });
  it('the far promise is one nothing of yours can reach', () => {
    for (let i = 0; i < 20; i++) {
      const s = newGame(c, `fp-${i}`);
      const far = farPromiseTarget(s);
      expect(far).not.toBeNull();
      expect(holdInfo(s, far!).ok).toBe(false);
    }
  });
});
