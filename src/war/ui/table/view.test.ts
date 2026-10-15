import { describe, expect, it } from 'vitest';
import { must, newGame, nextTurn, pinAll, send, swap } from '../../engine';
import { freshlyLit, mapViewFor, NO_EXTRAS } from './view';

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

  it('draws the intro\'s calm world: every region lit, no ring, no tag, no pins', () => {
    const v = mapViewFor(pinAll(first(), ['SHL']), { ...NO_EXTRAS, calm: true });
    expect(v.crisis).toBeNull();
    expect(v.warNext).toBeNull();
    expect(v.joinedPins).toEqual([]);
    expect(Object.values(v.regions).every((r) => r.lit && !r.pinned && r.preview === null)).toBe(true);
    expect(v.regions.LNK.owner).toBe('gold');
    expect(['DNM', 'ORN', 'FLE'].map((id) => v.regions[id].owner)).toEqual(['red', 'red', 'red']);
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
