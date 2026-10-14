import { describe, expect, it } from 'vitest';
import { newRun, newSandbox, pin, sweep, type RunState, type SweepRecord } from '../../engine';
import { receiptOf } from './receipt';

function swept(s: RunState, ids: string[]): SweepRecord {
  for (const id of ids) s = pin(s, id).state;
  return sweep(s).state.lastSweep!;
}

/** Base Influence plus every Influence line is the sweep's Influence: nothing is lost or invented. */
function influenceAddsUp(rec: SweepRecord): void {
  const r = receiptOf(rec);
  const base = BigInt(r.lines[0].value.split(' × ')[0].replace(/,/g, ''));
  const adds = r.lines.filter((l) => l.tone === 'inf').reduce((t, l) => t + BigInt(l.value.replace(/[+,]/g, '')), 0n);
  expect(base + adds).toBe(rec.influence);
}

describe('the LAST SWEEP receipt', () => {
  it('itemises the first sweep: the Chain, its regions and the flashpoint going again', () => {
    const r = receiptOf(swept(newRun('FIRST-NIGHT'), ['LNK', 'GUL', 'SHL']));
    expect(r.title).toBe('LAST SWEEP · CHAIN');
    expect(r.lines).toEqual([
      { label: 'CHAIN Lv 1', value: '30 × 3', tone: 'plain' },
      { label: 'Regions · 3 pins', value: '+20', tone: 'inf' },
      { label: 'AGAIN Lantern Key (red ring)', value: '+10', tone: 'inf' },
    ]);
    expect(r.total).toBe('60 × 3 = 180');
  });

  it('says who made a pin score again', () => {
    const s = newRun('FIRST-NIGHT');
    const r = receiptOf(swept({ ...s, staff: [{ uid: 1, id: 'COURIER', count: 0 }] }, ['LNK', 'GUL', 'SHL']));
    expect(r.lines.map((l) => l.label)).toContain('AGAIN Gullrest (Courier)');
    expect(r.lines.map((l) => l.label)).toContain('AGAIN Lantern Key (red ring)');
  });

  it('adds up for staff, stamps and threads (Mid Shift) and for a showcase (Late Shift)', () => {
    const mid = swept(newSandbox('mid'), ['SHL', 'LTL', 'KLP', 'KLM', 'TLM']);
    influenceAddsUp(mid);
    const r = receiptOf(mid);
    expect(r.total).toBe('273 × 40 = 10,920');
    expect(r.lines.some((l) => l.label.startsWith('Harbourmaster') && l.tone === 'inf')).toBe(true);
    expect(r.lines.some((l) => l.label === 'Strategist' && l.value === '×2')).toBe(true);
    expect(r.lines.some((l) => l.label === 'Threads')).toBe(true);
    expect(r.lines.some((l) => l.label === 'Fortify')).toBe(true);
    influenceAddsUp(swept(newSandbox('late'), ['EDV', 'MRD', 'TRN', 'GUL', 'LNK']));
  });
});
