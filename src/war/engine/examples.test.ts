/**
 * The worked examples of SPEC section 6 (and the first shop of section 4), with the exact numbers
 * `python3 examples.py` prints in docs/war/v2/reference/.
 */
import { describe, expect, it } from 'vitest';
import type { RegionId } from '../content/map';
import type { StaffId } from '../content/staff';
import { formatM10 } from './format';
import { regionsWon, target } from './ladder';
import { newGame, nextTurn, send } from './run';
import { scorePins } from './score';
import { CROWN } from './seeds';
import { bestOnOpening, previewNumber } from './shop';
import { medianScore, must, ownersFrom, pinAll, position, sendOptions } from './testkit';
import type { GameState } from './types';
import { preview, readoutView, sendLabel } from './view';
import { countOwner, crisisPool, regionsOf, warSpreadTarget, winOrder } from './world';

const sorted = (ids: readonly RegionId[]) => [...ids].sort();

function previewOf(s: GameState, pins: readonly RegionId[]) {
  const p = pinAll(s, pins);
  return { p: preview(p)!, label: sendLabel(p).text, line: readoutView(p).line };
}

describe('Example 1: FIRST-WORLD turns 1-2 (no staff)', () => {
  const turn1 = newGame('FIRST-WORLD');

  it('deals turn 1 as scripted: target 64, crisis Shoal, ten lit regions', () => {
    expect(turn1.turn).toBe(1);
    expect(turn1.deal.target).toBe(64n);
    expect(turn1.deal.crisis).toBe('SHL');
    expect(turn1.deal.lit).toEqual(['LNK', 'PBB', 'TRN', 'GUL', 'DRF', 'LTL', 'MRM', 'MRD', 'KLP', 'TLM']);
    expect(regionsOf(turn1.owner, 'gold')).toEqual(['LNK']);
    expect(sorted(regionsOf(turn1.owner, 'red'))).toEqual(['DNM', 'FLE', 'ORN']);
  });

  it('scores the coached steps', () => {
    const steps: Array<[RegionId[], bigint, string, string]> = [
      [['SHL'], 14n, 'MISS · SHORT BY 50', 'NEED 64'],
      [['SHL', 'LNK'], 68n, 'WINS 1 REGION', 'NEXT REGION AT 256'],
      [['SHL', 'LNK', 'PBB'], 138n, 'WINS 1 REGION', 'NEXT REGION AT 256'],
      [['SHL', 'LNK', 'PBB', 'MRM'], 264n, 'WINS 2 REGIONS', 'NEXT REGION AT 1,024'],
      [['SHL', 'LNK', 'PBB', 'MRM', 'TRN'], 380n, 'WINS 2 REGIONS', 'NEXT REGION AT 1,024'],
      [['LNK', 'PBB', 'TRN', 'GUL', 'DRF'], 140n, 'WINS 1 REGION', 'NEXT REGION AT 256'],
    ];
    for (const [pins, score, label, line] of steps) {
      const v = previewOf(turn1, pins);
      expect(v.p.score, pins.join(' ')).toBe(score);
      expect(v.label, pins.join(' ')).toBe(label);
      expect(v.line, pins.join(' ')).toBe(line);
    }
    const shoal = previewOf(turn1, ['SHL']).p;
    expect([shoal.points, formatM10(shoal.m10)]).toEqual([7n, '2.0']);
    const four = previewOf(turn1, ['SHL', 'LNK', 'PBB', 'MRM']).p;
    expect([four.points, formatM10(four.m10)]).toEqual([33n, '8.0']);
    expect(four.wins).toEqual(['SHL', 'PBB']);
  });

  it('has 137 legal sends: median 145, 100 win, 40 win 2, best 390', () => {
    const options = sendOptions(turn1);
    expect(options).toHaveLength(137);
    expect(medianScore(options)).toBe(145n);
    expect(options.filter((o) => o.regions >= 1)).toHaveLength(100);
    expect(options.filter((o) => o.regions >= 2)).toHaveLength(40);
    expect(options[0].score).toBe(390n);
    const best = options.filter((o) => o.score === 390n).map((o) => o.pins.join(' '));
    expect(best).toContain('LTL MRM PBB SHL TLM');
  });

  it('sends the coached five: Shoal then Pebbleby turn gold; GOLD 3, coins 6', () => {
    const s = must(send(pinAll(turn1, ['SHL', 'LNK', 'PBB', 'MRM', 'TRN'])));
    expect(s.lastSend!.won.map((w) => w.id)).toEqual(['SHL', 'PBB']);
    expect(countOwner(s.owner, 'gold')).toBe(3);
    expect(s.coins).toBe(6);
    expect(s.phase).toBe('outcome');
  });

  const turn2 = must(nextTurn(must(send(pinAll(turn1, ['SHL', 'LNK', 'PBB', 'MRM', 'TRN'])))));

  it('turn 2: target 96, crisis Tern Isle; 310, 380, then 390 (the only send of 171 that wins 2)', () => {
    expect(turn2.deal.target).toBe(96n);
    expect(turn2.deal.crisis).toBe('TRN');
    expect(turn2.deal.lit).toEqual(['LNK', 'SHL', 'PBB', 'GUL', 'MRD', 'RMH', 'EDV', 'ASK', 'DRF', 'GLM']);
    expect(previewOf(turn2, ['TRN', 'LNK', 'PBB', 'SHL', 'GUL'])).toMatchObject({
      p: { score: 310n },
      label: 'WINS 1 REGION',
      line: 'NEXT REGION AT 384',
    });
    expect(previewOf(turn2, ['TRN', 'MRD', 'EDV', 'LNK', 'PBB']).p.score).toBe(380n);
    expect(previewOf(turn2, ['TRN', 'MRD', 'EDV', 'LNK', 'SHL'])).toMatchObject({ p: { score: 390n }, label: 'WINS 2 REGIONS' });
    const options = sendOptions(turn2);
    expect(options).toHaveLength(171);
    expect(options.filter((o) => o.regions >= 2)).toHaveLength(1);
  });

  const afterTurn2 = must(send(pinAll(turn2, ['TRN', 'MRD', 'EDV', 'LNK', 'SHL'])));

  it('sending 390 wins Tern Isle then Morrow Downs; GOLD 5, coins 8; the shop opens', () => {
    expect(afterTurn2.lastSend!.won.map((w) => w.id)).toEqual(['TRN', 'MRD']);
    expect(countOwner(afterTurn2.owner, 'gold')).toBe(5);
    expect(afterTurn2.coins).toBe(8);
    expect(afterTurn2.phase).toBe('shop');
  });

  it('first shop: Duty Officer, Quartermaster, Harbourmaster; previews 390 → 702, 590, 2,343; both cheap ones 1,062', () => {
    expect(afterTurn2.shop!.offers).toEqual(['DUTY', 'QM', 'HARBOUR']);
    const p = [0, 1, 2].map((slot) => previewNumber(afterTurn2, slot)!);
    expect(p.map((x) => x.before)).toEqual([390n, 390n, 390n]);
    expect(p.map((x) => x.after)).toEqual([702n, 590n, 2_343n]);
    expect(bestOnOpening(afterTurn2, ['DUTY', 'QM'])).toBe(1_062n);
    expect(bestOnOpening(afterTurn2, ['QM', 'DUTY'])).toBe(1_062n);
  });
});

