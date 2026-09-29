import { describe, expect, it } from 'vitest';
import { fixture } from './fixture';
import { ACT_STIPEND } from './leverage';
import { Rng } from './rng';
import {
  buryCard,
  buyOrder,
  buyPiece,
  choose,
  continueRun,
  createRun,
  deserialise,
  leaveShop,
  removeTag,
  rerollShop,
  sellPiece,
  serialise,
  template,
  useOrder,
  view,
} from './run';
import { ENDLESS_CLIMB, escalationMultiplier } from './leverage';
import type { Content, RunState } from './types';

const content: Content = fixture();

function run(seed = 'test', extra: Partial<Parameters<typeof createRun>[1]> = {}): RunState {
  return createRun(content, { seed, seat: 'republic', mode: 'endless', ...extra });
}

/** Play until a predicate holds or the run ends, always choosing `side`; leaves shops without buying. */
function playUntil(state: RunState, pred: (s: RunState) => boolean, side: 'left' | 'right' = 'right', max = 500): RunState {
  for (let i = 0; i < max && !pred(state) && state.phase !== 'ended'; i++) {
    if (state.phase === 'shop') leaveShop(content, state);
    else choose(content, state, side);
  }
  return state;
}

describe('createRun', () => {
  it('is deterministic for a seed and different across seeds', () => {
    const a = run('alpha');
    const b = run('alpha');
    expect(a.current).toBe(b.current);
    expect(a.rng).toEqual(b.rng);
    const c = run('beta');
    expect(a.rng).not.toEqual(c.rng);
  });
  it('starts with seat meters, act 1, day 1, capital and the first ante', () => {
    const s = run();
    expect(s.act).toBe(1);
    expect(s.day).toBe(1);
    expect(s.meters.escalation).toBe(20);
    expect(s.capital).toBe(4);
    expect(s.actTarget).toBe(20);
    expect(s.current).not.toBeNull();
    expect(view(content, s)?.actName).toBe('Week One');
  });
  it('applies difficulty start escalation and target scale', () => {
    const s = run('x', { difficulty: 1 });
    expect(s.meters.escalation).toBe(40);
    expect(s.actTarget).toBe(30);
  });
});

describe('leverage', () => {
  it('scores base × mult × escalation multiplier and accumulates the ante', () => {
    const s = run();
    s.current = 'c_basic';
    const v = view(content, s)!;
    expect(v.left.leverage.base).toBe(12);
    expect(v.left.leverage.mult).toBe(1);
    expect(v.left.leverage.escMult).toBe(1);
    expect(v.left.leverage.total).toBe(12);
    const { events } = choose(content, s, 'left');
    expect(s.actLeverage).toBe(12);
    expect(s.score).toBe(12);
    expect(events.some((e) => e.type === 'leverage')).toBe(true);
    expect(s.history[0].leverage).toBe(12);
  });
  it('resolves base adds, then mult adds, then mult multipliers, then retriggers', () => {
    const s = run();
    s.pieces.push('p_hawk', 'p_dove', 'p_mult', 'p_retrig');
    s.current = 'c_backchannel';
    const lv = view(content, s)!.left.leverage;
    // back_channel: base 9 (no hawk add), mult (1 + 0 dove? dove needs deescalate) → 1 × 2 = 2, retrigger ×2
    expect(lv.base).toBe(9);
    expect(lv.mult).toBe(2);
    expect(lv.retriggers).toBe(1);
    expect(lv.total).toBe(36);
    s.current = 'c_basic';
    const lv2 = view(content, s)!;
    expect(lv2.left.leverage.base).toBe(18); // 12 + hawk 6
    expect(lv2.right.leverage.mult).toBe(3); // (1 + 0.5) × 2
  });
  it('follows the escalation curve', () => {
    expect(escalationMultiplier(0)).toBe(1);
    expect(escalationMultiplier(29)).toBe(1);
    expect(escalationMultiplier(50)).toBe(2);
    expect(escalationMultiplier(80)).toBe(5);
    expect(escalationMultiplier(95)).toBe(12);
    expect(escalationMultiplier(99)).toBe(20);
    expect(escalationMultiplier(65)).toBeCloseTo(3.5);
    expect(escalationMultiplier(80, 2)).toBe(Math.round(5 * ENDLESS_CLIMB * ENDLESS_CLIMB * 100) / 100);
    const s = run();
    s.meters.escalation = 95;
    s.current = 'c_basic';
    expect(view(content, s)!.left.leverage.total).toBe(144);
  });
  it('applies conditional and per-step legendary multipliers', () => {
    const s = run();
    s.pieces.push('p_madman');
    s.meters.escalation = 92;
    s.current = 'c_basic';
    const lv = view(content, s)!.left.leverage;
    // per: (92-50)/10 = 4 steps × 0.5 = +2 → multAdd 3; ×3 while ≥ 90 → 9
    expect(lv.multAdd).toBe(3);
    expect(lv.multMult).toBe(3);
    expect(lv.mult).toBe(9);
  });
  it('grows scaling pieces on triggers', () => {
    const s = run();
    s.pieces.push('p_scale');
    s.current = 'c_backchannel';
    choose(content, s, 'left');
    expect(s.pieceState.p_scale.base).toBe(2);
    s.current = 'c_backchannel';
    expect(view(content, s)!.left.leverage.base).toBe(11);
  });
});

