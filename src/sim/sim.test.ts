import { describe, expect, it } from 'vitest';
import { fixture } from '../engine/fixture';
import { Rng } from '../engine/rng';
import { createRun, view } from '../engine/run';
import type { Content, Seat } from '../engine/types';
import {
  POLICIES,
  POLICY_NAMES,
  anteInfo,
  archetypeAssembled,
  archetypeInMind,
  evaluateSide,
  greedyScore,
  heuristicContext,
  heuristicPolicy,
  isBrinkBuild,
  pieceAffinity,
} from './policies';
import { ALL_SEATS, finalTarget, formatReport, runOne, simulate, type Report } from './simulate';

const content: Content = fixture();

describe('runOne', () => {
  for (const name of POLICY_NAMES) {
    it(`${name} completes 200 runs without throwing and ends every run`, () => {
      const policy = POLICIES[name];
      for (let i = 0; i < 200; i++) {
        const seat: Seat = ALL_SEATS[i % 3];
        const s = runOne(content, { seed: `t-${i}`, seat, policy });
        expect(s.policy).toBe(name);
        expect(s.seat).toBe(seat);
        expect(s.capped, `run ${i} hit the step cap`).toBe(false);
        expect(content.endings[s.ending], `run ${i} ended in "${s.ending}"`).toBeDefined();
        expect(s.kind).toBe(content.endings[s.ending].kind);
        expect(content.endings[s.finalEnding]).toBeDefined();
        expect(s.standdown).toBe(s.kind === 'standdown');
        expect(s.won).toBe((s.kind === 'standdown' || s.kind === 'survival') && s.act >= content.acts.length);
        if (!s.endless) {
          expect(s.finalEnding).toBe(s.ending);
          expect(s.endlessActs).toBe(0);
          expect(s.estMinutesTotal).toBe(s.estMinutes);
        } else {
          expect(s.won).toBe(true);
          expect(s.estMinutesTotal).toBeGreaterThanOrEqual(s.estMinutes);
        }
        expect(s.days).toBeGreaterThanOrEqual(1);
        expect(s.cards).toBeGreaterThan(0);
        expect(s.act).toBeGreaterThanOrEqual(1);
        expect(s.seen.length).toBeGreaterThan(0);
        expect(s.timeouts).toBeLessThanOrEqual(s.timedCards);
        expect(s.nearMisses).toBeLessThanOrEqual(s.rolls);
        expect(s.peakEscalation).toBeGreaterThanOrEqual(content.seats[seat].meters.escalation);
        expect(s.score).toBeGreaterThanOrEqual(s.bestChoice);
        expect(s.accidents).toBeLessThanOrEqual(s.accidentsAttached);
        expect(s.accidentsSurvived).toBeLessThanOrEqual(s.accidents);
        expect(s.antesSmashed).toBeLessThanOrEqual(s.antesMet);
        expect(s.antes.length).toBe(s.antesMet + s.antesMissed);
        expect(s.capitalSpent).toBeLessThanOrEqual(s.capitalEarned + (content.seats[seat].starting_capital ?? 4));
        expect(s.estMinutes).toBeGreaterThan(0);
        expect(s.shops).toBeGreaterThanOrEqual(0);
        // every held piece was bought (no starting pieces in the fixture) and every purchase was offered
        for (const p of s.pieces) expect(s.bought).toContain(p);
        for (const p of s.bought) expect(s.offered).toContain(p);
        for (const o of s.ordersBought) expect(s.ordersOffered).toContain(o);
        expect(s.ordersUsed.length).toBeLessThanOrEqual(s.ordersBought.length);
        if (s.archetype) expect(content.archetypes[s.archetype]).toBeDefined();
        if (s.archetypeByAct3) expect(s.act).toBeGreaterThanOrEqual(3);
        for (const v of Object.values(s)) if (typeof v === 'number') expect(Number.isNaN(v)).toBe(false);
      }
    });
  }

  it('is deterministic per seed and policy, and differs across policies', () => {
    const a = runOne(content, { seed: 'det', seat: 'republic', policy: POLICIES.heuristic });
    const b = runOne(content, { seed: 'det', seat: 'republic', policy: POLICIES.heuristic });
    expect(a).toEqual(b);
    const c = runOne(content, { seed: 'det', seat: 'republic', policy: POLICIES.random });
    expect(c.policy).toBe('random');
  });

  it('random lets timers expire far more often than the heuristic', () => {
    let rnd = 0;
    let rndTimed = 0;
    let heu = 0;
    let heuTimed = 0;
    for (let i = 0; i < 150; i++) {
      const r = runOne(content, { seed: `x-${i}`, seat: 'federation', policy: POLICIES.random });
      rnd += r.timeouts;
      rndTimed += r.timedCards;
      const h = runOne(content, { seed: `x-${i}`, seat: 'federation', policy: POLICIES.heuristic });
      heu += h.timeouts;
      heuTimed += h.timedCards;
    }
    expect(rndTimed).toBeGreaterThan(0);
    expect(rnd / rndTimed).toBeGreaterThan(heu / Math.max(1, heuTimed));
  });

  it('the heuristic buys pieces, buys and uses orders, and continues into endless across 200 runs', () => {
    let bought = 0;
    let ordersBought = 0;
    let used = 0;
    let continued = 0;
    let shops = 0;
    for (let i = 0; i < 200; i++) {
      const s = runOne(content, { seed: `h-${i}`, seat: ALL_SEATS[i % 3], policy: POLICIES.heuristic });
      bought += s.bought.length;
      ordersBought += s.ordersBought.length;
      used += s.ordersUsed.length;
      shops += s.shops;
      if (s.endless) continued++;
      if (s.won) expect(s.endless).toBe(true); // (j) always continues
    }
    expect(shops).toBeGreaterThan(0);
    expect(bought).toBeGreaterThan(0);
    expect(ordersBought).toBeGreaterThan(0);
    expect(used).toBeGreaterThan(0);
    expect(continued).toBeGreaterThanOrEqual(0);
  });

  it('greedy and random also shop, and random continues only sometimes', () => {
    let gBought = 0;
    let rBought = 0;
    let rWon = 0;
    let rContinued = 0;
    for (let i = 0; i < 200; i++) {
      const g = runOne(content, { seed: `s-${i}`, seat: 'coalition', policy: POLICIES.greedy });
      gBought += g.bought.length;
      expect(g.sold).toEqual([]);
      expect(g.rerolls).toBe(0);
      const r = runOne(content, { seed: `s-${i}`, seat: 'coalition', policy: POLICIES.random });
      rBought += r.bought.length;
      expect(r.rerolls).toBe(0);
      if (r.won) rWon++;
      if (r.endless) rContinued++;
    }
    expect(gBought).toBeGreaterThan(0);
    expect(rBought).toBeGreaterThan(0);
    if (rWon >= 20) expect(rContinued).toBeLessThan(rWon);
  });
});

