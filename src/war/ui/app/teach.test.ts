import { describe, expect, it } from 'vitest';
import { IDS, must, newGame, nextTurn, pinAll, send, setOwners, type GameState } from '../../engine';
import { linesFor, turnOneStep } from './teach';

const first = () => newGame('FIRST-WORLD');
const keys = (prev: GameState | null, s: GameState) => linesFor(prev, s).map((l) => l.key);

describe('the coached first turn', () => {
  it('starts with only the crisis tappable, the finger on it and SEND off', () => {
    expect(turnOneStep(first())).toEqual({ step: 1, tappable: ['SHL'], send: false, finger: 'SHL' });
  });

  it('opens the rules once the crisis is pinned, and SEND only once the pins win', () => {
    const one = pinAll(first(), ['SHL']);
    expect(turnOneStep(one)).toMatchObject({ step: 2, tappable: null, send: false });
    // Shoal + Lantern Key: 17 x 4.0 = 68 beats 64.
    expect(turnOneStep(pinAll(one, ['LNK']))).toMatchObject({ step: 3, send: true });
    // Shoal + Lintel: 13 x 4.0 = 52 misses.
    expect(turnOneStep(pinAll(one, ['LTL']))).toMatchObject({ step: 3, send: false });
    // + Pebbleby + Marram: 264, WINS 2.
    expect(turnOneStep(pinAll(one, ['LNK', 'PBB', 'MRM']))).toMatchObject({ step: 4, send: true });
  });

  it('goes back to the crisis when the crisis is lifted', () => {
    const s = pinAll(first(), ['SHL', 'LNK']);
    const lifted = { ...s, deal: { ...s.deal, pins: ['LNK'] } };
    expect(turnOneStep(lifted)).toEqual({ step: 1, tappable: ['SHL', 'LNK'], send: false, finger: 'SHL' });
  });

  it('is only turn 1 of the first game', () => {
    expect(turnOneStep(newGame('W56'))).toBeNull();
  });
});

describe('coach lines', () => {
  it('walks turn 1 step by step, in the spec\'s words', () => {
    const s0 = first();
    expect(linesFor(null, s0).map((l) => l.text)).toEqual(['Tap the crisis: the white ring.']);
    const s1 = pinAll(s0, ['SHL']);
    expect(linesFor(s0, s1).map((l) => l.text)).toEqual(['Now a lit region touching it.']);
    const s2 = pinAll(s1, ['LNK']);
    expect(linesFor(s1, s2).map((l) => l.text)).toEqual(['68 beats 64. Shoal will turn gold.', 'More pins score more. Up to 5.']);
    const s3 = pinAll(s2, ['PBB']);
    expect(linesFor(s2, s3)).toEqual([]);
    const s4 = pinAll(s3, ['MRM']);
    const win2 = linesFor(s3, s4);
    expect(win2.map((l) => l.text)).toEqual(['Beat it by more: win more regions.', 'SEND.']);
    expect(win2.every((l) => l.beckon)).toBe(true);
  });

  it('says gold is for good after the first send, then teaches turn 2, the shop and turn 3', () => {
    const before = pinAll(first(), ['SHL', 'LNK', 'PBB', 'MRM', 'TRN']);
    const after = must(send(before));
    expect(keys(before, after)).toContain('t1-gold');
    const turn2 = must(nextTurn(after));
    expect(keys(after, turn2)).toEqual(['t2-gold']);
    const shop = must(send(pinAll(turn2, ['TRN', 'MRD', 'EDV', 'LNK', 'SHL'])));
    expect(shop.phase).toBe('shop');
    expect(keys(turn2, shop)).toContain('shop-hire');
    const turn3 = must(nextTurn(shop));
    expect(keys(shop, turn3)).toContain('t3-war');
  });

  it('says what a miss means, and warns at 8 red, once per device', () => {
    // Seven red, then a send of the crisis alone (a miss): war takes the crisis and holds 8.
    const reds = ['ASK', 'BRN', 'EDV', 'NWK', 'VSY', 'ICW', 'QLN'];
    const map = IDS.map((id) => (id === 'LNK' ? 'G' : reds.includes(id) ? 'R' : '.')).join('');
    const seven = must(setOwners(newGame('W56'), map));
    const before = pinAll(seven, [seven.deal.crisis]);
    const after = must(send(before));
    expect(after.lastSend?.result).toBe('miss');
    const lines = linesFor(before, after);
    expect(lines.map((l) => [l.key, l.once])).toEqual([
      ['miss', 'device'],
      ['war8', 'device'],
    ]);
    expect(lines[0].text).toBe('War took it. Ten red and you lose.');
    expect(lines[1].text).toBe('Two more red and the war wins.');
  });
});