describe('choose', () => {
  it('applies effects, records history and advances the day', () => {
    const s = run();
    s.current = 'c_basic';
    const before = { ...s.meters };
    choose(content, s, 'left');
    expect(s.meters.public).toBe(before.public - 5);
    expect(s.meters.escalation).toBe(before.escalation + 5);
    expect(s.history[0].card).toBe('c_basic');
    expect(s.history[0].applied.public).toBe(-5);
    expect(s.day).toBe(1.5);
    expect(s.trail).toHaveLength(1);
  });
  it('clamps meters to 0..100 and ends the run at 0 with the best matching ending', () => {
    const s = run();
    s.meters.public = 3;
    s.current = 'c_basic';
    const { events } = choose(content, s, 'left');
    expect(s.meters.public).toBe(0);
    expect(s.phase).toBe('ended');
    expect(s.ending).toBe('impeached');
    expect(events.some((e) => e.type === 'ending')).toBe(true);
    expect(s.moment).toBe('c_basic');
    expect(s.canContinue).toBe(false);
  });
  it('prefers higher-priority endings whose conditions hold', () => {
    const s = run();
    s.pieces.push('p_hawk');
    s.meters.public = 2;
    s.current = 'c_basic';
    choose(content, s, 'left');
    expect(s.ending).toBe('impeached_hawk');
  });
  it('ends in nuclear war at escalation 100', () => {
    const s = run();
    s.meters.escalation = 98;
    s.current = 'c_basic';
    choose(content, s, 'left');
    expect(s.ending).toBe('nuclear_war');
  });
  it('the Deadman Switch converts the first nuclear ending into escalation 70', () => {
    const s = run();
    s.pieces.push('p_deadman');
    s.meters.escalation = 98;
    s.current = 'c_basic';
    const { events } = choose(content, s, 'left');
    expect(s.phase).toBe('card');
    expect(s.meters.escalation).toBe(70);
    expect(s.deadmanUsed).toBe(true);
    expect(events.some((e) => e.type === 'deadman')).toBe(true);
    s.meters.escalation = 98;
    s.current = 'c_basic';
    choose(content, s, 'left');
    expect(s.ending).toBe('nuclear_war');
  });
  it('resolves odds rolls deterministically with near-miss margins and capital rewards', () => {
    const s = run('odds');
    s.current = 'c_odds';
    const { events } = choose(content, s, 'left');
    const roll = events.find((e) => e.type === 'roll');
    expect(roll).toBeDefined();
    if (roll && roll.type === 'roll') {
      expect(roll.result.p).toBeCloseTo(0.5);
      expect(roll.result.margin).toBeCloseTo(Math.abs(0.5 - roll.result.roll) * 100);
      if (roll.result.success) {
        expect(s.flags).toContain('won');
        expect(s.capital).toBe(5);
      } else expect(s.current).toBe('c_chain');
    }
    expect(s.stats.rolls).toBe(1);
  });
  it('shows odds after piece modifiers in the view', () => {
    const s = run('odds');
    s.pieces.push('p_odds');
    s.current = 'c_odds';
    expect(view(content, s)!.left.odds!.p).toBeCloseTo(0.7);
  });
  it('queues true or false warning follow-ups and tracks stats', () => {
    let trues = 0;
    let falses = 0;
    for (let i = 0; i < 40; i++) {
      const s = run(`w${i}`);
      s.current = 'c_warning';
      s.truth = new Rng(`t${i}`).next() < 0.7;
      choose(content, s, 'right');
      expect(['c_true', 'c_false']).toContain(s.current);
      if (s.current === 'c_true') trues++;
      else falses++;
    }
    expect(trues + falses).toBe(40);
    expect(falses).toBeGreaterThan(0);
  });
  it('makes walking back cost more the more committed you are (commitment trap)', () => {
    const low = run();
    low.hidden.commitment = 0;
    low.current = 'c_walkback';
    const high = run();
    high.hidden.commitment = 100;
    high.current = 'c_walkback';
    expect(view(content, low)!.left.preview.public).toBe(-10);
    expect(view(content, high)!.left.preview.public).toBe(-20);
    high.pieces.push('p_spin'); // lock +1 → ×(1 + 2) = -30, then ×0.5 damping = -15
    expect(view(content, high)!.left.preview.public).toBe(-15);
    low.pieces.push('p_spin');
    expect(view(content, low)!.left.preview.public).toBe(-5);
  });
  it('spends a free de-escalation charge to remove public/military costs', () => {
    const s = run();
    s.pieces.push('p_hotline');
    s.charges.deescalation = 1;
    s.current = 'c_charge';
    const v = view(content, s)!;
    expect(v.left.usesCharge).toBe(true);
    expect(v.left.preview.public).toBeUndefined();
    const pub = s.meters.public;
    const { events } = choose(content, s, 'left');
    expect(s.meters.public).toBe(pub);
    expect(s.charges.deescalation).toBe(0);
    expect(events.some((e) => e.type === 'charge_used')).toBe(true);
  });
  it('hides escalation costs in the preview with the Hawk General', () => {
    const s = run();
    s.pieces.push('p_hawk');
    s.current = 'c_basic';
    const v = view(content, s)!;
    expect(v.left.hiddenCosts).toContain('escalation');
    expect(v.left.preview.escalation).toBeUndefined();
    expect(v.left.preview.military).toBe(6);
  });
  it('records the resolved side on timeouts', () => {
    const s = run();
    s.current = 'c_timer';
    const esc = s.meters.escalation;
    const { events } = choose(content, s, 'timeout');
    expect(s.meters.escalation).toBe(esc + 8);
    expect(s.stats.timeouts).toBe(1);
    expect(events[0].type).toBe('timeout');
    expect(s.history[0].side).toBe('left');
    expect(s.history[0].timedOut).toBe(true);
  });
  it('forces endings from choices', () => {
    const s = run();
    s.current = 'c_end';
    choose(content, s, 'right');
    expect(s.ending).toBe('resigned');
  });
  it('re-queues once:false follow-up targets that were already seen', () => {
    const s = run();
    s.seen.push('c_filler');
    s.current = 'c_basic';
    (content.cards.c_basic.left.follow = [{ card: 'c_filler', in: 0 }]);
    choose(content, s, 'left');
    delete content.cards.c_basic.left.follow;
    expect(s.current).toBe('c_filler');
  });
});

