import { describe, expect, it } from 'vitest';
import { FIRST_WORLD_SEED, mapView, newGame, pinAll } from '../../engine';
import { aimAt, claim, clearTable, settleAll, spreadInto, take, viewOf, worldFrom } from './world';

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

  it('hops the war tag on when its region changes hands, so war never spreads into an untagged region', () => {
    const hop = { id: 'HRT', turns: 1 };
    expect(viewOf(base, claim(worldFrom(base), 'MRM', hop)).warNext).toEqual(hop);
    expect(viewOf(base, take(worldFrom(base), 'MRM', hop)).warNext).toEqual(hop);
    expect(viewOf(base, claim(worldFrom(base), 'MRM')).warNext).toBeNull();
    expect(viewOf(base, take(worldFrom(base), 'SHL', hop)).regions.SHL.owner).toBe('red');
    expect(viewOf(base, take(worldFrom(base), 'SHL', hop)).warNext?.id).toBe('MRM');
  });

  it('moves the tag to where war will spread this turn as soon as a change of hands moves it', () => {
    // A miss turned the crisis red next to Edda Vale: war now spreads there, not into Marram.
    const w = aimAt(take(worldFrom(base), 'SHL'), 'EDV');
    expect(w.warNext).toEqual({ id: 'EDV', turns: 1 });
    expect(aimAt(worldFrom(base), 'MRM').warNext).toEqual(base.warNext);
    expect(aimAt(worldFrom(base), undefined).warNext).toEqual(base.warNext);
  });

  it('keeps the tag on the region war spreads into, reading NOW, until it moves on', () => {
    const v = viewOf(base, spreadInto(worldFrom(base), 'MRM'));
    expect(v.regions.MRM.owner).toBe('red');
    expect(v.warNext).toEqual({ id: 'MRM', turns: 0 });
  });

  it('settles every outline at the end', () => {
    const v = viewOf(base, settleAll(worldFrom(base)));
    expect(Object.values(v.regions).every((r) => r.preview === null)).toBe(true);
  });

  it('clears the table at the end: the plain world, with its owners and tag', () => {
    const v = viewOf(base, clearTable(claim(worldFrom(base), 'SHL')));
    expect(Object.values(v.regions).some((r) => r.lit || r.pinned || r.addable || r.preview)).toBe(false);
    expect(v.joinedPins).toEqual([]);
    expect(v.crisis).toBeNull();
    expect(v.regions.SHL.owner).toBe('gold');
    expect(v.warNext?.id).toBe('MRM');
  });
});
