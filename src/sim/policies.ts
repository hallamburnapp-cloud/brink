/**
 * Bot policies for the balance simulator (engine v2: leverage, antes, shop,
 * orders, accidents, endless).
 *
 * A policy sees only what a player sees: the CardView (previews after
 * modifiers, odds %, timer, tags, hidden-cost markers, the leverage breakdown
 * of each side and the accident attached to the card) plus the public parts of
 * the run state (meters, act, ante, capital, held pieces, orders, charges).
 * Every policy draws its randomness from an Rng that the simulator seeds from
 * the run seed and the policy name, so a (seed, policy) pair replays identically.
 *
 * A policy makes four kinds of decision:
 *   choose      left / right / let the timer expire / bury (Chief of Staff charge)
 *   useOrder    which held order (if any) to fire before choosing
 *   shop        a whole shop visit through the ShopApi (buy, sell, reroll, remove a tag)
 *   continueRun after a winning ending: play on into endless acts or stop
 */
import type { Rng } from '../engine/rng';
import { actTarget } from '../engine/leverage';
import { actDef, difficultyDef } from '../engine/run';
import type { ArchetypeDef, CardView, ChoiceDef, ChoiceView, Content, EffectKey, Effects, MeterKey, OrderDef, PieceDef, Rarity, RunState } from '../engine/types';

export type Decision = 'left' | 'right' | 'timeout' | 'bury';
export type PolicyName = 'random' | 'greedy' | 'heuristic';

/**
 * The shop as a policy sees it. The simulator implements it over the engine's
 * shop functions and tallies offers, purchases, sales and rerolls as it goes.
 * Every action returns false when the engine refused it (price, slots, sold out).
 */
export interface ShopApi {
  buyPiece(index: number): boolean;
  buyOrder(index: number): boolean;
  sellPiece(pieceId: string): boolean;
  reroll(): boolean;
  removeTag(tag: string): boolean;
  rerollCost(): number;
  sellPrice(pieceId: string): number;
  maxPieces(): number;
  maxOrders(): number;
}

export interface Policy {
  name: PolicyName;
  choose(content: Content, state: RunState, view: CardView, rng: Rng): Decision;
  /**
   * Index into state.orders of an order to use now, or -1. Called again after
   * each consumed order (with `used` incremented) until it returns -1.
   */
  useOrder(content: Content, state: RunState, view: CardView, rng: Rng, used: number): number;
  /** A whole shop visit; the simulator leaves the shop afterwards. */
  shop(content: Content, state: RunState, rng: Rng, api: ShopApi): void;
  /** After a winning ending (state.canContinue): play on into endless acts? */
  continueRun(content: Content, state: RunState, rng: Rng): boolean;
}

/** The four meters that remove you from office at either edge. */
export const OFFICE: readonly MeterKey[] = ['public', 'military', 'allies', 'economy'] as const;

const RARITY_RANK: Readonly<Record<Rarity, number>> = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

/** Distance from a 0..100 value to its nearest edge. */
function edgeDistance(v: number): number {
  return v < 100 - v ? v : 100 - v;
}

/** How far a value sits outside the comfortable 25..75 band (0 inside it). */
function bandOut(v: number): number {
  return v < 25 ? 25 - v : v > 75 ? v - 75 : 0;
}

/** Distance from v to the closed interval [lo, hi] (0 inside it). */
function bandDistance(v: number, lo: number, hi: number): number {
  return v < lo ? lo - v : v > hi ? v - hi : 0;
}

function hasAny(tags: readonly string[], wanted: readonly string[]): boolean {
  for (const t of wanted) if (tags.includes(t)) return true;
  return false;
}

function coin(rng: Rng): 'left' | 'right' {
  return rng.next() < 0.5 ? 'left' : 'right';
}

export function heldPieces(content: Content, state: RunState): PieceDef[] {
  const out: PieceDef[] = [];
  for (const id of state.pieces) {
    const p = content.pieces[id];
    if (p) out.push(p);
  }
  return out;
}

// ------------------------------------------------------------------ order classification

/** Stand-Down style: a one-shot that lowers escalation. */
export function isStandDownOrder(o: OrderDef): boolean {
  return o.effect.type === 'meter' && o.effect.key === 'escalation' && o.effect.delta < 0;
}

