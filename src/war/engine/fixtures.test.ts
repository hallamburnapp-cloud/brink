/**
 * Every case in docs/war/v2/reference/fixtures.json (SPEC section 15): the TypeScript engine must
 * agree with the Python reference on all of them, traces included.
 */
import { describe, expect, it } from 'vitest';
import { IDS } from './board';
import { groups, legal, lift } from './groups';
import { nextMark, regionsWon, target } from './ladder';
import { RULES } from './rules';
import { newGame, nextTurn, send } from './run';
import { goldCount, scorePins } from './score';
import { bestScore, dealFeatures } from './shop';
import { must, pinAll, position, tapOrder } from './testkit';
import { bestSeating, pushPool, reduceFeatures } from './order';
import { dealState, deadDeal, readoutView, sendLabel } from './view';
import { loadFixtures, toReference } from './testdata';
import { decodeOwners, encodeOwners, warSpreadTarget, winOrder } from './world';

const fx = loadFixtures();

const owners = (text: string) => {
  const o = decodeOwners(text);
  if (!o) throw new Error(`bad owner string ${text}`);
  return o;
};

describe('reference fixtures', () => {
  it('uses the same ids, map and tunables', () => {
    expect(fx.ids).toEqual([...IDS]);
    expect(fx.params).toMatchObject({
      HOME: RULES.home,
      START_WAR: RULES.startWar,
      WAR_MIN_DIST: RULES.warMinDist,
      START_COINS: RULES.startCoins,
      COIN_PER_REGION: RULES.coinPerRegion,
      LOSE_AT: RULES.loseAt,
      LIT: RULES.lit,
      NEAR: RULES.near,
      MAXPINS: RULES.maxPins,
      SWAPS: RULES.swaps,
      T0: Number(RULES.target0),
      TR: [Number(RULES.targetRatio.num), Number(RULES.targetRatio.den)],
      LADDER: RULES.ladder.map(Number),
      LADDER_THEN: Number(RULES.ladderThen),
      WAR_EVERY: RULES.warEvery,
      SHOP_FIRST: RULES.shopFirst,
      SHOP_EVERY: RULES.shopEvery,
      OFFERS: RULES.offers,
      SEATS: RULES.seats,
      REROLL: RULES.reroll,
      PUSH_MISSES: RULES.pushMisses,
    });
  });

  it('targets T(1..40)', () => {
    expect(fx.targets).toHaveLength(40);
    expect(fx.targets.map((_, i) => target(i + 1))).toEqual(fx.targets.map((t) => BigInt(t)));
  });

  it(`scores all ${fx.score.length} score cases, with full traces on the first 80`, () => {
    expect(fx.score).toHaveLength(400);
    let traced = 0;
    fx.score.forEach((c, i) => {
      const res = scorePins(c.pins, c.seats, owners(c.owner), c.crisis, c.oldhandM10, { trace: !!c.trace });
      const where = `case ${i}`;
      expect(res.score.toString(), where).toBe(c.score);
      expect(Number(res.points), where).toBe(c.points);
      expect(res.m10.toString(), where).toBe(c.m10);
      if (c.trace) {
        traced++;
        expect(toReference(res.trace!), where).toEqual(c.trace);
      }
    });
    expect(traced).toBe(80);
  });

  it(`climbs the ladder in all ${fx.ladder.length} cases`, () => {
    expect(fx.ladder).toHaveLength(200);
    for (const c of fx.ladder) {
      const T = BigInt(c.target);
      const s = BigInt(c.score);
      expect(regionsWon(s, T), `${c.score} vs ${c.target}`).toBe(c.regions);
      expect(nextMark(s, T).toString(), `${c.score} vs ${c.target}`).toBe(c.next);
    }
  });

  it(`judges all ${fx.legal.length} legal cases`, () => {
    expect(fx.legal).toHaveLength(300);
    for (const c of fx.legal) expect(legal(c.pins, c.lit, c.crisis), c.pins.join(' ')).toBe(c.legal);
  });

  it(`counts the legal groups in all ${fx.groups.length} groups cases`, () => {
    expect(fx.groups).toHaveLength(100);
    for (const c of fx.groups) expect(groups(c.lit, c.crisis), c.crisis).toHaveLength(c.count);
  });

  it(`orders wins in all ${fx.winOrder.length} winOrder cases`, () => {
    expect(fx.winOrder.length).toBeGreaterThan(190);
    for (const c of fx.winOrder) expect(winOrder(c.crisis, owners(c.owner), c.k, c.pins), c.owner).toEqual(c.order);
  });

  it(`spreads war in all ${fx.warSpread.length} warSpread cases`, () => {
    expect(fx.warSpread).toHaveLength(150);
    for (const c of fx.warSpread) expect(warSpreadTarget(owners(c.owner)), c.owner).toBe(c.spreadsTo);
  });

  it(`lifts pins in tap order in all ${fx.lift.length} lift cases`, () => {
    expect(fx.lift).toHaveLength(100);
    for (const c of fx.lift) expect(lift(c.pinsInTapOrder, c.lift)).toEqual(c.left);
  });

  it(`says what each of the ${fx.dead.length} dead-deal cases allows, under every seating`, () => {
    expect(fx.dead).toHaveLength(200);
    const base = newGame('FIXTURES-DEAD');
    const states = { live: 0, reorder: 0, dead: 0 };
    for (const c of fx.dead) {
      const owner = owners(c.owner);
      expect(bestScore(c.lit, c.crisis, owner, c.seats, c.oldhandM10).toString(), c.owner).toBe(c.best);
      const best = bestSeating(reduceFeatures(dealFeatures(c.lit, c.crisis, owner)), c.seats, goldCount(owner), c.oldhandM10);
      expect(best.score.toString(), c.owner).toBe(c.bestAnyOrder);
      expect(best.seats, c.owner).toEqual(c.seating);
      const s = position(base, {
        owner,
        seats: c.seats,
        oldHandM10: c.oldhandM10,
        deal: { crisis: c.crisis, lit: c.lit, target: BigInt(c.target), finalPush: c.finalPush, pile: c.pile, swapsLeft: c.swap ? 1 : 0 },
      });
      expect(dealState(s), c.owner).toBe(c.state);
      expect(deadDeal(s), c.owner).toBe(c.dead);
      expect(sendLabel(s).text, c.owner).toBe(c.label);
      if (c.line) expect(readoutView(s).line, c.owner).toBe(c.line);
      states[c.state]++;
    }
    // Every state, and every label, is among the cases.
    expect(states.live).toBeGreaterThan(30);
    expect(states.reorder).toBeGreaterThan(5);
    expect(states.dead).toBeGreaterThan(30);
    expect(new Set(fx.dead.map((c) => c.label))).toEqual(
      new Set(['PIN A REGION', 'NO SEND CAN WIN · SWAP', 'NO SEND CAN WIN · SEND TO PASS', 'NO SEND CAN WIN · USES A MISS']),
    );
  });

  it(`draws the final push's crisis from the red regions a fresh deal can win, in all ${fx.pushDraw.length} cases`, () => {
    expect(fx.pushDraw).toHaveLength(120);
    let narrowed = 0;
    for (const c of fx.pushDraw) {
      const owner = owners(c.owner);
      const drawn = pushPool(owner, c.red, c.seats, c.oldhandM10, target(c.turn));
      expect(drawn.pool, c.owner).toEqual(c.pool);
      expect(drawn.draw, c.owner).toBe(c.draw);
      if (c.pool.length < c.red.length) narrowed++;
    }
    expect(narrowed).toBeGreaterThan(20);
  });

  it(`plays all ${fx.push.length} final-push sends: a miss changes no region, the 3rd is a CEASEFIRE`, () => {
    expect(fx.push).toHaveLength(80);
    const base = newGame('FIXTURES-PUSH');
    const endings = new Set<string | null>();
    for (const c of fx.push) {
      const at = position(base, {
        owner: owners(c.owner),
        seats: c.seats,
        oldHandM10: c.oldhandM10,
        turn: c.turn,
        pushMisses: c.pushMissesBefore,
        deal: { crisis: c.crisis, lit: c.lit, target: BigInt(c.target), finalPush: true },
      });
      const pinned = pinAll(at, tapOrder(c.pins));
      expect(sendLabel(pinned).text, c.owner).toBe(c.label);
      const s = must(send(pinned));
      expect(s.lastSend!.score.toString()).toBe(c.score);
      expect(s.lastSend!.result).toBe(c.result);
      expect(s.lastSend!.won.map((w) => w.id)).toEqual(c.won);
      expect(s.pushMisses).toBe(c.pushMissesAfter);
      expect(s.lastSend!.pushMisses).toBe(c.pushMissesAfter);
      expect(s.ending).toBe(c.ending);
      expect(encodeOwners(s.owner)).toBe(c.ownerAfter);
      if (c.result === 'miss') expect(c.ownerAfter).toBe(c.owner);
      endings.add(c.ending);
    }
    expect([...endings].sort()).toEqual(['CEASEFIRE', 'WORLD UNITED', null].sort());
  });

  it('plays the scripted first game, turns 1-2, with the coached sends', () => {
    expect(fx.firstWorld).toHaveLength(2);
    let s = newGame('FIRST-WORLD');
    fx.firstWorld.forEach((c, i) => {
      if (i > 0) s = must(nextTurn(s));
      expect(s.turn).toBe(c.turn);
      expect(s.deal.crisis).toBe(c.crisis);
      expect(s.deal.target).toBe(BigInt(c.target));
      expect(s.deal.lit).toEqual(c.lit);
      s = must(send(pinAll(s, c.pins)));
      const r = s.lastSend!;
      expect(r.score.toString()).toBe(c.score);
      expect(r.won.map((w) => w.id)).toEqual(c.won);
      expect(r.gold).toBe(c.gold);
      expect(r.red).toBe(c.red);
      expect(s.coins).toBe(c.coins);
      expect(encodeOwners(s.owner)).toBe(c.owner);
    });
  });
});
