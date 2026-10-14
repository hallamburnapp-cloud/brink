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

  it('goes quiet between crises and holds back the brass pin until it drops', () => {
    let s = sweep(pinAll(newRun('FIRST-NIGHT'), ['LNK', 'GUL', 'SHL'])).state;
    s = sweep(pinAll(s, ['NWK', 'FRM', 'WNM', 'WMS'])).state;
    expect(s.phase).toBe('briefing');
    const quiet = mapViewOf(s, NO_EXTRAS);
    expect(Object.values(quiet.regions).some((r) => r.status === 'lit' || r.pinned)).toBe(false);
    expect(quiet.regions.WMS.brass).toBe(1);
    expect(quiet.ring).toBe(0);
    const held = mapViewOf(s, { ...NO_EXTRAS, brassHold: 'WMS', keepLit: true });
    expect(held.regions.WMS.brass).toBe(0);
    expect(Object.values(held.regions).filter((r) => r.status === 'lit')).toHaveLength(8);
  });

  it('lets the ring follow the total being shown during a sweep', () => {
    const s = newSandbox('mid');
    expect(mapViewOf(s, { ...NO_EXTRAS, total: 4_500n }).ring).toBeCloseTo(0.5, 4);
    expect(mapViewOf(s, { ...NO_EXTRAS, total: 10_920n }).ring).toBe(0);
  });
});