export function isSkipAccidentOrder(o: OrderDef): boolean {
  return o.effect.type === 'skip_accident';
}

/** Restores one of the four office meters. */
export function restoredMeter(o: OrderDef): MeterKey | null {
  const e = o.effect;
  if (e.type === 'meter' && e.delta > 0 && (OFFICE as readonly string[]).includes(e.key)) return e.key as MeterKey;
  return null;
}

/** Boosts the leverage of the next choice (or adds leverage outright). */
export function isBoosterOrder(o: OrderDef): boolean {
  const t = o.effect.type;
  return t === 'retrigger_next' || t === 'mult_next' || t === 'leverage';
}

// ------------------------------------------------------------------ build reading

/**
 * An escalation-scaling build (Madman Theory, Brinkmanship, Launch on Warning…):
 * any held piece with a leverage modifier that scales per escalation point or
 * switches on above an escalation threshold.
 */
/** The band a brink build should hold: BRINK_BAND, lifted to start at the highest threshold a held piece is paid from. */
export function brinkBand(held: readonly PieceDef[]): readonly [number, number] {
  let lo = BRINK_BAND[0];
  for (const p of held)
    for (const m of p.modifiers) {
      if (m.kind !== 'leverage') continue;
      const min = m.when?.values?.escalation?.min;
      if (min !== undefined && min > lo) lo = Math.min(min, 92);
    }
  return [lo, Math.max(BRINK_BAND[1], Math.min(96, lo + 4))];
}

export function isBrinkBuild(held: readonly PieceDef[]): boolean {
  for (const p of held)
    for (const m of p.modifiers) {
      if (m.kind !== 'leverage') continue;
      if (m.per === 'escalation') return true;
      const esc = m.when?.values?.escalation;
      if (esc && esc.min !== undefined) return true;
    }
  return false;
}

export function hasFreeDeescalation(held: readonly PieceDef[]): boolean {
  for (const p of held) for (const m of p.modifiers) if (m.kind === 'rule' && m.rule === 'free_deescalation_per_act') return true;
  return false;
}

export interface ArchetypeFit {
  def: ArchetypeDef;
  core: number;
  support: number;
}

/** The archetype with the most core pieces held (ties → most support, then content order); null when no core piece is held. */
export function archetypeInMind(content: Content, state: RunState): ArchetypeFit | null {
  let best: ArchetypeFit | null = null;
  for (const id of Object.keys(content.archetypes)) {
    const def = content.archetypes[id];
    let core = 0;
    let support = 0;
    for (const p of def.core) if (state.pieces.includes(p)) core++;
    for (const p of def.support) if (state.pieces.includes(p)) support++;
    if (core === 0) continue;
    if (!best || core > best.core || (core === best.core && support > best.support)) best = { def, core, support };
  }
  return best;
}

/** The archetype actually being played: at least `min` core pieces held (most core wins, ties → most support). */
export function archetypeAssembled(content: Content, state: RunState, min = 2): string | null {
  const fit = archetypeInMind(content, state);
  return fit && fit.core >= min ? fit.def.id : null;
}