describe('accidents', () => {
  it('never attach below escalation 50 and attach often above 90', () => {
    let low = 0;
    let high = 0;
    for (let i = 0; i < 60; i++) {
      const a = run(`acc${i}`);
      a.meters.escalation = 30;
      playUntil(a, (x) => x.cardsPlayed >= 1);
      if (a.accident) low++;
      const b = run(`acc${i}`);
      b.meters.escalation = 95;
      b.current = 'c_filler';
      choose(content, b, 'right');
      if (b.accident) high++;
    }
    expect(low).toBe(0);
    expect(high).toBeGreaterThan(10);
  });
  it('fires deterministically, applies severity and grows survivors', () => {
    const s = run('fire');
    s.pieces.push('p_scale');
    s.meters.escalation = 60;
    s.current = 'c_filler';
    s.accident = { type: 'misread', p: 0.99, known: null };
    const trust = s.hidden.trust_primary;
    const { events } = choose(content, s, 'right');
    const acc = events.find((e) => e.type === 'accident');
    expect(acc && acc.type === 'accident' && acc.result.fired).toBe(true);
    expect(s.hidden.trust_primary).toBeLessThan(trust);
    expect(s.stats.accidents).toBe(1);
    expect(s.stats.accidentsSurvived).toBe(1);
    expect(s.pieceState.p_scale.mult).toBe(0.5);
    expect(s.flags).not.toContain('false_alarm_live');
  });
  it('a false alarm accident sets the live flag; Perfect Intel resolves in advance', () => {
    const s = run('fa');
    s.meters.escalation = 96;
    s.current = 'c_filler';
    s.accident = { type: 'false_alarm', p: 0.99, known: null };
    choose(content, s, 'right');
    expect(s.flags).toContain('false_alarm_live');
    const k = run('known');
    k.pieces.push('p_intel');
    k.meters.escalation = 96;
    let saw = false;
    for (let i = 0; i < 30 && !saw; i++) {
      k.current = 'c_filler';
      choose(content, k, 'right');
      if (k.phase !== 'card') break;
      if (k.accident) {
        saw = true;
        expect(k.accident.known === true || k.accident.known === false).toBe(true);
      }
    }
    expect(saw).toBe(true);
  });
  it('accidents_twice fires when either roll fires', () => {
    let plain = 0;
    let twice = 0;
    for (let i = 0; i < 80; i++) {
      const a = run(`tw${i}`);
      a.meters.escalation = 90;
      a.current = 'c_filler';
      a.accident = { type: 'misread', p: 0.3, known: null };
      choose(content, a, 'right');
      if (a.history[0].accident?.fired) plain++;
      const b = run(`tw${i}`);
      b.pieces.push('p_madman');
      b.meters.escalation = 90;
      b.current = 'c_filler';
      b.accident = { type: 'misread', p: 0.3, known: null };
      choose(content, b, 'right');
      if (b.history[0].accident?.fired) twice++;
    }
    expect(twice).toBeGreaterThan(plain);
  });
});

