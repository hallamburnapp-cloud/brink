/**
 * The simulator's pure parts: seatings, the time model (against numbers printed by the reference's
 * timing.py), the statistics helpers, the bots' helpers and one game per bot.
 */
import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng';
import { canAdd, legal, newGame, scorePins, groups, type GameState, type StaffId } from '../engine';
import { BOT_NAMES } from './roster';
import { bestSend, openingSpread, randomGroup } from './choose';
import { arrangeSeats, seatIds } from './drive';
import { evaluateGates } from './gates';
import { playGame, type TurnRow } from './play';
import { loadReference } from './reference';
import { seatings } from './sensible';
import { median, quantile, quantileInterval } from './stats';
import { digest, summarize, type GameDigest } from './summary';
import { FAST, FIRST, seconds, SLOW, STANDARD } from './timing';

describe('seatings', () => {
  it('seats adders before multipliers, weakest multiplier first', () => {
    expect(seatings(['HERALD', 'GOVERNOR', 'QM', 'STRATEGIST', 'DUTY'])).toEqual([['QM', 'DUTY', 'STRATEGIST', 'GOVERNOR', 'HERALD']]);
  });

  it('tries the Deputy in every seat but the last', () => {
    expect(seatings(['GOVERNOR', 'DEPUTY', 'QM'])).toEqual([
      ['DEPUTY', 'QM', 'GOVERNOR'],
      ['QM', 'DEPUTY', 'GOVERNOR'],
    ]);
    expect(seatings(['DEPUTY'])).toEqual([['DEPUTY']]);
  });
});

describe('time model (reference timing.py)', () => {
  const row = (r: Partial<TurnRow> & Pick<TurnRow, 'turn' | 'pins' | 'swaps' | 'firing' | 'pops' | 'recoloured'>): TurnRow => ({
    target: 64,
    score: 0,
    result: 'win',
    won: r.recoloured,
    gold: 1,
    red: 3,
    grey: 26,
    finalPush: false,
    onCrisis: true,
    spread: false,
    ...r,
  });
  // The same five turns the reference was given; its answers are printed below to the last digit.
  const log = [
    row({ turn: 1, pins: 5, swaps: 0, firing: 0, pops: 0, recoloured: 2 }),
    row({ turn: 2, pins: 4, swaps: 1, firing: 2, pops: 0, recoloured: 1, shopAffordable: true }),
    row({ turn: 3, pins: 5, swaps: 0, firing: 5, pops: 12, recoloured: 7 }),
    row({ turn: 4, pins: 3, swaps: 0, firing: 3, pops: 2, recoloured: 1, shopAffordable: false }),
    row({ turn: 5, pins: 5, swaps: 1, firing: 4, pops: 40, recoloured: 0 }),
  ];

  it('agrees with the reference to the last float digit', () => {
    expect(seconds(log, STANDARD)).toBe(243.49999999999997);
    expect(seconds(log, FIRST)).toBe(304.5);
    expect(seconds(log, SLOW)).toBe(388.50000000000006);
    expect(seconds(log, FAST)).toBe(179.1);
  });
});

describe('statistics, as the reference defines them', () => {
  it('median is the mean of the middle two for an even count', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([5, 1, 3])).toBe(3);
  });

  it('quantile takes rank floor(p x n)', () => {
    const xs = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    expect(quantile(xs, 0.9)).toBe(10);
    expect(quantile(xs, 0.1)).toBe(2);
  });

  it('a quantile interval brackets the sample quantile', () => {
    const xs = Array.from({ length: 400 }, (_, i) => i);
    const [lo, hi] = quantileInterval(xs, 0.5);
    expect(lo).toBeLessThan(median(xs));
    expect(hi).toBeGreaterThan(median(xs));
  });
});

describe('what the bots read off a deal', () => {
  const firstTurn = newGame('FIRST-WORLD');

  it('best send: the reference best_send on FIRST-WORLD turn 1 (390, ties to the pins first in id order)', () => {
    const best = bestSend(firstTurn);
    expect(best.score).toBe(390n);
    expect(best.regions).toBe(2);
    expect(best.pins).toEqual(['LNK', 'LTL', 'MRM', 'PBB', 'SHL']);
  });

  it('best send is the top exact score over every legal group', () => {
    for (const seed of ['W1', 'W2', 'W3']) {
      const s = newGame(seed);
      const top = groups(s.deal.lit, s.deal.crisis).reduce(
        (m, g) => {
          const v = scorePins(g, [], s.owner, s.deal.crisis).score;
          return v > m ? v : m;
        },
        0n,
      );
      expect(bestSend(s).score).toBe(top);
    }
  });

  it('the opening spread of FIRST-WORLD turn 1: 137 sends, best 390 against a median of 145', () => {
    const sp = openingSpread(firstTurn);
    expect(sp.legal).toBe(137);
    expect(sp.ratio).toBeCloseTo(390 / 145, 12);
    expect(sp).toMatchObject({ bestRegions: 2, medianRegions: 1, bestWins: true, medianWins: true, turn: 1 });
  });

  it('random groups are legal, sorted and within the size asked for', () => {
    const rng = new Rng('groups');
    for (const seed of ['W4', 'W5', 'W6', 'W7']) {
      const s = newGame(seed);
      for (let i = 0; i < 200; i++) {
        const g = randomGroup(s, rng, 3, 5);
        expect(legal(g, s.deal.lit, s.deal.crisis)).toBe(true);
        expect([...g].sort()).toEqual(g);
        expect(g.length).toBeLessThanOrEqual(5);
        // Fewer than 3 only when the group has no pinnable neighbour left.
        if (g.length < 3) expect(s.deal.lit.some((r) => canAdd(g, r, s.deal.lit, s.deal.crisis))).toBe(false);
      }
    }
  });
});