/** How often each choice tag was chosen this run (from the history). */
export function chosenTagCounts(content: Content, state: RunState): { counts: Map<string, number>; choices: number } {
  const counts = new Map<string, number>();
  let choices = 0;
  for (const h of state.history) {
    const card = content.cards[h.card];
    if (!card) continue;
    const side = h.side === 'timeout' ? (card.timeout ?? 'right') : h.side;
    choices++;
    for (const t of card[side].tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return { counts, choices };
}

/** How well a piece's scoring modifiers match the tags the bot has been choosing. */
export function pieceAffinity(piece: PieceDef, counts: Map<string, number>, choices: number): number {
  let s = 0;
  for (const m of piece.modifiers) {
    if (m.kind !== 'leverage' && m.kind !== 'retrigger' && m.kind !== 'scale') continue;
    if (!m.tags || m.tags.length === 0) s += choices * 0.5; // applies to everything: a weaker but universal signal
    else for (const t of m.tags) s += counts.get(t) ?? 0;
  }
  return s;
}

// ------------------------------------------------------------------ ante reading

export interface AnteInfo {
  /** Leverage still missing for this act's ante. */
  needed: number;
  /** Ordinary cards left before the flashpoint. */
  cardsLeft: number;
  /** Average leverage per card so far (this act, else the run). */
  avg: number;
  /** What each remaining card must score to make the ante. */
  perCardNeed: number;
  /** The current pace will miss the ante. */
  pressure: boolean;
}

export function anteInfo(content: Content, state: RunState, inFlashpoint: boolean): AnteInfo {
  const act = actDef(content, state.act);
  const needed = Math.max(0, state.actTarget - state.actLeverage);
  const cardsLeft = Math.max(0, act.cards - state.actCards);
  const avg = state.actCards > 0 ? state.actLeverage / state.actCards : state.cardsPlayed > 0 ? state.score / state.cardsPlayed : 0;
  const perCardNeed = needed / Math.max(1, cardsLeft);
  const pressure = !inFlashpoint && needed > 0 && perCardNeed > avg;
  return { needed, cardsLeft, avg, perCardNeed, pressure };
}

// ------------------------------------------------------------------ random

/**
 * Uniform left/right; 30% chance to let a timer expire; buys each affordable
 * offer with 50% chance; uses a random held order 20% of the time; continues
 * into endless half the time.
 */
export const randomPolicy: Policy = {
  name: 'random',
  choose(_content, _state, view, rng) {
    if (view.timer !== null && rng.next() < 0.3) return 'timeout';
    return coin(rng);
  },
  useOrder(_content, state, _view, rng, used) {
    if (used > 0 || state.orders.length === 0) return -1;
    if (rng.next() >= 0.2) return -1;
    return rng.int(state.orders.length);
  },
  shop(_content, state, rng, api) {
    const shop = state.shop;
    if (!shop) return;
    for (let i = 0; i < shop.offers.length; i++) {
      const o = shop.offers[i];
      const want = rng.next() < 0.5;
      if (want && !o.sold && o.price <= state.capital) api.buyPiece(i);
    }
    for (let i = 0; i < shop.orders.length; i++) {
      const o = shop.orders[i];
      const want = rng.next() < 0.5;
      if (want && !o.sold && o.price <= state.capital) api.buyOrder(i);
    }
  },
  continueRun(_content, _state, rng) {
    return rng.next() < 0.5;
  },
};

// ------------------------------------------------------------------ greedy (meter + a little leverage)

/**
 * Greedy score: the smallest distance to an edge among the four office meters
 * after the visible preview, plus 1.5 × (100 − escalation), plus 0.02 × the
 * side's leverage. Hidden costs are unknown to the bot and odds are neutral.
 */
export function greedyScore(state: RunState, side: ChoiceView): number {
  let minEdge = 100;
  for (const k of OFFICE) {
    const d = edgeDistance(clamp(state.meters[k] + (side.preview[k] ?? 0), 0, 100));
    if (d < minEdge) minEdge = d;
  }
  const esc = clamp(state.meters.escalation + (side.preview.escalation ?? 0), 0, 100);
  return minEdge + 1.5 * (100 - esc) + 0.02 * side.leverage.total;
}

export const GREEDY_STANDDOWN_ESCALATION = 75;

export const greedyPolicy: Policy = {
  name: 'greedy',
  choose(_content, state, view, rng) {
    if (view.timer !== null && rng.next() < 0.1) return 'timeout';
    const l = greedyScore(state, view.left);
    const r = greedyScore(state, view.right);
    if (l === r) return coin(rng);
    return l > r ? 'left' : 'right';
  },
  useOrder(content, state) {
    if (state.meters.escalation < GREEDY_STANDDOWN_ESCALATION) return -1;
    for (let i = 0; i < state.orders.length; i++) {
      const o = content.orders[state.orders[i]];
      if (o && isStandDownOrder(o)) return i;
    }
    return -1;
  },
  shop(content, state, _rng, api) {
    const shop = state.shop;
    if (!shop) return;
    // The most expensive affordable piece, once per visit.
    if (state.pieces.length < api.maxPieces()) {
      let best = -1;
      for (let i = 0; i < shop.offers.length; i++) {
        const o = shop.offers[i];
        if (o.sold || o.price > state.capital || state.pieces.includes(o.piece)) continue;
        if (best < 0 || o.price > shop.offers[best].price) best = i;
      }
      if (best >= 0) api.buyPiece(best);
    }
    // A Stand-Down to fire at 75, if it can still afford one.
    if (state.orders.length < api.maxOrders()) {
      for (let i = 0; i < shop.orders.length; i++) {
        const o = shop.orders[i];
        const def = content.orders[o.order];
        if (o.sold || o.price > state.capital || !def || !isStandDownOrder(def)) continue;
        if (api.buyOrder(i)) break;
      }
    }
  },
  continueRun() {
    return true;
  },
};

// ------------------------------------------------------------------ heuristic (a thoughtful human)

/** A side is hard-avoid when it leaves an office meter this close to an edge without improving it. */
export const EDGE_MARGIN = 8;
/** ... or leaves escalation above this without lowering it. */
export const ESCALATION_HARD = 88;
/** The wall for builds that are not paid at the top of the curve. */
export const ESCALATION_HARD_CALM = 80;
/** Quadratic price of escalation above CALM_CEILING for calm builds (smaller = steeper). */
export const HOT_DIVISOR = 8;
/** Each "?" (hidden cost) is read as this much extra escalation. */
export const HIDDEN_COST_ESCALATION = 6;
/** Without an escalation-scaling build, live at or below this. */
export const CALM_CEILING = 60;
/** With an escalation-scaling build, aim for this band. */
export const BRINK_BAND: readonly [number, number] = [82, 92];
/** Hotline charges are worth spending from here. */
export const CHARGE_ESCALATION = 40;
/**
 * Leverage weights (ante pressure on / off), applied to a side's leverage in units of
 * "what a card ought to score right now": under pressure the per-card need (or, when no side
 * can cover it, the card's best side); otherwise the current pace.
 */
export const LEVERAGE_WEIGHT_PRESSURE = 0.6;
export const LEVERAGE_WEIGHT_RELAXED = 0.15;
/** Turns one unit of leverage weight into score points comparable with the meter penalties. */
export const LEVERAGE_SCALE = 20;
/** A side never earns more than this many units of leverage credit. */
export const LEVERAGE_REL_CAP = 5;
/** An accident attached to the card costs this × p on both sides (it fires whichever side is chosen). */
export const ACCIDENT_PENALTY = 8;
/** Use Duty Officer's Veto (skip_accident) at this accident probability or above. */
export const VETO_P = 0.25;
/** Stand-Down orders fire from here (brink build / otherwise). */
export const STANDDOWN_ESCALATION_BRINK = 92;
export const STANDDOWN_ESCALATION = 85;
/** Meter-restoring orders fire below this. */
export const RESTORE_BELOW = 25;
/** Buy safety orders (Stand-Down, Veto) in the shop from this escalation. */
export const SAFETY_ORDER_ESCALATION = 70;
/** Bonus for the higher-leverage side once a retrigger/mult order has been queued. */
export const BOOSTED_SIDE_BONUS = 25;

const CALM_TAGS: readonly string[] = ['deescalate', 'reassurance', 'back_channel', 'diplomacy'];

export interface HeuristicContext {
  brink: boolean;
  /** The escalation band a brink build wants to sit in (a piece paid from 90 moves it up). */
  band: readonly [number, number];
  ante: AnteInfo;
  /** One unit of leverage credit, in leverage points (see LEVERAGE_WEIGHT_*). */
  unit: number;
  /** Probability that the attached accident fires (0 when none; 0/1 when resolved by Perfect Intel). */
  accidentP: number;
  held: PieceDef[];
}

export function heuristicContext(content: Content, state: RunState, view: CardView): HeuristicContext {
  const held = heldPieces(content, state);
  const acc = view.accident;
  const accidentP = !acc ? 0 : acc.known === null ? acc.p : acc.known ? 1 : 0;
  const ante = anteInfo(content, state, view.isFlashpoint);
  const best = Math.max(view.left.leverage.total, view.right.leverage.total);
  const pace = ante.avg > 0 ? ante.avg : best;
  const unit = Math.max(1, ante.pressure ? Math.min(ante.perCardNeed, best) : pace);
  return { brink: isBrinkBuild(held), band: brinkBand(held), ante, unit, accidentP, held };
}

export interface SideEvaluation {
  score: number;
  hardAvoid: boolean;
  /** Projected escalation including hidden-cost assumptions. */
  escalation: number;
}

/**
 * Score one side with only the information a player has. Higher is better.
 * (a) edges, (b) ante pressure, (c) escalation band by build, (d) accidents,
 * (e) odds and (f) Hotline charges from the simulator brief live here.
 */
/**
 * Expected extra deltas from an odds roll: p × success + (1 − p) × failure, read from the
 * card definition (the bot knows the deck the way a veteran does; the UI keeps the surprise).
 */
export function expectedOutcome(choice: ChoiceDef | undefined, p: number | undefined): Effects {
  const out: Effects = {};
  if (!choice?.odds || p === undefined) return out;
  const add = (e: Effects | undefined, w: number) => {
    if (!e) return;
    for (const k of Object.keys(e) as EffectKey[]) out[k] = (out[k] ?? 0) + (e[k] ?? 0) * w;
  };
  add(choice.odds.success.effects, p);
  add(choice.odds.failure.effects, 1 - p);
  return out;
}

export function evaluateSide(state: RunState, side: ChoiceView, hc: HeuristicContext, expected: Effects = {}): SideEvaluation {
  const m = state.meters;
  let score = 0;
  let hardAvoid = false;

  for (const k of OFFICE) {
    const v = m[k];
    const v2 = clamp(v + (side.preview[k] ?? 0) + (expected[k] ?? 0), 0, 100);
    const d = edgeDistance(v);
    const d2 = edgeDistance(v2);
    // (a) within 8 of an edge and not climbing away from it.
    if (d2 <= EDGE_MARGIN && d2 <= d) hardAvoid = true;
    // keep meters in 25..75: the change in a quadratic out-of-band penalty...
    const out = bandOut(v);
    const out2 = bandOut(v2);
    score -= (out2 * out2 - out * out) / 4;
    // ...and moves toward the nearer edge cost quadratically in the step, more so when already outside the band.
    if (d2 < d) {
      const step = d - d2;
      score -= step * step * (0.2 + out2 * 0.1);
    } else if (d2 > d) {
      score += (d2 - d) * 0.25;
    }
  }

  // Hidden costs shown as "?" are read as +6 escalation each.
  const esc = m.escalation;
  const esc2 = clamp(esc + (side.preview.escalation ?? 0) + (expected.escalation ?? 0) + side.hiddenCosts.length * HIDDEN_COST_ESCALATION, 0, 100);
  // Brink builds are paid to sit just under the top; anyone else treats 80 as the wall.
  const hardWall = hc.brink ? ESCALATION_HARD : ESCALATION_HARD_CALM;
  if (esc2 > hardWall && esc2 >= esc) hardAvoid = true;

  if (hc.brink) {
    // (c) the build pays at the top of the curve: move toward 82..92 and never past it.
    const d = bandDistance(esc, hc.band[0], hc.band[1]);
    const d2 = bandDistance(esc2, hc.band[0], hc.band[1]);
    score += (d - d2) * 1.0;
    const over = Math.max(0, esc2 - hc.band[1]);
    const overBefore = Math.max(0, esc - hc.band[1]);
    score -= (over * over - overBefore * overBefore) / 4;
  } else {
    // (c) otherwise stay at or below 60: every point up costs more the hotter it is, and the
    // region above the ceiling is priced like the edge of an office meter (accidents live there).
    score -= (esc2 - esc) * (1 + esc2 / 50);
    const hot = Math.max(0, esc2 - CALM_CEILING);
    const hotBefore = Math.max(0, esc - CALM_CEILING);
    score -= (hot * hot - hotBefore * hotBefore) / HOT_DIVISOR;
    if (esc >= CALM_CEILING && hasAny(side.tags, CALM_TAGS)) score += 8;
  }

  // (b) leverage, in units of what a card ought to score right now; heavy when the ante is slipping.
  // A calm build stops being paid for leverage as it nears the wall: no ante is worth the accident curve.
  const rel = Math.min(LEVERAGE_REL_CAP, side.leverage.total / hc.unit);
  const heat = hc.brink ? 1 : Math.max(0, 1 - Math.max(0, esc2 - CALM_CEILING) / (ESCALATION_HARD_CALM - CALM_CEILING));
  score += (hc.ante.pressure ? LEVERAGE_WEIGHT_PRESSURE : LEVERAGE_WEIGHT_RELAXED) * LEVERAGE_SCALE * rel * heat;

  // (e) odds: attractive at p ≥ 0.6, neutral 0.45..0.6, avoided below 0.45.
  if (side.odds) {
    const p = side.odds.p;
    if (p >= 0.6) score += 3 + (p - 0.6) * 10;
    else if (p < 0.45) score -= 4 + (0.45 - p) * 20;
  }

  // (f) spend a Hotline charge when the room is warm enough to need it.
  if (side.usesCharge && esc >= CHARGE_ESCALATION) score += 6;

  // (d) an attached accident hurts whichever side is chosen.
  score -= ACCIDENT_PENALTY * hc.accidentP;

  return { score, hardAvoid, escalation: esc2 };
}

export function evaluateBoth(content: Content, state: RunState, view: CardView): { hc: HeuristicContext; L: SideEvaluation; R: SideEvaluation } {
  const hc = heuristicContext(content, state, view);
  const card = state.current ? content.cards[state.current] : undefined;
  const L = evaluateSide(state, view.left, hc, expectedOutcome(card?.left, view.left.odds?.p));
  const R = evaluateSide(state, view.right, hc, expectedOutcome(card?.right, view.right.odds?.p));
  // A choice that forces a losing ending (resign, launch) is the end of the run, whatever its printed cost.
  const forcedLoss = (c: ChoiceDef | undefined): boolean => {
    if (!c?.ending) return false;
    const k = content.endings[c.ending]?.kind;
    return k !== 'standdown' && k !== 'survival';
  };
  if (forcedLoss(card?.left)) {
    L.hardAvoid = true;
    L.score -= 1000;
  }
  if (forcedLoss(card?.right)) {
    R.hardAvoid = true;
    R.score -= 1000;
  }
  return { hc, L, R };
}

/** Does the next ante look harder than the current pace can carry? (Shop-time reading.) */
export function nextAnteLooksHard(content: Content, state: RunState): boolean {
  const shop = state.shop;
  const mid = !!shop && shop.mid;
  const nextAct = mid ? state.act : state.act + 1;
  const scale = difficultyDef(content, state.difficulty).target_scale ?? 1;
  const target = mid ? state.actTarget : actTarget(content, nextAct, scale);
  const act = actDef(content, nextAct);
  const cardsLeft = Math.max(1, mid ? act.cards - state.actCards : act.cards);
  const needed = Math.max(0, target - (mid ? state.actLeverage : 0));
  const avg = state.cardsPlayed > 0 ? state.score / state.cardsPlayed : 0;
  return needed / cardsLeft > avg * 1.1;
}

/** Contribution of a held piece to the current plan (higher = keep). Core pieces are never sold. */
function contribution(content: Content, state: RunState, id: string, arch: ArchetypeFit | null): number {
  const p = content.pieces[id];
  if (!p) return 0;
  let s = RARITY_RANK[p.rarity] * 10 + p.price;
  if (arch) {
    if (arch.def.core.includes(id)) s += 1000;
    else if (arch.def.support.includes(id)) s += 100;
  }
  const grown = state.pieceState[id];
  if (grown) s += grown.mult * 20 + grown.base;
  return s;
}

interface Purchase {
  index: number;
  /** Piece to sell first, to make room. */
  sell?: string;
}

/** Rule (h): the next piece to buy, or null when nothing on offer is wanted or affordable. */
function nextPurchase(content: Content, state: RunState, api: ShopApi, arch: ArchetypeFit | null): Purchase | null {
  const shop = state.shop;
  if (!shop) return null;
  const slots = api.maxPieces() - state.pieces.length;
  const open: number[] = [];
  for (let i = 0; i < shop.offers.length; i++) {
    const o = shop.offers[i];
    if (!o.sold && !state.pieces.includes(o.piece) && content.pieces[o.piece]) open.push(i);
  }
  if (open.length === 0) return null;
  const price = (i: number) => shop.offers[i].price;
  const byPriceDesc = (a: number, b: number) => price(b) - price(a) || a - b;

  if (arch) {
    const core = open.filter((i) => arch.def.core.includes(shop.offers[i].piece)).sort(byPriceDesc);
    for (const i of core) {
      if (slots > 0) {
        if (price(i) <= state.capital) return { index: i };
        continue;
      }
      // At the cap: sell the weakest non-core piece if that pays for the core piece.
      let weakest: string | null = null;
      let weakestC = Infinity;
      for (const id of state.pieces) {
        if (arch.def.core.includes(id)) continue;
        const c = contribution(content, state, id, arch);
        if (c < weakestC) {
          weakestC = c;
          weakest = id;
        }
      }
      if (weakest && state.capital + api.sellPrice(weakest) >= price(i)) return { index: i, sell: weakest };
    }
    if (slots <= 0) return null;
    const support = open.filter((i) => arch.def.support.includes(shop.offers[i].piece) && price(i) <= state.capital).sort(byPriceDesc);
    if (support.length) return { index: support[0] };
    return null;
  }

  if (slots <= 0) return null;
  const affordable = open.filter((i) => price(i) <= state.capital);
  if (affordable.length === 0) return null;
  const { counts, choices } = chosenTagCounts(content, state);
  const affinity = (i: number) => pieceAffinity(content.pieces[shop.offers[i].piece], counts, choices);
  const byAffinity = (a: number, b: number) => affinity(b) - affinity(a) || byPriceDesc(a, b);
  for (const rarity of ['legendary', 'rare'] as const) {
    const of = affordable.filter((i) => content.pieces[shop.offers[i].piece].rarity === rarity).sort(byAffinity);
    if (of.length) return { index: of[0] };
  }
  const matched = affordable.filter((i) => affinity(i) > 0).sort(byAffinity);
  return matched.length ? { index: matched[0] } : null;
}

function offersWanted(state: RunState, arch: ArchetypeFit): boolean {
  const shop = state.shop;
  if (!shop) return false;
  for (const o of shop.offers) {
    if (o.sold) continue;
    if (arch.def.core.includes(o.piece) || arch.def.support.includes(o.piece)) return true;
  }
  return false;
}

function buyOrdersWhere(content: Content, state: RunState, api: ShopApi, want: (o: OrderDef, price: number) => boolean): void {
  const shop = state.shop;
  if (!shop) return;
  for (let i = 0; i < shop.orders.length; i++) {
    if (state.orders.length >= api.maxOrders()) return;
    const offer = shop.orders[i];
    const def = content.orders[offer.order];
    if (offer.sold || !def || offer.price > state.capital) continue;
    if (want(def, offer.price)) api.buyOrder(i);
  }
}

export const heuristicPolicy: Policy = {
  name: 'heuristic',

  choose(content, state, view, rng) {
    // (i) even a thoughtful player lets one timer in twenty run out.
    if (view.timer !== null && rng.next() < 0.05) return 'timeout';
    const { L, R } = evaluateBoth(content, state, view);
    // A queued retrigger / mult order must land on the bigger side.
    if (state.nextRetrigger > 0 || state.nextMult !== 1) {
      if (view.left.leverage.total > view.right.leverage.total) L.score += BOOSTED_SIDE_BONUS;
      else if (view.right.leverage.total > view.left.leverage.total) R.score += BOOSTED_SIDE_BONUS;
    }
    if (L.hardAvoid && R.hardAvoid) {
      // (f) bury the card when both sides are unacceptable and the Chief of Staff can make it disappear.
      if (state.charges.removal > 0 && !view.isFlashpoint) return 'bury';
    } else if (L.hardAvoid) return 'right';
    else if (R.hardAvoid) return 'left';
    if (L.score === R.score) return coin(rng);
    return L.score > R.score ? 'left' : 'right';
  },

  useOrder(content, state, view) {
    if (state.orders.length === 0) return -1;
    const { hc, L, R } = evaluateBoth(content, state, view);
    const esc = state.meters.escalation;
    const card = content.cards[view.id];
    const bothBad = L.hardAvoid && R.hardAvoid && !view.isFlashpoint;
    const best = Math.max(view.left.leverage.total, view.right.leverage.total);
    for (let i = 0; i < state.orders.length; i++) {
      const o = content.orders[state.orders[i]];
      if (!o) continue;
      const e = o.effect;
      switch (e.type) {
        case 'skip_accident': {
          // (d) veto an accident that is known to fire, or likely enough to matter.
          const acc = view.accident;
          if (acc && acc.known !== false && (acc.known === true || acc.p >= VETO_P)) return i;
          break;
        }
        case 'meter': {
          if (e.key === 'escalation' && e.delta < 0) {
            // (g) Stand-Down at the top of the ladder.
            if (esc >= (hc.brink ? STANDDOWN_ESCALATION_BRINK : STANDDOWN_ESCALATION)) return i;
          } else if (e.delta > 0 && (OFFICE as readonly string[]).includes(e.key)) {
            // (g) restore a meter that is getting dangerous.
            if (state.meters[e.key as MeterKey] < RESTORE_BELOW) return i;
          } else if (e.delta > 0) {
            // A hidden-value boost (trust, intel) is pure upside: use it.
            return i;
          }
          break;
        }
        case 'retrigger_next':
        case 'mult_next': {
          // (g) boost the biggest side of an above-average card while the ante is open.
          if (view.isFlashpoint || state.actLeverage >= state.actTarget) break;
          if (best >= 1.5 * Math.max(1, hc.ante.avg) || hc.ante.cardsLeft <= 2) return i;
          break;
        }
        case 'leverage': {
          if (view.isFlashpoint || hc.ante.needed <= 0) break;
          if (hc.ante.needed <= 2 * e.amount || hc.ante.cardsLeft <= 2) return i;
          break;
        }
        case 'capital':
        case 'reveal':
          return i;
        case 'charge': {
          if (e.charge === 'deescalation') {
            // Only worth it when a Hotline charge can actually be spent on this card.
            const spend = !!card && (card.left.spend_charge === 'deescalation' || card.right.spend_charge === 'deescalation');
            if (spend && state.charges.deescalation === 0 && esc >= CHARGE_ESCALATION && hasFreeDeescalation(hc.held)) return i;
          } else if (bothBad && state.charges.removal === 0) return i;
          break;
        }
        case 'bury':
          if (bothBad && state.charges.removal === 0) return i;
          break;
      }
    }
    return -1;
  },

  shop(content, state, _rng, api) {
    const shop = state.shop;
    if (!shop) return;
    // Safety first when it is hot: a Stand-Down or a Veto before anything else.
    if (state.meters.escalation >= SAFETY_ORDER_ESCALATION) buyOrdersWhere(content, state, api, (o) => isStandDownOrder(o) || isSkipAccidentOrder(o));

    // Pieces: build toward the archetype in mind, with one reroll if nothing fits.
    let rerolled = false;
    for (let guard = 0; guard < 16; guard++) {
      const arch = archetypeInMind(content, state);
      const buy = nextPurchase(content, state, api, arch);
      if (buy) {
        if (buy.sell && !api.sellPiece(buy.sell)) break;
        if (!api.buyPiece(buy.index)) break;
        continue;
      }
      if (!rerolled && arch && state.capital >= api.rerollCost() + 5 && !offersWanted(state, arch)) {
        rerolled = true;
        if (api.reroll()) continue;
      }
      break;
    }

    // Orders with what is left: a favour that pays for itself, a meter that needs propping,
    // insurance for a brink build, and a booster when the next ante looks out of reach.
    const brink = isBrinkBuild(heldPieces(content, state));
    const hard = nextAnteLooksHard(content, state);
    buyOrdersWhere(content, state, api, (o, price) => {
      const e = o.effect;
      if (e.type === 'capital') return e.delta > price;
      const restore = restoredMeter(o);
      if (restore) return state.meters[restore] < 30;
      if (isStandDownOrder(o) || isSkipAccidentOrder(o)) return brink && state.capital >= price + 4;
      if (isBoosterOrder(o)) return hard;
      if (e.type === 'bury') return state.capital >= price + 8;
      if (e.type === 'charge') return e.charge === 'deescalation' && hasFreeDeescalation(heldPieces(content, state)) && state.capital >= price + 4;
      return false;
    });

    // A brink build thins the deck of the cards that punish it at home, once.
    if (brink && state.capital >= 8 && !state.removedTags.includes('personal') && !state.removedTags.includes('domestic')) api.removeTag('personal');
  },

  continueRun() {
    // (j) always: that is where "broke the game" scores come from.
    return true;
  },
};

// ------------------------------------------------------------------ registry

export const POLICIES: Readonly<Record<PolicyName, Policy>> = {
  random: randomPolicy,
  greedy: greedyPolicy,
  heuristic: heuristicPolicy,
};

export const POLICY_NAMES: readonly PolicyName[] = ['random', 'greedy', 'heuristic'] as const;

export function policyByName(name: string): Policy {
  const p = (POLICIES as Record<string, Policy | undefined>)[name];
  if (!p) throw new Error(`Unknown policy "${name}" (expected one of ${POLICY_NAMES.join(', ')})`);
  return p;
}