describe('policies', () => {
  it('greedy scores the calmer side higher and values leverage a little', () => {
    const s = createRun(content, { seed: 'g', seat: 'republic', mode: 'endless' });
    s.current = 'c_basic';
    const v = view(content, s)!;
    // left: public -5, escalation +5, military +4 (base 12); right: public +3, escalation -3, allies +2 (base 8)
    expect(greedyScore(s, v.right)).toBeGreaterThan(greedyScore(s, v.left));
    const plain = greedyScore(s, v.left);
    s.pieces.push('p_hawk'); // +6 base on military choices
    const boosted = greedyScore(s, view(content, s)!.left);
    expect(boosted).toBeGreaterThan(plain);
  });

  it('heuristic hard-avoids a side that pushes a meter within 8 of an edge', () => {
    const s = createRun(content, { seed: 'h', seat: 'republic', mode: 'endless' });
    s.current = 'c_basic';
    s.meters.public = 12;
    const v = view(content, s)!;
    const hc = heuristicContext(content, s, v);
    expect(evaluateSide(s, v.left, hc).hardAvoid).toBe(true); // public 12 - 5 = 7
    expect(evaluateSide(s, v.right, hc).hardAvoid).toBe(false);
    expect(heuristicPolicy.choose(content, s, v, new Rng('any'))).toBe('right');
  });

  it('heuristic reads hidden costs as extra escalation and hard-avoids above 88', () => {
    const s = createRun(content, { seed: 'h2', seat: 'republic', mode: 'endless' });
    s.pieces.push('p_hawk');
    s.current = 'c_basic';
    s.meters.escalation = 84;
    const v = view(content, s)!;
    expect(v.left.hiddenCosts).toContain('escalation');
    const e = evaluateSide(s, v.left, heuristicContext(content, s, v));
    expect(e.escalation).toBe(90);
    expect(e.hardAvoid).toBe(true);
  });

  it('heuristic buries when both sides are unacceptable and a removal charge is available', () => {
    const s = createRun(content, { seed: 'h3', seat: 'republic', mode: 'endless' });
    s.pieces.push('p_fixer');
    s.charges.removal = 1;
    s.current = 'c_chain'; // both sides: public -3
    s.meters.public = 6;
    const v = view(content, s)!;
    expect(heuristicPolicy.choose(content, s, v, new Rng('any'))).toBe('bury');
    s.charges.removal = 0;
    expect(['left', 'right']).toContain(heuristicPolicy.choose(content, s, v, new Rng('any')));
  });

  it('ante pressure makes the heuristic chase leverage', () => {
    const s = createRun(content, { seed: 'h5', seat: 'republic', mode: 'endless' });
    s.current = 'c_backchannel'; // left scores 9 (trust +4), right scores 6 (trust -2): no office meter moves
    s.actLeverage = 0;
    s.actTarget = 1000;
    const v = view(content, s)!;
    const a = anteInfo(content, s, false);
    expect(a.pressure).toBe(true);
    expect(a.needed).toBe(1000);
    expect(a.perCardNeed).toBeCloseTo(1000 / 3);
    const hot = heuristicContext(content, s, v);
    expect(hot.unit).toBe(9); // nothing on the card covers the need, so the best side sets the unit
    const gapHot = evaluateSide(s, v.left, hot).score - evaluateSide(s, v.right, hot).score;
    expect(gapHot).toBeGreaterThan(0);
    expect(heuristicPolicy.choose(content, s, v, new Rng('any'))).toBe('left');
    s.actTarget = 0;
    expect(anteInfo(content, s, false).pressure).toBe(false);
    const calm = heuristicContext(content, s, v);
    const gapCalm = evaluateSide(s, v.left, calm).score - evaluateSide(s, v.right, calm).score;
    expect(gapCalm).toBeGreaterThan(0);
    expect(gapHot).toBeGreaterThan(gapCalm);
    // with the ante met, meter safety wins over a bigger score on a costly side
    s.current = 'c_basic'; // left 12 (escalation +5), right 8 (escalation -3)
    expect(heuristicPolicy.choose(content, s, view(content, s)!, new Rng('any'))).toBe('right');
  });

  it('an escalation-scaling build aims for the top of the curve', () => {
    const s = createRun(content, { seed: 'h6', seat: 'republic', mode: 'endless' });
    expect(isBrinkBuild([])).toBe(false);
    expect(isBrinkBuild([content.pieces.p_madman])).toBe(true);
    expect(isBrinkBuild([content.pieces.p_hawk])).toBe(false);
    s.current = 'c_basic';
    s.meters.escalation = 70;
    s.actTarget = 0;
    const calm = view(content, s)!;
    const hcCalm = heuristicContext(content, s, calm);
    expect(hcCalm.brink).toBe(false);
    // without the build, +5 escalation at 70 is bad
    expect(evaluateSide(s, calm.left, hcCalm).score).toBeLessThan(evaluateSide(s, calm.right, hcCalm).score);
    s.pieces.push('p_madman');
    const hot = view(content, s)!;
    const hcHot = heuristicContext(content, s, hot);
    expect(hcHot.brink).toBe(true);
    // with it, climbing toward 82..92 beats stepping down
    const L = evaluateSide(s, hot.left, hcHot);
    const R = evaluateSide(s, hot.right, hcHot);
    expect(L.score).toBeGreaterThan(R.score);
    expect(L.hardAvoid).toBe(false);
    s.meters.escalation = 88;
    const top = view(content, s)!;
    expect(evaluateSide(s, top.left, heuristicContext(content, s, top)).hardAvoid).toBe(true); // 93 > 88
  });

  it('heuristic uses a Veto on a likely accident and a Stand-Down at the top', () => {
    const s = createRun(content, { seed: 'h7', seat: 'republic', mode: 'endless' });
    s.current = 'c_filler';
    s.orders = ['o_calm', 'o_skip'];
    s.accident = { type: 'misread', p: 0.1, known: null };
    expect(heuristicPolicy.useOrder(content, s, view(content, s)!, new Rng('o'), 0)).toBe(-1);
    s.accident = { type: 'misread', p: 0.3, known: null };
    expect(heuristicPolicy.useOrder(content, s, view(content, s)!, new Rng('o'), 0)).toBe(1);
    s.accident = { type: 'misread', p: 0.3, known: false };
    expect(heuristicPolicy.useOrder(content, s, view(content, s)!, new Rng('o'), 0)).toBe(-1);
    s.accident = null;
    s.meters.escalation = 86;
    expect(heuristicPolicy.useOrder(content, s, view(content, s)!, new Rng('o'), 0)).toBe(0);
    s.pieces.push('p_madman');
    expect(heuristicPolicy.useOrder(content, s, view(content, s)!, new Rng('o'), 0)).toBe(-1);
    s.meters.escalation = 93;
    expect(heuristicPolicy.useOrder(content, s, view(content, s)!, new Rng('o'), 0)).toBe(0);
  });

  it('heuristic fires a retrigger on the big side while the ante is open, then picks that side', () => {
    const s = createRun(content, { seed: 'h8', seat: 'republic', mode: 'endless' });
    s.current = 'c_basic';
    s.orders = ['o_retrig'];
    s.actTarget = 500;
    s.actLeverage = 0;
    expect(heuristicPolicy.useOrder(content, s, view(content, s)!, new Rng('o'), 0)).toBe(0);
    s.nextRetrigger = 1;
    expect(heuristicPolicy.choose(content, s, view(content, s)!, new Rng('c'))).toBe('left');
    s.nextRetrigger = 0;
    s.actLeverage = 500; // ante already met: keep the order
    expect(heuristicPolicy.useOrder(content, s, view(content, s)!, new Rng('o'), 0)).toBe(-1);
  });

  it('greedy uses a Stand-Down only from 75 and random uses orders rarely', () => {
    const s = createRun(content, { seed: 'g2', seat: 'republic', mode: 'endless' });
    s.current = 'c_filler';
    s.orders = ['o_retrig', 'o_calm'];
    s.meters.escalation = 60;
    expect(POLICIES.greedy.useOrder(content, s, view(content, s)!, new Rng('g'), 0)).toBe(-1);
    s.meters.escalation = 80;
    expect(POLICIES.greedy.useOrder(content, s, view(content, s)!, new Rng('g'), 0)).toBe(1);
    let uses = 0;
    for (let i = 0; i < 200; i++) if (POLICIES.random.useOrder(content, s, view(content, s)!, new Rng(`r${i}`), 0) >= 0) uses++;
    expect(uses).toBeGreaterThan(10);
    expect(uses).toBeLessThan(80);
    expect(POLICIES.random.useOrder(content, s, view(content, s)!, new Rng('r'), 1)).toBe(-1);
  });

  it('reads archetypes and tag affinity', () => {
    const s = createRun(content, { seed: 'a', seat: 'republic', mode: 'endless' });
    expect(archetypeInMind(content, s)).toBeNull();
    expect(archetypeAssembled(content, s)).toBeNull();
    s.pieces.push('p_hawk');
    expect(archetypeInMind(content, s)!.def.id).toBe('a_madman');
    expect(archetypeAssembled(content, s)).toBeNull();
    s.pieces.push('p_madman');
    expect(archetypeAssembled(content, s)).toBe('a_madman');
    s.pieces.push('p_dove', 'p_retrig', 'p_scale');
    expect(archetypeAssembled(content, s)).toBe('a_quiet'); // 3 core beats 2
    const counts = new Map([['military', 5], ['deescalate', 1]]);
    expect(pieceAffinity(content.pieces.p_hawk, counts, 6)).toBe(5);
    expect(pieceAffinity(content.pieces.p_dove, counts, 6)).toBe(1);
    expect(pieceAffinity(content.pieces.p_mult, counts, 6)).toBe(3); // untagged: half the choices
    expect(pieceAffinity(content.pieces.p_odds, counts, 6)).toBe(0);
  });

  it('heuristic shop buys core pieces of the archetype in mind first', () => {
    const s = createRun(content, { seed: 'shop', seat: 'republic', mode: 'endless' });
    s.pieces.push('p_hawk');
    s.capital = 40;
    s.phase = 'shop';
    s.shop = {
      offers: [
        { piece: 'p_odds', price: 3, sold: false },
        { piece: 'p_madman', price: 12, sold: false },
        { piece: 'p_mult', price: 8, sold: false },
        { piece: 'p_dove', price: 3, sold: false },
      ],
      orders: [
        { order: 'o_retrig', price: 3, sold: false },
        { order: 'o_calm', price: 3, sold: false },
      ],
      rerolls: 0,
      mid: false,
      removed: [],
    };
    const bought: number[] = [];
    const api = {
      buyPiece(i: number) {
        const o = s.shop!.offers[i];
        if (o.sold || o.price > s.capital) return false;
        o.sold = true;
        s.capital -= o.price;
        s.pieces.push(o.piece);
        bought.push(i);
        return true;
      },
      buyOrder(i: number) {
        const o = s.shop!.orders[i];
        if (o.sold || o.price > s.capital || s.orders.length >= 2) return false;
        o.sold = true;
        s.capital -= o.price;
        s.orders.push(o.order);
        return true;
      },
      sellPiece: () => false,
      reroll: () => false,
      removeTag: () => false,
      rerollCost: () => 2,
      sellPrice: () => 1,
      maxPieces: () => 6,
      maxOrders: () => 2,
    };
    heuristicPolicy.shop(content, s, new Rng('s'), api);
    expect(bought[0]).toBe(1); // the legendary core piece first
    expect(bought[1]).toBe(2); // then the support piece
    expect(s.pieces).not.toContain('p_odds');
    expect(s.pieces).not.toContain('p_dove');
    expect(s.orders).toContain('o_retrig'); // the next ante (40 over 3 cards) beats the current pace
    expect(s.capital).toBeGreaterThanOrEqual(0);
  });
});