describe('antes, flashpoints and the shop', () => {
  it('runs act → ante → flashpoint → shop → next act', () => {
    const s = run('acts');
    playUntil(s, (x) => x.flashpoint !== null, 'left');
    expect(s.flashpoint).toBe('fp_test');
    expect(s.actLeverage).toBeGreaterThanOrEqual(20); // 3 × 12+ meets the ante of 20
    expect(s.stats.antesMet).toBe(1);
    expect(s.capital).toBeGreaterThan(4);
    expect(['fp_1']).toContain(s.current);
    choose(content, s, 'right');
    expect(s.current).toBe('fp_2');
    const r = choose(content, s, 'right');
    expect(r.events.map((e) => e.type)).toContain('flashpoint_end');
    expect(s.phase).toBe('shop');
    expect(s.shop!.mid).toBe(false);
    expect(s.shop!.offers.length).toBeGreaterThanOrEqual(3);
    expect(s.shop!.orders.length).toBe(2);
    const r2 = leaveShop(content, s);
    expect(s.act).toBe(2);
    expect(s.actTarget).toBe(40);
    expect(r2.events.map((e) => e.type)).toContain('act_start');
    expect(s.phase).toBe('card');
  });
  it('calls the bluff when the ante is missed', () => {
    const s = run('bluff');
    s.actTarget = 100000;
    playUntil(s, (x) => x.flashpoint !== null, 'right');
    expect(s.stats.antesMissed).toBe(1);
    expect(s.current).toBe('bluff_generic');
    choose(content, s, 'left');
    expect(s.current).toBe('fp_1');
  });
  it('simple ruleset: no shop, no antes, no accidents; the crisis only at the end; a dawn ending', () => {
    const s = createRun(content, { seed: 'night-1', seat: 'republic', mode: 'daily' });
    expect(s.ruleset).toBe('simple');
    s.meters.escalation = 70; // accidents would attach in Expert from 50
    const types = new Set<string>();
    let flashpointAt = 0;
    for (let i = 0; i < 80 && s.phase !== 'ended'; i++) {
      expect(s.phase).toBe('card');
      expect(s.accident).toBeNull();
      if (s.flashpoint && !flashpointAt) flashpointAt = s.act;
      const r = choose(content, s, i % 2 ? 'left' : 'right');
      for (const e of r.events) types.add(e.type);
      s.meters.escalation = Math.min(s.meters.escalation, 70); // stay alive for the test
      for (const k of ['public', 'military', 'allies', 'economy'] as const) s.meters[k] = Math.max(30, Math.min(70, s.meters[k]));
    }
    expect(s.phase).toBe('ended');
    expect(types.has('shop')).toBe(false);
    expect(types.has('ante')).toBe(false);
    expect(types.has('accident')).toBe(false);
    expect(flashpointAt).toBe(5);
    expect(s.stats.antesMet + s.stats.antesMissed).toBe(0);
    expect(['fallback_standdown', 'fallback_survival', 'standdown_quiet', 'survival_cold']).toContain(s.ending ?? '');
    // Replays identically from JSON at every step is covered elsewhere; here: the same seed gives the same night.
    const t = createRun(content, { seed: 'night-1', seat: 'republic', mode: 'daily' });
    expect(t.current).toBe(createRun(content, { seed: 'night-1', seat: 'republic', mode: 'daily' }).current);
  });
  it('deals a standalone bluff card when the ante is missed and no flashpoint is available', () => {
    const noFp = { ...content, flashpoints: {} } as typeof content;
    const s = createRun(noFp, { seed: 'bluff-nofp', seat: 'republic', mode: 'endless' });
    s.actTarget = 100000;
    for (let i = 0; i < 50 && s.phase === 'card' && s.actCards < 3; i++) choose(noFp, s, 'right');
    expect(s.stats.antesMissed).toBe(1);
    expect(s.flashpoint).toBeNull();
    expect(s.current).toBe('bluff_generic');
    expect(s.phase).toBe('card');
    const r = choose(noFp, s, 'left');
    // The bluff card settles nothing twice: straight to the shop, one ante event in total.
    expect(s.stats.antesMissed).toBe(1);
    expect(s.phase).toBe('shop');
    expect(r.events.filter((e) => e.type === 'ante')).toHaveLength(0);
  });
  it('spends a de-escalation charge granted by an order without the Hotline', () => {
    const s = run('charge-order');
    const id = Object.keys(content.cards).find((c) => content.cards[c].left.spend_charge === 'deescalation')!;
    expect(id).toBeTruthy();
    s.current = id;
    s.charges.deescalation = 1;
    expect(s.pieces).not.toContain('p_hotline');
    const r = choose(content, s, 'left');
    expect(r.events.map((e) => e.type)).toContain('charge_used');
    expect(s.charges.deescalation).toBe(0);
  });
  it('opens a mid-act shop from a shop card and returns to the cards', () => {
    const s = run('midshop');
    s.flags.push('allow_shop');
    s.current = 'c_shop';
    const { events } = choose(content, s, 'left');
    expect(s.phase).toBe('shop');
    expect(s.shop!.mid).toBe(true);
    expect(events.some((e) => e.type === 'shop')).toBe(true);
    leaveShop(content, s);
    expect(s.phase).toBe('card');
    expect(s.act).toBe(1);
  });
  it('uses the false-alarm entry when a false alarm is live', () => {
    const s = run('fa');
    s.actTarget = 1;
    s.flags.push('false_alarm_live');
    playUntil(s, (x) => x.flashpoint !== null);
    expect(s.current).toBe('fp_false');
  });
  it('holds ordinary follow-ups during a flashpoint instead of looping', () => {
    const s = run('hold');
    s.actTarget = 1; // the ante is met, so no bluff card precedes the entry
    playUntil(s, (x) => x.flashpoint !== null);
    expect(s.flashpoint).toBe('fp_test');
    s.queue.push({ card: 'c_filler', in: 0 });
    choose(content, s, 'right');
    expect(s.queue.some((q) => q.card === 'c_filler')).toBe(true);
    expect(['fp_2', 'fp_false']).toContain(s.current);
    choose(content, s, 'right');
    expect(s.phase).toBe('shop');
    leaveShop(content, s);
    expect(s.current).toBe('c_filler');
  });
  it('buys, sells, rerolls, buys orders and removes tags with capital', () => {
    const s = run('shop');
    s.capital = 30;
    playUntil(s, (x) => x.phase === 'shop' && !x.shop!.mid, 'left');
    expect(s.phase).toBe('shop');
    const offer = s.shop!.offers[0];
    const before = s.capital;
    buyPiece(content, s, 0);
    expect(s.pieces).toContain(offer.piece);
    expect(s.capital).toBe(before - offer.price);
    expect(s.shop!.offers[0].sold).toBe(true);
    buyPiece(content, s, 0); // already sold
    expect(s.capital).toBe(before - offer.price);
    const afterBuy = s.capital;
    sellPiece(content, s, offer.piece);
    expect(s.pieces).not.toContain(offer.piece);
    expect(s.capital).toBe(afterBuy + Math.max(1, Math.floor(content.pieces[offer.piece].price * 0.5)));
    const pre = s.capital;
    const firstOffers = s.shop!.offers.map((o) => o.piece).join(',');
    rerollShop(content, s);
    expect(s.capital).toBe(pre - 2);
    expect(s.shop!.rerolls).toBe(1);
    expect(s.shop!.offers.every((o) => !o.sold)).toBe(true);
    rerollShop(content, s);
    expect(s.capital).toBe(pre - 5);
    expect(firstOffers.length).toBeGreaterThan(0);
    const oPre = s.capital;
    buyOrder(content, s, 0);
    expect(s.orders).toHaveLength(1);
    expect(s.capital).toBe(oPre - s.shop!.orders[0].price);
    const tPre = s.capital;
    removeTag(content, s, 'proxy');
    expect(s.removedTags).toContain('proxy');
    expect(s.capital).toBe(tPre - 4);
    removeTag(content, s, 'naval'); // one per visit
    expect(s.removedTags).not.toContain('naval');
    removeTag(content, s, 'bogus');
    expect(s.removedTags).toHaveLength(1);
  });
  it('never offers locked, held or excluded pieces and respects the piece cap', () => {
    for (let i = 0; i < 20; i++) {
      const s = run(`offer${i}`, { unlocked: [] });
      s.pieces.push('p_excl_a');
      playUntil(s, (x) => x.phase === 'shop');
      if (s.phase !== 'shop') continue;
      const ids = s.shop!.offers.map((o) => o.piece);
      expect(ids).not.toContain('p_locked');
      expect(ids).not.toContain('p_excl_a');
      expect(ids).not.toContain('p_excl_b');
    }
    const s = run('cap');
    s.pieces = ['p_hawk', 'p_dove', 'p_spin', 'p_odds', 'p_fixer', 'p_mult'];
    s.capital = 99;
    playUntil(s, (x) => x.phase === 'shop');
    buyPiece(content, s, 0);
    expect(s.pieces).toHaveLength(6);
  });
  it('shop rules: extra offers, discounts and capital per act', () => {
    const s = run('rules');
    s.pieces.push('p_shopper');
    playUntil(s, (x) => x.phase === 'shop' && !x.shop!.mid, 'left');
    expect(s.shop!.offers.length).toBeGreaterThanOrEqual(4);
    for (const o of s.shop!.offers) expect(o.price).toBeLessThanOrEqual(content.pieces[o.piece].price);
    const cap = s.capital;
    leaveShop(content, s);
    expect(s.capital).toBe(cap + 2 + ACT_STIPEND); // piece rule + the act stipend
  });
  it('reaches a run_end ending after the last act and can continue into endless', () => {
    const s = run('end');
    playUntil(s, () => false, 'right');
    expect(s.phase).toBe('ended');
    expect(['standdown_quiet', 'survival_cold', 'fallback_standdown', 'fallback_survival', 'impeached', 'nuclear_war', 'launch']).toContain(s.ending);
    if (s.canContinue) {
      const score = s.score;
      const { events } = continueRun(content, s);
      expect(events.some((e) => e.type === 'shop')).toBe(true);
      expect(s.endless).toBe(true);
      leaveShop(content, s);
      expect(s.act).toBe(6);
      expect(s.actTarget).toBe(280);
      expect(view(content, s)?.actName).toBe('Endless 1');
      playUntil(s, (x) => x.act >= 7, 'right');
      expect(s.score).toBeGreaterThan(score);
    }
  });
});