// ---------------------------------------------------------------- Example 2's map

const EX2_GOLD: RegionId[] = [
  'BRK', 'DRF', 'FLE', 'FRM', 'GLM', 'GUL', 'HRT', 'KLM', 'KLP', 'LNK', 'MRD',
  'MRM', 'ORN', 'PBB', 'RMH', 'SHL', 'SLW', 'TLM', 'TRN', 'WMS', 'WNM',
];
const EX2_RED: RegionId[] = ['ASK', 'BRN', 'EDV', 'NWK', 'VSY'];
const EX2_LIT: RegionId[] = ['LNK', 'DNM', 'MRM', 'GUL', 'PBB', 'TLM', 'FLE', 'ORN', 'DRF', 'WMS'];
const EX2_SEATS: StaffId[] = ['QM', 'DUTY', 'STRATEGIST', 'GOVERNOR', 'HARBOUR'];
const BEST: RegionId[] = ['MRM', 'LTL', 'FLE', 'TLM', 'ORN'];
/** The same five in an order a player can tap (each touches an earlier pin). */
const BEST_TAPS: RegionId[] = ['LTL', 'TLM', 'ORN', 'FLE', 'MRM'];
const ex2Owner = ownersFrom(EX2_GOLD, EX2_RED);

function ex2(seats: readonly StaffId[], turn = 11): GameState {
  return position(newGame('EX2'), {
    owner: ex2Owner,
    seats,
    turn,
    deal: { crisis: 'LTL', lit: EX2_LIT, target: target(turn) },
  });
}

