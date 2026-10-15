import { describe, expect, it } from 'vitest';
import { buy, clearPins, decodeOwners, IDS, must, newGame, nextTurn, pinAll, position, send, sendOptions, setOwners, swap, swapProblem, type GameState } from '../../engine';
import { adderRightOfMultiplier, bestNow, hireLikely, linesFor, pushMissLine, spreadLine, turnOneStep, warStakes } from './teach';

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
    expect(win2.map((l) => l.text)).toEqual(['Beat it by more: win more regions. Your pins go first.', 'SEND.']);
    expect(win2.every((l) => l.beckon === 'send')).toBe(true);
    // The two lines that explain the numbers stay their whole time, however fast the taps come.
    expect(linesFor(s1, s2)[0].full).toBe(true);
    expect(win2[0].full).toBe(true);
  });

  it('says gold is for good after the first send, then teaches turn 2, the shop and turn 3', () => {
    const before = pinAll(first(), ['SHL', 'LNK', 'PBB', 'MRM', 'TRN']);
    const after = must(send(before));
    expect(keys(before, after)).toContain('t1-gold');
    const turn2 = must(nextTurn(after));
    expect(keys(after, turn2)).toEqual(['t2-gold', 't2-swap']);
    expect(linesFor(after, turn2)[1]).toMatchObject({ text: 'Once a turn, SWAP brings new regions. Your pins stay.', beckon: 'swap' });
    const shop = must(send(pinAll(turn2, ['TRN', 'MRD', 'EDV', 'LNK', 'SHL'])));
    expect(shop.phase).toBe('shop');
    expect(keys(turn2, shop)).toContain('shop-hire');
    // The first shop offers the Harbourmaster: the port and capital marks are said once.
    expect(linesFor(turn2, shop).find((l) => l.key === 'marks')?.text).toBe('⚓ marks a port, ★ a capital. Some staff score them.');
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

  it('teaches the full table when a shop opens on one, not when the fifth seat fills', () => {
    let s = must(send(pinAll(first(), ['SHL', 'LNK', 'PBB', 'MRM', 'TRN'])));
    s = must(send(pinAll(must(nextTurn(s)), ['TRN', 'MRD', 'EDV', 'LNK', 'SHL'])));
    const four = { ...s, coins: 99, seats: (['QM', 'SURVEYOR', 'STRATEGIST', 'GOVERNOR'] as const).map((id, i) => ({ uid: 90 + i, id })) };
    const five = must(buy(four, 0));
    expect(five.seats).toHaveLength(5);
    expect(keys(four, five)).not.toContain('full');
    const closed = { ...five, phase: 'outcome' as const };
    expect(keys(closed, five)).toContain('full');
  });
});