describe('orders', () => {
  it('apply one-shot effects and are consumed', () => {
    const s = run('orders');
    s.orders = ['o_calm', 'o_retrig', 'o_mult', 'o_skip'];
    s.meters.escalation = 60;
    s.current = 'c_basic';
    useOrder(content, s, 0);
    expect(s.meters.escalation).toBe(40);
    expect(s.orders).toEqual(['o_retrig', 'o_mult', 'o_skip']);
    useOrder(content, s, 0);
    useOrder(content, s, 0);
    expect(s.nextRetrigger).toBe(1);
    expect(s.nextMult).toBe(2);
    const lv = view(content, s)!.left.leverage;
    expect(lv.retriggers).toBe(1);
    expect(lv.multMult).toBe(2);
    // skip_accident with no accident is not consumed
    useOrder(content, s, 0);
    expect(s.orders).toEqual(['o_skip']);
    s.accident = { type: 'misread', p: 0.5, known: null };
    useOrder(content, s, 0);
    expect(s.accident).toBeNull();
    expect(s.orders).toEqual([]);
    choose(content, s, 'left');
    expect(s.nextRetrigger).toBe(0);
    expect(s.nextMult).toBe(1);
  });
  it('bury order skips a card', () => {
    const s = run('bury');
    s.orders = ['o_bury'];
    const before = s.current;
    useOrder(content, s, 0);
    expect(s.current).not.toBe(before);
    expect(s.seen).toContain(before);
    expect(s.orders).toEqual([]);
  });
});