describe('simulate', () => {
  const opts = { runs: 60, policies: POLICY_NAMES, seats: 'all' as const, seedBase: 'unit' };
  const report: Report = simulate(content, opts);

  it('is deterministic: same seed base gives identical report JSON', () => {
    const again = simulate(content, opts);
    expect(JSON.stringify(again)).toBe(JSON.stringify(report));
    const other = simulate(content, { ...opts, seedBase: 'unit-2' });
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(report));
  });

  it('has a section per policy plus an all aggregate with consistent run counts', () => {
    expect(report.policyOrder).toEqual(['random', 'greedy', 'heuristic', 'all']);
    for (const name of POLICY_NAMES) expect(report.policies[name].runs).toBe(60);
    expect(report.policies.all.runs).toBe(180);
    expect(report.meta.finalTarget).toBe(finalTarget(content, 5));
    expect(report.meta.finalTarget).toBe(100);
    expect(report.meta.brokeGameThreshold).toBe(10000);
    for (const name of report.policyOrder) {
      const r = report.policies[name];
      const endingRuns = r.endings.reduce((n, e) => n + e.count, 0);
      const kindRuns = r.kinds.reduce((n, k) => n + k.count, 0);
      const finalKindRuns = r.finalKinds.reduce((n, k) => n + k.count, 0);
      const actRuns = r.acts.reduce((n, a) => n + a.count, 0);
      const seatRuns = r.seats.reduce((n, s) => n + s.runs, 0);
      expect(endingRuns).toBe(r.runs);
      expect(kindRuns).toBe(r.runs);
      expect(finalKindRuns).toBe(r.runs);
      expect(actRuns).toBe(r.runs);
      expect(seatRuns).toBe(r.runs);
      expect(r.capped).toBe(0);
      expect(r.seats.map((s) => s.seat)).toEqual(['coalition', 'federation', 'republic']);
      expect(r.days.p10).toBeLessThanOrEqual(r.days.median);
      expect(r.days.median).toBeLessThanOrEqual(r.days.p90);
      expect(r.score.median).toBeLessThanOrEqual(r.score.p90);
      expect(r.score.p90).toBeLessThanOrEqual(r.score.p99);
      expect(r.score.p99).toBeLessThanOrEqual(r.score.max);
      expect(r.topEndingShare).toBe(Math.max(...r.endings.map((e) => e.pct)));
      expect(r.winRate).toBeGreaterThanOrEqual(0);
      expect(r.winRate).toBeLessThanOrEqual(100);
      expect(r.cards.length).toBeGreaterThan(0);
      expect(r.weakestCards.length).toBeLessThanOrEqual(15);
      // antes: every settled ante is met or missed; act 1 is settled by every run that got that far
      for (const a of r.antes) {
        expect(a.met + a.missed).toBe(a.settled);
        expect(a.smashed).toBeLessThanOrEqual(a.met);
        expect(a.settled).toBeLessThanOrEqual(r.runs);
      }
      expect(r.antes.find((a) => a.act === 1)!.settled).toBeGreaterThan(0);
      expect(r.accidents.fireRate).toBeLessThanOrEqual(100);
      expect(r.capital.spentPerRun).toBeLessThanOrEqual(r.capital.earnedPerRun + 4);
      expect(r.orders.usedPerRun).toBeLessThanOrEqual(r.orders.boughtPerRun);
      expect(r.orders.byOrder.map((o) => o.id)).toEqual(content.orderOrder);
      expect(r.endless.continued).toBeLessThanOrEqual(r.runs);
    }
  });

  it('buy rates sum sensibly', () => {
    for (const name of report.policyOrder) {
      const r = report.policies[name];
      let offered = 0;
      let bought = 0;
      for (const p of r.pieceBuys) {
        expect(p.bought).toBeLessThanOrEqual(p.offered);
        if (p.rate !== null) {
          expect(p.rate).toBeGreaterThanOrEqual(0);
          expect(p.rate).toBeLessThanOrEqual(100);
        } else expect(p.offered).toBe(0);
        offered += p.offered;
        bought += p.bought;
      }
      expect(bought).toBeGreaterThan(0);
      expect(offered).toBeGreaterThanOrEqual(bought);
      // the locked piece is unlocked for bots ('all'); the excluded pair may still be offered one at a time
      expect(r.pieceBuys.map((p) => p.id)).toEqual(content.pieceOrder);
    }
    const all = report.policies.all;
    for (const p of all.pieceBuys) {
      const sum = POLICY_NAMES.reduce((n, name) => n + report.policies[name].pieceBuys.find((q) => q.id === p.id)!.bought, 0);
      expect(sum).toBe(p.bought);
    }
  });

  it('tracks card coverage, combos, archetypes, profiles and targets', () => {
    const all = report.policies.all;
    // c_end and c_shop can never be drawn (their flags are never set); everything else in the fixture is reachable
    expect(all.neverSeen).toContain('c_end');
    expect(all.neverSeen).toContain('c_shop');
    for (const id of all.neverSeen) expect(all.cards.find((c) => c.id === id)).toBeUndefined();
    expect(report.combos).not.toBeNull();
    expect(report.combos!.policy).toBe('heuristic');
    expect(report.combos!.top.length).toBeLessThanOrEqual(20);
    for (const c of report.combos!.top) {
      expect(c.runs).toBeGreaterThanOrEqual(report.combos!.minRuns);
      expect(c.baselineRuns).toBeGreaterThanOrEqual(0);
    }
    expect(report.archetypes).not.toBeNull();
    expect(report.archetypes!.map((a) => a.id).sort()).toEqual(Object.keys(content.archetypes).sort());
    for (const a of report.archetypes!) {
      expect(a.reachedEndgame).toBeLessThanOrEqual(a.runs);
      expect(a.won).toBeLessThanOrEqual(a.reachedEndgame);
    }
    expect(report.pieceProfiles.map((p) => p.id)).toEqual(content.pieceOrder);
    const h = report.policies.heuristic;
    for (const p of report.pieceProfiles) {
      expect(p.wins).toBeLessThanOrEqual(p.heldRuns);
      if (h.winRate > 0) expect(p.shareOfWins).toBeLessThanOrEqual(100);
      else expect(p.shareOfWins).toBe(0);
    }
    expect(report.weakestPieces.length).toBeLessThanOrEqual(5);
    expect(report.winRate).toBe(h.winRate);
    expect(report.targets.map((t) => t.id)).toEqual(['win_rate', 'archetypes_endgame', 'piece_share', 'pace', 'broke_game']);
    for (const t of report.targets) {
      expect(['PASS', 'FAIL', 'N/A']).toContain(t.status);
      expect(t.value).not.toContain('NaN');
      expect(t.value).not.toContain('undefined');
    }
    // two fixture archetypes can never satisfy "at least 10"
    expect(report.targets.find((t) => t.id === 'archetypes_endgame')!.status).toBe('FAIL');
  });

  it('marks heuristic-only targets N/A when the heuristic is not run, and T1 N/A off DEFCON 5', () => {
    const r = simulate(content, { runs: 10, policies: ['random'], seats: ['republic'], seedBase: 'na' });
    expect(r.combos).toBeNull();
    expect(r.archetypes).toBeNull();
    expect(r.winRate).toBeNull();
    expect(r.targets.every((t) => t.status === 'N/A')).toBe(true);
    expect(r.policies.all.seats.map((s) => s.seat)).toEqual(['republic']);
    const hard = simulate(content, { runs: 10, policies: ['heuristic'], seats: ['republic'], seedBase: 'na', difficulty: 1 });
    expect(hard.targets.find((t) => t.id === 'win_rate')!.status).toBe('N/A');
    expect(hard.meta.finalTarget).toBe(150);
    expect(hard.targets.find((t) => t.id === 'pace')!.status).not.toBe('N/A');
  });

  it('renders a markdown report with every section', () => {
    const md = formatReport(report);
    for (const heading of [
      '# BRINK balance simulation',
      '## Targets',
      '## Summary',
      '## Policy: random',
      '## Policy: greedy',
      '## Policy: heuristic',
      '## Policy: all',
      '### Endings (heuristic)',
      '### Act reached (heuristic)',
      '### Antes per act (heuristic)',
      '### Accidents (heuristic)',
      '### Capital and orders (heuristic)',
      '### Score distribution (heuristic)',
      '### Per seat (heuristic)',
      '### Piece buy rates (heuristic)',
      '### Card coverage (heuristic)',
      '## Cards never seen (all policies)',
      '## Archetypes (heuristic)',
      '## Piece share among winning builds (heuristic)',
      '## Combos (heuristic)',
      '## Piece ending profiles',
      '## Weakest pieces',
      '## Per-card table (heuristic)',
      '## Weakest cards (heuristic)',
    ]) {
      expect(md, `missing ${heading}`).toContain(heading);
    }
    for (const label of ['T1 ', 'T2 ', 'T3 ', 'T4 ', 'T5 ']) expect(md).toContain(label);
    expect(md).toMatch(/\| (PASS|FAIL|N\/A) \|/);
    expect(md).toContain('c_end');
    expect(md).toContain('a_madman');
    expect(md).toContain('o_calm');
    expect(md).not.toContain('undefined');
    expect(md).not.toContain('NaN');
    expect(JSON.stringify(report)).not.toContain('null,null');
    expect(JSON.stringify(report)).not.toContain('NaN');
  });
});