describe('the lines that keep a turn from surprising anyone', () => {
  it('names the region war spreads to by itself, in every game', () => {
    // FIRST-WORLD, coached sends through turn 3: war spreads after turn 3 into Marram.
    let s = must(send(pinAll(first(), ['SHL', 'LNK', 'PBB', 'MRM', 'TRN'])));
    s = must(nextTurn(s));
    s = must(nextTurn(must(send(pinAll(s, ['TRN', 'MRD', 'EDV', 'LNK', 'SHL'])))));
    const before = s;
    const best = sendOptions(before).sort((a, b) => (b.score > a.score ? 1 : -1))[0];
    const after = must(send(pinAll(before, best.pins)));
    expect(after.lastSend?.spread).not.toBeNull();
    // Said by the director with the spread's drum (play.ts 'spreadLine'), never after the send.
    expect(linesFor(before, after).find((l) => l.key === 'spread')).toBeUndefined();
    const spread = spreadLine(after.lastSend!.spread!.id);
    expect(spread.text).toMatch(/^War spread to [A-Z][a-z]+( [A-Z][a-z]+)? by itself\.$/);
    expect(spread.once).toBeNull();
  });

  it('says the stakes with the number of red really left', () => {
    expect(warStakes(2)).toBe('Two more red and the war wins.');
    expect(warStakes(1)).toBe('One more red and the war wins.');
  });

  it('tells a + multiplier staff seated right of a × staff that order matters, once', () => {
    expect(adderRightOfMultiplier(['DUTY', 'STRATEGIST'])).toBe(false);
    expect(adderRightOfMultiplier(['STRATEGIST', 'DUTY'])).toBe(true);
    expect(adderRightOfMultiplier(['GOVERNOR', 'SURVEYOR'])).toBe(true);
    // + points sit anywhere: POINTS is multiplied by the whole multiplier either way.
    expect(adderRightOfMultiplier(['STRATEGIST', 'QM'])).toBe(false);
  });

  it('explains a dead deal once: SWAP for new regions, and stronger staff at the next shop', () => {
    // Seven red around a lone gold capital: a fresh deal where nothing reaches the target.
    const dead = deadDeal();
    expect(bestNow(dead)).toBeLessThan(dead.deal.target);
    const lines = linesFor(prevOf(dead), dead);
    expect(lines.find((l) => l.key === 'dead')).toMatchObject({
      text: 'Nothing here can win. SWAP for new regions, and hire stronger staff at the next shop.',
      beckon: 'swap',
      once: 'device',
      full: true,
    });
    // Still nothing after the swap (asked again of the new lit regions): SWAP cannot help now.
    const swapped = must(swap(dead));
    expect(bestNow(swapped)).toBeLessThan(swapped.deal.target);
    expect(linesFor(dead, swapped).find((l) => l.key === 'dead-staff')).toMatchObject({
      text: 'Nothing here can win. Hire stronger staff at the next shop.',
      once: 'device',
    });
    // The same turn dealt again on a new map (the dev hook's setOwner) is a deal put on the table too.
    const fresh = newGame('E2E-DEAD-3');
    const redealt = must(setOwners(fresh, 'G..GR....R..R.G...RR..GR......'));
    expect(bestNow(redealt)).toBeLessThan(redealt.deal.target);
    // Turn 1: no shop follows, so no hire is suggested.
    expect(linesFor(fresh, redealt).find((l) => l.key.startsWith('dead'))).toMatchObject({
      key: 'dead-swap',
      text: 'Nothing here can win. SWAP for new regions.',
      beckon: 'swap',
    });
    // A deal that can be won earns neither.
    const alive = { ...dead, deal: { ...dead.deal, target: 1n } };
    expect(linesFor(prevOf(alive), alive).some((l) => l.key.startsWith('dead') || l.key === 'reorder')).toBe(false);
  });

  it('suggests a hire only when a shop follows and an offer is within reach; otherwise says how to move on', () => {
    const dead = deadDeal();
    expect([dead.turn, dead.coins, hireLikely(dead)]).toEqual([6, 4, true]);
    const used = must(clearPins(must(swap(dead))));
    expect(swapProblem(used)).not.toBeNull();
    const deadLine = (prev: GameState, s: GameState) => linesFor(prev, s).find((l) => l.key.startsWith('dead'));
    // No coins: the next shop cannot help, so the line says how to end the turn.
    const broke = { ...used, coins: 0 };
    expect(hireLikely(broke)).toBe(false);
    expect(deadLine(dead, broke)).toMatchObject({ key: 'dead-pass', text: 'Nothing here can win. Pin one region and send to move on.', once: 'device' });
    // No shop after this turn (turn 7): the same.
    const odd = { ...used, turn: 7 };
    expect(hireLikely(odd)).toBe(false);
    expect(deadLine(dead, odd)?.key).toBe('dead-pass');
    // A full table counts the best sale: 0 coins and a Deputy (sells for 3) still buy a Duty Officer (3).
    const full = { ...broke, seats: (['DEPUTY', 'GOVERNOR', 'HARBOUR', 'SOVEREIGN', 'HERALD'] as const).map((id, i) => ({ uid: i + 1, id })) };
    expect(hireLikely(full)).toBe(true);
  });

  it('says once that a reorder wins a deal no send wins as seated', () => {
    const owner = decodeOwners('G.R.GGR..GR...G.GRGRGGGG.RGG..')!;
    const crit = position(newGame('CRIT-preview-3'), {
      owner,
      seats: ['STRATEGIST', 'DUTY', 'SOVEREIGN'],
      turn: 10,
      deal: { crisis: 'GLM', lit: ['VSY', 'NWK', 'WMS', 'DRF', 'KLP', 'FRM', 'GUL', 'TRN', 'SHL', 'BRK'], pile: ['LNK'], target: 2500n },
    });
    const lines = linesFor(prevOf(crit), crit);
    expect(lines.find((l) => l.key === 'reorder')).toMatchObject({ text: 'Drag your staff into a new order: this deal can win.', once: 'device', full: true });
    expect(lines.some((l) => l.key.startsWith('dead'))).toBe(false);
  });

  it('teaches the forgiving push: three misses, counted down after each one', () => {
    const map = IDS.map((id) => (['NWK', 'FRM', 'VSY'].includes(id) ? 'R' : 'G')).join('');
    const push = must(setOwners(newGame('PUSH-COACH'), map));
    expect(linesFor(prevOf(push), push).find((l) => l.key === 'push')).toMatchObject({
      text: 'No grey left. Win back the red. Three misses: ceasefire.',
      once: 'device',
    });
    const missOnce = must(send(pinAll({ ...push, deal: { ...push.deal, target: 10n ** 12n } }, [push.deal.crisis])));
    const after = linesFor(push, missOnce);
    expect(after.find((l) => l.key === 'push-miss')?.text).toBe('Missed. The red holds. Two misses left.');
    // War took nothing: no 'War took it' line on a push miss.
    expect(after.find((l) => l.key === 'miss')).toBeUndefined();
    expect(pushMissLine(1).text).toBe('Missed. The red holds. Miss once more: ceasefire.');
  });

  it('teaches SWAP on a miss that cannot grow: five pins, or nothing lit left to add', () => {
    const s = deadDeal();
    const one = pinAll(s, [s.deal.crisis]);
    const options = sendOptions(s).filter((o) => o.pins.length === 5);
    expect(options.length).toBeGreaterThan(0);
    const five = pinAll(s, options[0].pins);
    expect(linesFor(one, five).find((l) => l.key === 'swap')).toMatchObject({ beckon: 'swap', once: 'device' });
  });
});

/** A dealt turn (turn 4, swap unused) on a map where war hems in a single gold region. */
function deadDeal(): GameState {
  for (let i = 0; i < 400; i++) {
    let s = newGame(`DEAD-${i}`);
    const reds = ['ASK', 'BRN', 'EDV', 'NWK', 'VSY', 'ICW', 'QLN'];
    const map = IDS.map((id) => (id === 'LNK' ? 'G' : reds.includes(id) ? 'R' : '.')).join('');
    s = must(setOwners(s, map));
    s = { ...s, turn: 6, deal: { ...s.deal, target: 4_000n } };
    if (bestNow(s) < s.deal.target && swapProblem(s) === null) return s;
  }
  throw new Error('no dead deal found');
}

/** A stand-in for the game before a deal (the shop of the turn before). */
function prevOf(s: GameState): GameState {
  return { ...s, turn: s.turn - 1, phase: 'outcome' };
}
