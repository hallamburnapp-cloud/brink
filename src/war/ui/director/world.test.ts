import { describe, expect, it } from 'vitest';
import { FIRST_WORLD_SEED, mapView, newGame, pinAll } from '../../engine';
import { addBrass, claim, clearTable, settleAll, take, viewOf, worldFrom } from './world';

describe('the map while the outcome plays', () => {
  // FIRST-WORLD turn 1 with the coached pins: Shoal and Pebbleby previewed as wins 1 and 2.
  const prev = pinAll(newGame(FIRST_WORLD_SEED), ['SHL', 'LNK', 'PBB', 'MRM']);
  const base = mapView(prev);

  it('starts from the table as it was sent: pins, threads, previews, the ring and the tag', () => {
    const v = viewOf(base, worldFrom(base));
    expect(v.regions.SHL.pinned).toBe(true);
    expect(v.joinedPins).toEqual(base.joinedPins);
    expect(v.regions.SHL.preview).toEqual({ kind: 'win', order: 1 });
    expect(v.regions.PBB.preview).toEqual({ kind: 'win', order: 2 });
    expect(v.crisis?.id).toBe('SHL');
    expect(v.warNext?.id).toBe('MRM');
    expect([v.highlight, v.finger, v.hover]).toEqual([null, null, null]);
  });

  it('turns one region gold at a time and drops its preview outline', () => {
    const w = claim(worldFrom(base), 'SHL');
    const v = viewOf(base, w);
    expect(v.regions.SHL.owner).toBe('gold');
    expect(v.regions.SHL.preview).toBeNull();
    expect(v.regions.PBB.owner).toBe('grey');
    expect(v.regions.PBB.preview).toEqual({ kind: 'win', order: 2 });
  });

  it('drops the war tag when its region changes hands', () => {
    expect(viewOf(base, claim(worldFrom(base), 'MRM')).warNext).toBeNull();
    expect(viewOf(base, take(worldFrom(base), 'MRM')).warNext).toBeNull();
    expect(viewOf(base, take(worldFrom(base), 'SHL')).regions.SHL.owner).toBe('red');
    expect(viewOf(base, take(worldFrom(base), 'SHL')).warNext?.id).toBe('MRM');
  });

  it('adds the brass pin and settles every outline at the end', () => {
    const w = settleAll(addBrass(worldFrom(base), 'SHL'));
    const v = viewOf(base, w);
    expect(v.regions.SHL.brass).toBe(true);
    expect(Object.values(v.regions).every((r) => r.preview === null)).toBe(true);
  });

  it('clears the table at the end: the plain world, with its owners, brass and tag', () => {
    const v = viewOf(base, clearTable(addBrass(claim(worldFrom(base), 'SHL'), 'SHL')));
    expect(Object.values(v.regions).some((r) => r.lit || r.pinned || r.addable || r.preview)).toBe(false);
    expect(v.joinedPins).toEqual([]);
    expect(v.pinOrder).toBeNull();
    expect(v.crisis).toBeNull();
    expect(v.regions.SHL).toMatchObject({ owner: 'gold', brass: true });
    expect(v.warNext?.id).toBe('MRM');
  });
});
