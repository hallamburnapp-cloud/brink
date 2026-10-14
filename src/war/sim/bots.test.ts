import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { REGION } from '../content/map';
import { scorePins } from '../engine';
import { indexCombos, subsets } from './combos';
import { runCrosscheck } from './crosscheck';
import { bestPlay, crisisState, dealSpread, playGreedyCrisis, playRun, seatOrder, swapOut } from './index';

describe('subset enumeration', () => {
  it('lists every selection of 1-5 from 8 lit regions, in itertools order', () => {
    const sizes = [1, 2, 3, 4, 5].map((k) => indexCombos(8, k).length);
    expect(sizes).toEqual([8, 28, 56, 70, 56]);
    expect(indexCombos(4, 2)).toEqual([
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ]);
    expect(subsets(['a', 'b', 'c'], [0, 3])).toEqual([[], ['a', 'b', 'c']]);
  });
});

describe('greedy bot', () => {
  it('finds the highest-leverage selection of lit pins', () => {
    const s = crisisState({ seed: 'bots-1', target: 300n });
    const best = bestPlay(s);
    for (const pins of subsets(s.crisis.lit, [1, 2, 3, 4, 5])) {
      expect(scorePins(s, pins, { trace: false })!.leverage <= best.leverage).toBe(true);
    }
  });

  it('pins exactly 5 under FULL TABLE', () => {
    const s = crisisState({ seed: 'bots-2', target: 5000n, staff: ['HOTLINE', 'DUTY', 'STRATEGIST'], twist: { kind: 'FULL_TABLE' } });
    expect(bestPlay(s).pins).toHaveLength(5);
    const o = playGreedyCrisis(s);
    for (const step of o.steps) if (step.kind === 'sweep') expect(step.pins).toHaveLength(5);
  });

  it('swaps the lightest lit regions outside the best play', () => {
    const s = crisisState({ seed: 'bots-3', target: 2500n });
    const best = bestPlay(s);
    const scoring = new Set(scorePins(s, best.pins)!.scoringSet);
    const out = swapOut(s, best);
    expect(out.length).toBeLessThanOrEqual(5);
    for (const r of out) expect(scoring.has(r)).toBe(false);
    const weights = out.map((r) => REGION[r].weight);
    expect([...weights].sort((a, b) => a - b)).toEqual(weights);
  });

  it('is deterministic for a seed and swaps only when short of the target', () => {
    const a = playGreedyCrisis(crisisState({ seed: 'bots-4', target: 2500n }));
    const b = playGreedyCrisis(crisisState({ seed: 'bots-4', target: 2500n }));
    expect(a.steps).toEqual(b.steps);
    const easy = playGreedyCrisis(crisisState({ seed: 'bots-4', target: 100n }));
    expect(easy.steps.every((st) => st.kind === 'sweep')).toBe(true);
    expect(easy.cleared).toBe(true);
  });
});

describe('choice spread', () => {
  it('scores a deal like spread.py: no staff, the flashpoint scores twice', () => {
    // A Chain of Lantern Key (flashpoint) + Gullrest + Shoal is 30 + 3 + 10 + 10 + 7 = 60 x 3.
    const d = dealSpread(['LNK', 'GUL', 'SHL', 'EDV', 'QLN', 'NWK', 'ICW', 'HRT']);
    expect(d.best).toBe(180n);
    expect(d.bestPattern).toBe('CHAIN');
  });
});

describe('full runs', () => {
  it('seats additive staff left of multipliers, Deputies just before them', () => {
    const order = seatOrder([{ id: 'STRATEGIST' }, { id: 'DEPUTY' }, { id: 'DUTY' }, { id: 'HOTLINE' }] as const);
    expect(order.map((x) => x.id)).toEqual(['DUTY', 'HOTLINE', 'DEPUTY', 'STRATEGIST']);
  });

  it('a greedy run ends in a miss or at the end of the slice', () => {
    const o = playRun('bots-run', 'greedy');
    expect(o.crises.length).toBeGreaterThan(0);
    expect(o.crises.length).toBeLessThanOrEqual(9);
    expect(o.cleared === 9).toBe(o.held);
  }, 30_000);
});

const hasPython = spawnSync('python3', ['--version']).status === 0;

describe.skipIf(!hasPython)('cross-check against the Python reference', () => {
  it('replays the same deck orders to the same sweeps, and scores deals the same', () => {
    const r = runCrosscheck({ seed: 'bots-xc', crises: 2, deals: 25 });
    expect(r.differences, r.text).toEqual([]);
  }, 60_000);
});
