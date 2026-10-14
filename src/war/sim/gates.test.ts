/**
 * The five simulator gates (spec section 14) on a smaller, fixed-seed sample. Each check gets
 * two standard errors of slack for the sample size; the full-size run is tools/war-sim.ts
 * (see docs/war/SIM-REPORT.md), where the thresholds apply exactly.
 */
import { describe, expect, it } from 'vitest';
import { evaluateGates, GATE_ROWS, simulate, twoSigma, type SimResults } from './index';

const SAMPLE = { seed: 'gates-test', crises: 150, deals: 600 } as const;

describe('simulator gates (spec section 14)', () => {
  let results: SimResults;

  it('plays the gate rows and the choice spread', async () => {
    results = await simulate({ ...SAMPLE, rows: GATE_ROWS, gates: { tolerance: twoSigma } });
    for (const id of GATE_ROWS) expect(results.tallies[id]?.n).toBe(SAMPLE.crises);
    expect(results.spread.deals).toBe(SAMPLE.deals);
  }, 60_000);

  const gate = (index: number) => {
    const g = results.gates.find((x) => x.index === index)!;
    const detail = g.checks.map((c) => `${c.label} ${(100 * c.value).toFixed(1)}% ${c.op} ${100 * c.threshold}%`).join('; ');
    return { g, detail };
  };

  it('1: the best play is at least 3x the median play in 90% or more of fresh deals', () => {
    const { g, detail } = gate(1);
    expect(g.pass, detail).toBe(true);
  });

  it('2: no pattern is the best play in more than 30% of deals', () => {
    const { g, detail } = gate(2);
    expect(g.pass, `${detail} (${g.note})`).toBe(true);
  });

  it('3: the random tapper clears the 22:00 Flare-up 15% of the time or less', () => {
    const { g, detail } = gate(3);
    expect(g.pass, detail).toBe(true);
  });

  it('4: greedy with no staff clears 300 95% or more, and 2,500 15% or less', () => {
    const { g, detail } = gate(4);
    expect(g.pass, detail).toBe(true);
  });

  it('5: greedy with Duty Officer + Hotline Operator clears 2,500 90% or more', () => {
    const { g, detail } = gate(5);
    expect(g.pass, detail).toBe(true);
  });

  it('applies the thresholds exactly when no tolerance is given', () => {
    const exact = evaluateGates({ spread: results.spread, rows: results.tallies });
    for (const g of exact) for (const c of g.checks) expect(c.tolerance).toBe(0);
  });
});
