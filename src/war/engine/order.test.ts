import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng';
import { STAFF_IDS, type StaffId } from '../content/staff';
import { IDS } from './board';
import { dealPool } from './deck';
import { bestSeating, orderKey, orderState, pushPool, pushWinnable, reduceFeatures, seatOrders } from './order';
import { newGame, setOwners } from './run';
import { Scorer, type Features } from './score';
import { dealFeatures } from './shop';
import { must, ownersFrom, position } from './testkit';
import { countOwner, crisisPool } from './world';

/** Every raw permutation of the seats (for the brute-force checks). */
function allPermutations<T>(xs: readonly T[]): T[][] {
  if (xs.length <= 1) return [[...xs]];
  return xs.flatMap((x, i) => allPermutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

function randomFeatures(rng: Rng): Features {
  const pins = 1 + rng.int(5);
  return {
    points: 3 + rng.int(48),
    pins,
    capitals: rng.int(pins + 1),
    ports: rng.int(pins + 1),
    gold: rng.int(pins + 1),
    crisis: rng.next() < 0.5,
  };
}

describe('seat orders: every seating that can score differently', () => {
  it('starts with the seats as they sit and merges seatings that score alike (at most 120)', () => {
    expect(seatOrders([])).toEqual([[]]);
    expect(seatOrders(['QM', 'HERALD'])).toEqual([['QM', 'HERALD']]);
    expect(seatOrders(['DUTY', 'SURVEYOR'])).toEqual([['DUTY', 'SURVEYOR']]);
    expect(seatOrders(['STRATEGIST', 'DUTY'])).toEqual([
      ['STRATEGIST', 'DUTY'],
      ['DUTY', 'STRATEGIST'],
    ]);
    const five: StaffId[] = ['OLDHAND', 'STRATEGIST', 'GOVERNOR', 'HARBOUR', 'SOVEREIGN'];
    expect(seatOrders(five)).toHaveLength(120);
    expect(seatOrders(five)[0]).toEqual(five);
    // A Deputy copies its right-hand neighbour, so where it sits matters.
    expect(seatOrders(['DEPUTY', 'QM']).length).toBe(2);
  });

  it('gives every raw permutation the same score as its merged twin (300 random line-ups)', () => {
    const rng = new Rng('seat-orders');
    for (let n = 0; n < 300; n++) {
      const seats = rng.shuffle([...STAFF_IDS]).slice(0, rng.int(6));
      const orders = seatOrders(seats);
      expect(orders.length).toBeLessThanOrEqual([1, 1, 2, 6, 24, 120][seats.length]);
      const gold = 1 + rng.int(29);
      const old = 10 + rng.int(51);
      const fs = Array.from({ length: 12 }, () => randomFeatures(rng));
      for (const p of allPermutations(seats)) {
        const twin = orders.find((o) => orderKey(o) === orderKey(p));
        expect(twin, p.join(' ')).toBeDefined();
        const a = new Scorer(p, gold, old);
        const b = new Scorer(twin!, gold, old);
        for (const f of fs) expect(a.score(f)).toBe(b.score(f));
      }
    }
  });
});

describe('what a deal allows under every seating', () => {
  it('keeps the best send of every line-up when it drops dominated sends, and agrees with brute force', () => {
    const rng = new Rng('deal-state');
    for (let n = 0; n < 120; n++) {
      const owner = ownersFrom([], []);
      for (const r of IDS) owner[r] = (['grey', 'gold', 'red'] as const)[rng.int(3)];
      const crisis = rng.pick([...IDS]);
      const lit = rng.shuffle(IDS.filter((r) => r !== crisis)).slice(0, 10);
      const raw = dealFeatures(lit, crisis, owner);
      const fs = reduceFeatures(raw);
      expect(fs.length).toBeLessThanOrEqual(raw.length);
      const seats = rng.shuffle([...STAFF_IDS]).slice(0, rng.int(6));
      const gold = countOwner(owner, 'gold');
      const old = 10 + 2 * rng.int(16);
      const bestOf = (order: readonly StaffId[], features: readonly Features[]) => {
        const sc = new Scorer(order, gold, old);
        return features.reduce((m, f) => (sc.score(f) > m ? sc.score(f) : m), 0n);
      };
      const perms = allPermutations(seats);
      const bests = perms.map((p) => bestOf(p, raw));
      perms.forEach((p, i) => expect(bestOf(p, fs)).toBe(bests[i]));
      const seated = bests[0];
      const top = bests.reduce((m, v) => (v > m ? v : m), 0n);
      for (const T of [seated, seated + 1n, top, top + 1n]) {
        const want = seated >= T ? 'live' : top >= T ? 'reorder' : 'dead';
        expect(orderState(fs, seats, gold, old, T)).toBe(want);
      }
      expect(bestSeating(fs, seats, gold, old).score).toBe(top);
    }
  });

  it('enumerates a five-seat line-up quickly (every distinct seating, a deal of 10 lit regions)', () => {
    const s = newGame('ORDER-SPEED');
    const seats: StaffId[] = ['OLDHAND', 'STRATEGIST', 'GOVERNOR', 'HARBOUR', 'SOVEREIGN'];
    const fs = reduceFeatures(dealFeatures(s.deal.lit, s.deal.crisis, s.owner));
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) orderState(fs, seats, 1, 10, 10n ** 30n);
    expect((performance.now() - t0) / 20).toBeLessThan(50);
  });
});

describe('the final push draws its crisis from red regions a fresh deal can win (A2)', () => {
  // 26 gold, war holds the last four in IDS order (Tallowmere, Tern Isle, Vessary ... in id order).
  const map = ownersFrom(IDS.slice(0, 26), IDS.slice(26));

  it('keeps the red regions touching gold whose deal pile can reach the target with the best seating', () => {
    const { pool: red, finalPush } = crisisPool(map);
    expect(finalPush).toBe(true);
    const winnable = (T: bigint) => red.filter((c) => pushWinnable(map, c, [], 10, T));
    // Every candidate's best send with no staff, on the regions a fresh deal could light.
    const best = red.map((c) => {
      const sc = new Scorer([], countOwner(map, 'gold'), 10);
      return dealFeatures(dealPool(map, c), c, map).reduce((m, f) => (sc.score(f) > m ? sc.score(f) : m), 0n);
    });
    const lo = best.reduce((m, v) => (v < m ? v : m));
    const hi = best.reduce((m, v) => (v > m ? v : m));
    expect(lo).toBeLessThan(hi);
    // A target only some reach: the pool is those.
    const mid = pushPool(map, red, [], 10, hi);
    expect(mid).toEqual({ pool: winnable(hi), draw: 'winnable' });
    expect(mid.pool.length).toBeGreaterThan(0);
    expect(mid.pool.length).toBeLessThan(red.length);
    // A target none reaches: all of them, as before.
    expect(pushPool(map, red, [], 10, hi + 1n)).toEqual({ pool: red, draw: 'any' });
  });

  it('is what a push turn draws from: every crisis dealt in the push is winnable on some fresh deal when one is', () => {
    let seen = 0;
    for (let i = 0; i < 40; i++) {
      const s = must(setOwners(position(newGame(`PUSH-DRAW-${i}`), { turn: 2 + (i % 8) }), map));
      expect(s.deal.finalPush).toBe(true);
      const { pool, draw } = pushPool(s.owner, crisisPool(s.owner).pool, [], s.oldHandM10, s.deal.target);
      expect(pool).toContain(s.deal.crisis);
      if (draw === 'winnable') {
        expect(pushWinnable(s.owner, s.deal.crisis, [], s.oldHandM10, s.deal.target)).toBe(true);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(5);
  });
});