/** The multiplier after the last pin, then after each staff event and the crisis x2. */
function multiplierSteps(pins: readonly RegionId[], seats: readonly StaffId[]): string[] {
  const trace = scorePins(pins, seats, ex2Owner, 'LTL', 10, { trace: true }).trace!;
  const pinEvents = trace.filter((e) => e.kind === 'pin');
  const rest = trace.filter((e) => e.kind !== 'pin' && e.kind !== 'slam');
  return [pinEvents[pinEvents.length - 1], ...rest].map((e) => formatM10(e.m10));
}

describe('Example 2: an ordinary turn 11 (target 3,700, seed W56)', () => {
  it('scores the best send 82,884 with the trace of section 6', () => {
    const res = scorePins(BEST, EX2_SEATS, ex2Owner, 'LTL', 10, { trace: true });
    expect(res.score).toBe(82_884n);
    expect(res.points).toBe(60n);
    expect(multiplierSteps(BEST, EX2_SEATS)).toEqual([
      '5.0', '5.0', '9.0', '27.0', '40.5', '60.7', '91.0', '136.5', '204.7', '307.0', '460.5', '690.7', '1,381.4',
    ]);
    const trace = res.trace!;
    expect(trace.filter((e) => e.kind === 'pin').map((e) => (e as { region: string }).region)).toEqual([
      'MRM', 'LTL', 'FLE', 'TLM', 'ORN',
    ]);
    expect(trace.filter((e) => e.kind === 'regionStaff').map((e) => [e.seat, (e as { region: string }).region])).toEqual([
      [3, 'MRM'], [3, 'FLE'], [3, 'TLM'], [3, 'ORN'],
      [4, 'MRM'], [4, 'LTL'], [4, 'FLE'], [4, 'ORN'],
    ]);
  });

  it('wins 3: Lintel, Dunmarrow, Brindle Coast', () => {
    const s = must(send(pinAll(ex2(EX2_SEATS), BEST_TAPS)));
    expect(s.lastSend!.regions).toBe(3);
    expect(s.lastSend!.won.map((w) => w.id)).toEqual(['LTL', 'DNM', 'BRN']);
    expect(s.lastSend!.won[2]).toMatchObject({ wasRed: true });
    expect(s.lastSend!.won[2].path[0]).toBe('LTL');
    expect(s.lastSend!.won[2].path).toHaveLength(5);
  });

  it('prices the other choices on this deal', () => {
    const score = (pins: RegionId[], seats = EX2_SEATS) => scorePins(pins, seats, ex2Owner, 'LTL').score;
    expect(score(['LTL', 'TLM'])).toBe(972n);
    expect(score(['PBB', 'MRM', 'LNK', 'DRF', 'FLE'])).toBe(59_052n);
    expect(score(['LTL', 'DNM', 'FLE', 'TLM', 'ORN'])).toBe(32_542n);
    expect(score(BEST, ['QM', 'STRATEGIST', 'GOVERNOR', 'HARBOUR', 'DUTY'])).toBe(46_428n);
    expect(score(BEST, ['DUTY', 'STRATEGIST', 'GOVERNOR', 'HARBOUR', 'QM'])).toBe(82_884n);
    expect(score(BEST, [])).toBe(400n);
    const T = target(11);
    expect([972n, 59_052n, 32_542n, 46_428n, 400n].map((v) => regionsWon(v, T))).toEqual([0, 2, 2, 2, 0]);
  });

  it('has 56 legal sends: median 2,006, 21 win', () => {
    const options = sendOptions(ex2(EX2_SEATS));
    expect(options).toHaveLength(56);
    expect(medianScore(options)).toBe(2_006n);
    expect(options.filter((o) => o.regions > 0)).toHaveLength(21);
    expect(options[0].score).toBe(82_884n);
  });
});