describe('seat arranging through moveSeat', () => {
  it('reaches any order of the seated staff', () => {
    let s: GameState = { ...newGame('W1'), seats: (['QM', 'DUTY', 'GOVERNOR', 'HERALD'] as StaffId[]).map((id, i) => ({ uid: i + 1, id })) };
    const order: StaffId[] = ['HERALD', 'QM', 'GOVERNOR', 'DUTY'];
    s = arrangeSeats(s, order);
    expect(seatIds(s)).toEqual(order);
  });
});

describe('a game per bot', () => {
  for (const bot of BOT_NAMES) {
    it(`${bot}: ends, logs every turn, keeps the map whole, and replays identically`, () => {
      const g = playGame('W11', bot);
      expect(['WORLD UNITED', 'CEASEFIRE', 'WAR']).toContain(g.end);
      expect(g.log).toHaveLength(g.turns);
      expect(g.spread).toHaveLength(g.turns);
      for (const r of g.log) expect(r.gold + r.red + r.grey).toBe(30);
      expect(g.gold + g.red + g.grey).toBe(30);
      if (g.end === 'WORLD UNITED') expect(g.gold).toBe(30);
      if (g.end === 'WAR') expect(g.red).toBeGreaterThanOrEqual(10);
      expect(g.log.filter((r) => r.shopAffordable !== undefined)).toHaveLength(g.shops);
      expect(playGame('W11', bot)).toEqual(g);
    });
  }

  it('greedy never shops and novice never fills a seat it cannot pay for', () => {
    expect(playGame('W12', 'greedy').seats).toEqual([]);
    const novice = playGame('W12', 'novice');
    expect(novice.seats.length).toBeLessThanOrEqual(5);
  });
});

describe('gates: the thresholds of SPEC section 16', () => {
  const fake = (end: GameDigest['end'], turns = 15, gold = 30): GameDigest => {
    const log: TurnRow[] = [];
    return {
      ...digest({ bot: 'sensible', seed: 'X0', end, turns, gold, red: end === 'WAR' ? 10 : 0, grey: 0, seats: ['QM'], shops: 0, log, spread: [] }),
      minutes: { std: 13, first: 14.5, slow: 18, fast: 9 },
      spread: [{ turn: 1, ratio: 3, bestRegions: 1, medianRegions: 1, bestWins: true, medianWins: true, legal: 50 }],
    };
  };
  const games = (held: number, lost: number) => [
    ...Array.from({ length: held }, () => fake('WORLD UNITED')),
    ...Array.from({ length: lost }, () => fake('WAR', 15, 12)),
  ];
  const gate = (id: string, gs: GameDigest[]) => evaluateGates({ sensible: summarize('sensible', gs) }).find((g) => g.id === id)!;

  it('G1 holds 55-70% includes both ends', () => {
    expect(gate('G1', games(55, 45)).pass).toBe(true);
    expect(gate('G1', games(70, 30)).pass).toBe(true);
    expect(gate('G1', games(54, 46)).pass).toBe(false);
    expect(gate('G1', games(71, 29)).pass).toBe(false);
  });

  it('a near miss on a small sample passes only loosely', () => {
    const g = gate('G1', games(53, 47));
    expect(g.pass).toBe(false);
    expect(g.passLoose).toBe(true);
    expect(gate('G1', games(30, 70)).passLoose).toBe(false);
  });

  it('G6 reads the median game length', () => {
    expect(gate('G6', games(60, 40)).text).toBe('15.0');
  });
});

describe('the reference results file', () => {
  it('parses all 17 gates, the outcomes of all six bots and the details', () => {
    const ref = loadReference();
    expect(ref.games).toBe(5000);
    expect(ref.allPass).toBe(true);
    expect(ref.gates.map((g) => g.id)).toEqual(Array.from({ length: 17 }, (_, i) => `G${i + 1}`));
    expect(ref.gates.find((g) => g.id === 'G15')?.text).toBe('OLDHAND 22.1%');
    expect(Object.keys(ref.outcomes).sort()).toEqual([...BOT_NAMES].sort());
    expect(ref.outcomes.sensible).toMatchObject({ worldUnited: 0.483, held: 0.625, turns: { median: 15, p10: 12, p90: 19 } });
    expect(ref.outcomes.sensible?.minutes.first).toEqual([13.5, 16.3]);
    expect(ref.detail.sensible?.finalPush).toBeCloseTo(0.553, 6);
  });
});
