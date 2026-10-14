import { describe, expect, it } from 'vitest';
import { newRun, newSandbox, pin, sweep, type RunState } from '../../engine';
import { mapViewOf, NO_EXTRAS } from './view';

function pinAll(s: RunState, ids: string[]): RunState {
  for (const id of ids) s = pin(s, id).state;
  return s;
}

describe('the map view', () => {
  it('shows the deal, the pins joining and their sweep order while choosing', () => {
    const s = pinAll(newRun('FIRST-NIGHT'), ['LNK', 'GUL', 'SHL']);
    const v = mapViewOf(s, NO_EXTRAS);
    expect(Object.values(v.regions).filter((r) => r.status === 'lit')).toHaveLength(8);
    expect(v.joinedPins).toEqual([
      ['GUL', 'LNK'],
      ['LNK', 'SHL'],
    ]);
    expect(v.sweepOrder).toEqual({ GUL: 1, LNK: 2, SHL: 3 });
    expect(v.flashpoint).toBe('LNK');
    expect(v.ring).toBe(1);
    expect(v.gridlock).toBe(false);
  });

  it('marks the lit regions a further pin would join (none before a pin, none at five)', () => {
    const fresh = newRun('FIRST-NIGHT');
    expect(mapViewOf(fresh, NO_EXTRAS).joinable).toBeNull();
    const one = pinAll(fresh, ['LNK']);
    expect(mapViewOf(one, NO_EXTRAS).joinable).toEqual(['GUL', 'SHL']);
    const two = pinAll(fresh, ['LNK', 'GUL']);
    expect(mapViewOf(two, NO_EXTRAS).joinable).toEqual(['SHL']);
    // Edda Vale joins none of the Scatter's lit islands: a pin there has nothing to offer.
    expect(mapViewOf(pinAll(fresh, ['EDV']), NO_EXTRAS).joinable).toEqual(['QLN']);
  });

  it('goes quiet between crises and holds back the brass pin until it drops', () => {
    let s = sweep(pinAll(newRun('FIRST-NIGHT'), ['LNK', 'GUL', 'SHL'])).state;
    s = sweep(pinAll(s, ['NWK', 'FRM', 'WNM', 'WMS'])).state;
    expect(s.phase).toBe('briefing');
    const quiet = mapViewOf(s, NO_EXTRAS);
    expect(Object.values(quiet.regions).some((r) => r.status === 'lit' || r.pinned)).toBe(false);
    expect(quiet.regions.WMS.brass).toBe(1);
    expect(quiet.ring).toBe(0);
    const held = mapViewOf(s, { ...NO_EXTRAS, brassHold: 'WMS' });
    expect(held.regions.WMS.brass).toBe(0);
  });

  it('holds the sweep on the table while the outcome plays: its pins and threads, no refill', () => {
    const before = pinAll(newRun('FIRST-NIGHT'), ['LNK', 'GUL', 'SHL']);
    const after = sweep(before).state;
    const keep = { lit: before.crisis.lit, pins: ['GUL', 'LNK', 'SHL'], joins: [['GUL', 'LNK'], ['LNK', 'SHL']] as Array<[string, string]> };
    const v = mapViewOf(after, { ...NO_EXTRAS, keep });
    const lit = Object.values(v.regions).filter((r) => r.status === 'lit');
    expect(lit.map((r) => r.id).sort()).toEqual([...before.crisis.lit].sort());
    expect(['GUL', 'LNK', 'SHL'].every((id) => v.regions[id].pinned)).toBe(true);
    expect(v.joinedPins).toEqual(keep.joins);
    // The refill (Frostmere, Wenmoor, Wintermast) waits until the hold ends.
    expect(v.regions.FRM.status).not.toBe('lit');
    expect(mapViewOf(after, NO_EXTRAS).regions.FRM.status).toBe('lit');
  });

  it('lets the ring follow the total being shown during a sweep', () => {
    const s = newSandbox('mid');
    expect(mapViewOf(s, { ...NO_EXTRAS, total: 4_500n }).ring).toBeCloseTo(0.5, 4);
    expect(mapViewOf(s, { ...NO_EXTRAS, total: 10_920n }).ring).toBe(0);
  });
});