describe('Example 3: the Crown (turn 14, target 12,000)', () => {
  it('loads the CROWN demo exactly', () => {
    const s = newGame('anything', { demo: 'crown' });
    expect(s.seed).toBe('CROWN');
    expect(s.mode).toBe('crown');
    expect(s.turn).toBe(14);
    expect(s.deal.target).toBe(12_000n);
    expect(s.seats.map((x) => x.id)).toEqual(['DUTY', 'DEPUTY', 'SOVEREIGN', 'HARBOUR', 'HERALD']);
    expect(s.coins).toBe(6);
    expect(s.deal.crisis).toBe('LTL');
    expect(s.deal.lit).toEqual(EX2_LIT);
    expect(s.deal.pile).toEqual(['SHL', 'KLP', 'KLM', 'BRK', 'TRN', 'GLM']);
    expect(s.owner).toEqual(ex2Owner);
  });

  it('scores 5,598,720 and wins 7, leaving Quillon grey and Northwake red', () => {
    const crown = newGame('CROWN', { demo: 'crown' });
    expect(multiplierSteps(CROWN.pins, CROWN.seats)).toEqual([
      '5.0', '9.0', '18.0', '36.0', '72.0', '144.0', '288.0', '576.0', '1,152.0', '2,304.0', '4,608.0', '9,216.0',
      '13,824.0', '20,736.0', '31,104.0', '46,656.0', '69,984.0', '139,968.0',
    ]);
    const s = must(send(pinAll(crown, CROWN.pins)));
    expect(s.lastSend!.score).toBe(5_598_720n);
    expect(s.lastSend!.won.map((w) => w.id)).toEqual(['LTL', 'DNM', 'BRN', 'ICW', 'EDV', 'ASK', 'VSY']);
    expect(regionsOf(s.owner, 'grey')).toEqual(['QLN']);
    expect(regionsOf(s.owner, 'red')).toEqual(['NWK']);
    const viaDeputy = s.lastSend!.trace.filter((e) => e.kind === 'regionStaff' && e.viaDeputy);
    expect(viaDeputy).toHaveLength(5);
    expect(viaDeputy.every((e) => e.kind === 'regionStaff' && e.seat === 1 && e.staff === 'SOVEREIGN')).toBe(true);
  });

  it('with the Deputy in seat 3: 1,328,576 (WIN 5); with no Deputy: 174,960 (WIN 2); the ceiling 6,998,400', () => {
    const T = target(14);
    const a = scorePins(BEST, ['DUTY', 'SOVEREIGN', 'DEPUTY', 'HARBOUR', 'HERALD'], ex2Owner, 'LTL').score;
    const b = scorePins(BEST, ['DUTY', 'SOVEREIGN', 'HARBOUR', 'HERALD'], ex2Owner, 'LTL').score;
    expect([a, regionsWon(a, T)]).toEqual([1_328_576n, 5]);
    expect([b, regionsWon(b, T)]).toEqual([174_960n, 2]);
    // Five 10-point pins, the crisis among them: Wintermast, Lantern Key, Tallowmere, Marram, Edda Vale.
    const tens = ownersFrom(['WMS', 'LNK', 'TLM', 'MRM'], []);
    expect(scorePins(['WMS', 'LNK', 'TLM', 'MRM', 'EDV'], CROWN.seats, tens, 'EDV').score).toBe(6_998_400n);
  });
});

