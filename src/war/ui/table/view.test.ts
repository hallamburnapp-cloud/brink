import { describe, expect, it } from 'vitest';
import { must, newGame, nextTurn, pinAll, preview, send, swap, warSpreadTarget } from '../../engine';
import { freshlyLit, mapViewFor, NO_EXTRAS, warTag } from './view';

const first = () => newGame('FIRST-WORLD');

describe('the map view', () => {
  it('passes the engine\'s view through, with the HUD\'s finger and hover on a copy', () => {
    const s = pinAll(first(), ['SHL', 'LNK']);
    const v = mapViewFor(s, { ...NO_EXTRAS, finger: 'SHL', hover: 'PBB' });
    expect(v.crisis).toEqual({ id: 'SHL', target: '64', doubled: true });
    expect(v.finger).toBe('SHL');
    expect(v.hover).toBe('PBB');
    expect(v.regions.SHL.preview).toEqual({ kind: 'win', order: 1 });
    expect(v.joinedPins).toHaveLength(1);
    expect([...v.joinedPins[0]].sort()).toEqual(['LNK', 'SHL']);
  });

  it('draws the intro\'s calm world at rest: nothing lit, no ring, no tag, no pins', () => {
    const v = mapViewFor(pinAll(first(), ['SHL']), { ...NO_EXTRAS, calm: true });
    expect(v.crisis).toBeNull();
    expect(v.warNext).toBeNull();
    expect(v.joinedPins).toEqual([]);
    expect(Object.values(v.regions).every((r) => !r.lit && !r.pinned && r.preview === null)).toBe(true);
    expect(v.regions.LNK.owner).toBe('gold');
    expect(['DNM', 'ORN', 'FLE'].map((id) => v.regions[id].owner)).toEqual(['red', 'red', 'red']);
  });

  it('words the war tag from the coming turn between turns, and from this turn during one', () => {
    const s1 = first();
    expect(mapViewFor(s1, NO_EXTRAS).warNext).toEqual({ id: expect.any(String), turns: 3 });
    const done = must(send(pinAll(s1, ['SHL', 'LNK'])));
    expect(done.phase).not.toBe('choose');
    expect(mapViewFor(done, NO_EXTRAS).warNext).toMatchObject({ turns: 2, between: true });
  });

  it('on the turn war spreads, points the tag where war would go if SEND went now', () => {
    // FIRST-WORLD played as coached to turn 3, when war spreads by itself.
    let s = must(send(pinAll(first(), ['SHL', 'LNK', 'PBB', 'MRM'])));
    s = must(nextTurn(s));
    s = must(nextTurn(must(send(pinAll(s, ['TRN', 'MRD', 'EDV', 'LNK', 'SHL'])))));
    const tag = mapViewFor(s, NO_EXTRAS).warNext!;
    expect(tag.turns).toBe(1);
    // Nothing pinned: the tag is the engine's.
    expect(warTag(s, tag)).toEqual(tag);
    // The crisis alone misses: it turns red, and war spreads from there if that moves its target.
    const alone = pinAll(s, [s.deal.crisis]);
    expect(preview(alone)!.regions).toBe(0);
    // Ashkettle missed turns red beside Edda Vale, which war then takes instead of Marram.
    expect([s.deal.crisis, tag.id]).toEqual(['ASK', 'MRM']);
    expect(warSpreadTarget({ ...s.owner, ASK: 'red' })).toBe('EDV');
    expect(mapViewFor(alone, NO_EXTRAS).warNext).toEqual({ id: 'EDV', turns: 1 });
    // A tag two turns out is left alone (only this turn's spread is redirected).
    expect(warTag(alone, { ...tag, turns: 2 })).toEqual({ ...tag, turns: 2 });
  });

  it('shows no finger or hover outside a turn', () => {
    const done = must(send(pinAll(first(), ['SHL', 'LNK'])));
    const v = mapViewFor(done, { ...NO_EXTRAS, finger: 'SHL', hover: 'PBB' });
    expect(v.finger).toBeNull();
    expect(v.hover).toBeNull();
  });
});

describe('the deal light-up', () => {
  it('lights the crisis and the whole deal on a new turn, and only the new regions after a swap', () => {
    const s1 = first();
    expect(freshlyLit(null, s1)).toEqual(['SHL', ...s1.deal.lit]);
    const sent = must(send(pinAll(s1, ['SHL', 'LNK'])));
    const s2 = must(nextTurn(sent));
    expect(freshlyLit(sent, s2)).toEqual([s2.deal.crisis, ...s2.deal.lit]);
    const pinned = pinAll(s2, [s2.deal.crisis]);
    const swapped = must(swap(pinned));
    const fresh = freshlyLit(pinned, swapped);
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.every((id) => !pinned.deal.lit.includes(id))).toBe(true);
    expect(freshlyLit(swapped, swapped)).toEqual([]);
  });
});