describe('template', () => {
  it('substitutes seat-relative names, with capitalised variants', () => {
    const s = run('t');
    expect(template(content, s, '{Rival} met {us} in {capital}; {rival_leader} and {Other_leader} spoke.')).toBe(
      'The federation met the republic in Capital; the Leader and The Leader spoke.',
    );
    expect(template(content, s, 'keep {unknown} as is')).toBe('keep {unknown} as is');
  });
});

describe('serialisation', () => {
  it('resumes identically from JSON mid-run', () => {
    const a = run('resume');
    for (let i = 0; i < 4; i++) choose(content, a, i % 2 ? 'left' : 'right');
    const b = deserialise(serialise(a));
    for (let i = 0; i < 20; i++) {
      if (a.phase === 'shop') {
        if (a.shop!.offers.length) {
          buyPiece(content, a, 0);
          buyPiece(content, b, 0);
        }
        leaveShop(content, a);
        leaveShop(content, b);
      } else if (a.phase === 'card') {
        choose(content, a, 'left');
        choose(content, b, 'left');
      }
      expect(serialise(b)).toBe(serialise(a));
    }
  });
  it('replays a whole run identically from the seed', () => {
    const play = () => {
      const s = run('replay');
      const sides: ('left' | 'right')[] = ['left', 'right', 'right', 'left'];
      let i = 0;
      while (s.phase !== 'ended' && i < 300) {
        if (s.phase === 'shop') {
          if (i % 3 === 0) buyPiece(content, s, 0);
          leaveShop(content, s);
        } else choose(content, s, sides[i % 4]);
        i++;
      }
      return serialise(s);
    };
    expect(play()).toBe(play());
  });
});

describe('buryCard', () => {
  it('spends a removal charge and draws another card', () => {
    const s = run('bury');
    s.pieces.push('p_fixer');
    s.charges.removal = 1;
    const before = s.current;
    buryCard(content, s);
    expect(s.charges.removal).toBe(0);
    expect(s.seen).toContain(before);
    expect(s.current).not.toBe(before);
    buryCard(content, s);
    expect(s.charges.removal).toBe(0);
  });
});