describe('Example 4: where wins and war go (Example 2 map, crisis Lintel)', () => {
  it('orders the wins', () => {
    expect(winOrder('LTL', ex2Owner, 1)).toEqual(['LTL']);
    expect(winOrder('LTL', ex2Owner, 2)).toEqual(['LTL', 'DNM']);
    expect(winOrder('LTL', ex2Owner, 3)).toEqual(['LTL', 'DNM', 'BRN']);
    expect(winOrder('LTL', ex2Owner, 5)).toEqual(['LTL', 'DNM', 'BRN', 'ICW', 'EDV']);
    expect(winOrder('LTL', ex2Owner, 8)).toEqual(['LTL', 'DNM', 'BRN', 'ICW', 'EDV', 'ASK', 'VSY', 'NWK']);
  });

  it('a miss turns Lintel red (war 5 → 6)', () => {
    const s = must(send(pinAll(ex2([], 13), ['LTL'])));
    expect(s.lastSend!.result).toBe('miss');
    expect(s.lastSend!.lost).toEqual({ id: 'LTL', from: null });
    expect(s.owner.LTL).toBe('red');
    expect(countOwner(s.owner, 'red')).toBe(6);
    expect(s.lastSend!.spread).toBeNull();
  });

  it('war spreading by itself goes to Iceward, not Quillon', () => {
    expect(warSpreadTarget(ex2Owner)).toBe('ICW');
  });
});

describe('Example 5: the final push', () => {
  const gold5 = Object.keys(ex2Owner).filter((r) => !['EDV', 'ASK', 'QLN'].includes(r));
  const push = ownersFrom(gold5, ['EDV', 'ASK', 'QLN']);

  function pushTurn(targetValue: bigint): GameState {
    return position(newGame('PUSH'), {
      owner: push,
      turn: 20,
      deal: { crisis: 'EDV', lit: ['VSY', 'MRD', 'RMH'], target: targetValue, finalPush: true },
    });
  }

  it('flares crises only on red regions touching gold', () => {
    expect(crisisPool(push)).toEqual({ pool: ['ASK', 'EDV', 'QLN'], finalPush: true });
  });

  it('a win of 2 on Edda Vale takes Edda Vale then Ashkettle; a win of 3 takes all three: WORLD UNITED', () => {
    expect(winOrder('EDV', push, 2)).toEqual(['EDV', 'ASK']);
    expect(winOrder('EDV', push, 3)).toEqual(['EDV', 'ASK', 'QLN']);
    const s = must(send(pinAll(pushTurn(1n), ['EDV'])));
    expect(s.lastSend!.regions).toBe(3);
    expect(s.ending).toBe('WORLD UNITED');
    expect(s.phase).toBe('over');
    expect(countOwner(s.owner, 'gold')).toBe(30);
  });

  it('a miss is a CEASEFIRE that changes no region: 27 of 30, two stars', () => {
    const before = pushTurn(target(20));
    expect(sendLabel(pinAll(before, ['EDV'])).text).toBe('MISS · CEASEFIRE');
    const s = must(send(pinAll(before, ['EDV'])));
    expect(s.ending).toBe('CEASEFIRE');
    expect(s.owner).toEqual(push);
    expect(s.lastSend!.lost).toBeNull();
    expect(s.lastSend!.spread).toBeNull();
    expect(countOwner(s.owner, 'gold')).toBe(27);
  });
});
