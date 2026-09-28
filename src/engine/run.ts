/**
 * The run state machine. Pure and deterministic: every function takes the
 * content and a RunState, mutates the state in place (for speed in the
 * simulator) and returns it with a list of events for the UI and audio.
 * Serialising the state with JSON.stringify and continuing later yields
 * identical results because the RNG state travels with it.
 *
 * Loop: card → choose (effects, odds, LEVERAGE, accidents) → … → act end:
 * ANTE check (leverage vs target) → flashpoint sequence → SHOP → next act.
 * After the Endgame a win may continue into endless acts with rising targets.
 */
import { Rng } from './rng';
import {
  METERS,
  type AccidentResult,
  type AccidentState,
  type AccidentType,
  type ActDef,
  type CardDef,
  type CardView,
  type ChoiceDef,
  type ChoiceView,
  type Content,
  type DifficultyDef,
  type EffectKey,
  type Effects,
  type EndingDef,
  type EndingTrigger,
  type FlashpointDef,
  type HiddenKey,
  type HistoryEntry,
  type MeterKey,
  type Mode,
  type OrderDef,
  type OutcomeDef,
  type PieceDef,
  type RollResult,
  type RunEvent,
  type RunState,
  type ScaleTrigger,
  type Seat,
  type Side,
} from './types';
import {
  clamp,
  escalationBounds,
  hasRule,
  resolveEffects,
  resolveIntel,
  resolveOdds,
  resolveTimer,
  resolveWeight,
  roundHalfAway,
  ruleValue,
  type ModContext,
} from './modifiers';
import { activeFlags, checkConditions } from './conditions';
import {
  ACCIDENT_LABEL,
  ACCIDENT_TYPES,
  MAX_ORDERS,
  MAX_PIECES,
  RARITY_WEIGHT,
  REMOVABLE_TAGS,
  REMOVE_TAG_PRICE,
  REROLL_BASE,
  accidentChance,
  accidentEffects,
  accidentModifiers,
  actTarget,
  anteReward,
  computeLeverage,
  endlessActDef,
} from './leverage';

export const STANDDOWN_THRESHOLD = 35;
export const NEAR_MISS_MARGIN = 5;
export const MAX_ACTIVE_ARCS = 2;
export const FLASHPOINT_DAY_PER_CARD = 0.25;

export interface RunOptions {
  seed: string;
  seat: Seat;
  mode: Mode;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  /** Piece ids the player has unlocked ('all' = everything). Locked pieces are never offered. */
  unlocked?: string[] | 'all';
}

export interface StepResult {
  state: RunState;
  events: RunEvent[];
}

// ------------------------------------------------------------------ helpers

export function actDef(content: Content, act: number): ActDef {
  const acts = content.acts;
  if (act <= acts.length) return acts[Math.max(act, 1) - 1];
  return endlessActDef(acts[acts.length - 1], act);
}

export function difficultyDef(content: Content, level: number): DifficultyDef {
  return content.difficulties.find((d) => d.level === level) ?? content.difficulties[0];
}

export function heldPieces(content: Content, state: RunState): PieceDef[] {
  const out: PieceDef[] = [];
  for (const id of state.pieces) {
    const p = content.pieces[id];
    if (p) out.push(p);
  }
  return out;
}

export function ctxFor(content: Content, state: RunState): ModContext {
  return { pieces: heldPieces(content, state), act: actDef(content, state.act), difficulty: difficultyDef(content, state.difficulty) };
}

function rngOf(state: RunState): Rng {
  return new Rng(state.rng);
}

function saveRng(state: RunState, rng: Rng): void {
  state.rng = rng.snapshot();
}

export function maxPieces(ctx: ModContext): number {
  return MAX_PIECES + ruleValue(ctx, 'extra_piece_slot');
}

export function maxOrders(ctx: ModContext): number {
  return MAX_ORDERS + ruleValue(ctx, 'extra_order_slot');
}

/** Replace {us}, {rival}, {other}, {leader}, {capital}, {rival_adj}, {us_adj}… in card text. */
export function template(content: Content, state: RunState, text: string): string {
  const seat = content.seats[state.seat];
  const rival = content.seats[seat.rivals[0]];
  const other = content.seats[seat.rivals[1]];
  const map: Record<string, string> = {
    us: seat.the,
    rival: rival.the,
    other: other.the,
    leader: seat.leader_title,
    capital: seat.capital,
    rival_capital: rival.capital,
    other_capital: other.capital,
    rival_adj: rival.adjective,
    other_adj: other.adjective,
    us_adj: seat.adjective,
    rival_leader: rival.leader_title,
    other_leader: other.leader_title,
  };
  // Any variable may be written with a capital first letter ({Rival}, {Rival_leader}) to start a sentence.
  return text.replace(/\{(\w+)\}/g, (m, k: string) => {
    if (k in map) return map[k];
    const lower = k.charAt(0).toLowerCase() + k.slice(1);
    if (lower in map) return cap(map[lower]);
    return m;
  });
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ------------------------------------------------------------------ creation

export function createRun(content: Content, opts: RunOptions): RunState {
  const seat = content.seats[opts.seat];
  const difficulty = opts.difficulty ?? 5;
  const diff = difficultyDef(content, difficulty);
  const rng = new Rng(`${opts.seed}|${opts.seat}|${difficulty}`);
  const state: RunState = {
    v: 2,
    seed: opts.seed,
    rng: rng.snapshot(),
    seat: opts.seat,
    mode: opts.mode,
    difficulty,
    act: 1,
    actCards: 0,
    cardsPlayed: 0,
    day: 1,
    meters: { ...seat.meters, escalation: clamp(seat.meters.escalation + diff.start_escalation, 0, 100) },
    hidden: { ...seat.hidden },
    flags: [`seat:${opts.seat}`, `mode:${opts.mode}`],
    pieces: [...seat.starting_pieces],
    pieceState: {},
    orders: [],
    removedTags: [],
    seen: [],
    queue: [],
    phase: 'card',
    current: null,
    truth: null,
    accident: null,
    shop: null,
    midShopDone: false,
    anteSettled: false,
    flashpoint: null,
    flashpointsUsed: [],
    ending: null,
    moment: null,
    history: [],
    trail: [],
    charges: { deescalation: 0, removal: 0 },
    escalationFloor: 0,
    revealed: [],
    capital: seat.starting_capital ?? 4,
    actLeverage: 0,
    actTarget: actTarget(content, 1, diff.target_scale ?? 1),
    score: 0,
    nextRetrigger: 0,
    nextMult: 1,
    deadmanUsed: false,
    endless: false,
    canContinue: false,
    lastLeverage: null,
    stats: {
      rolls: 0,
      nearMisses: 0,
      timeouts: 0,
      falseAlarms: 0,
      trueWarnings: 0,
      accidents: 0,
      accidentsSurvived: 0,
      antesMet: 0,
      antesSmashed: 0,
      antesMissed: 0,
      bestChoice: 0,
      peakEscalation: state_peak(seat.meters.escalation + diff.start_escalation),
    },
  };
  if (opts.unlocked && opts.unlocked !== 'all') state.flags.push(...opts.unlocked.map((u) => `unlocked:${u}`));
  else state.flags.push('unlocked:all');
  resetCharges(content, state);
  applyReveals(content, state, []);
  const events: RunEvent[] = [];
  drawNext(content, state, rng, events);
  saveRng(state, rng);
  return state;
}

function state_peak(v: number): number {
  return clamp(v, 0, 100);
}

function resetCharges(content: Content, state: RunState): void {
  const ctx = ctxFor(content, state);
  state.charges.deescalation = ruleValue(ctx, 'free_deescalation_per_act');
  state.charges.removal = ruleValue(ctx, 'remove_card_per_act');
}

function applyReveals(content: Content, state: RunState, events: RunEvent[]): void {
  const ctx = ctxFor(content, state);
  const map: [string, HiddenKey[]][] = [
    ['reveal_intel', ['intel']],
    ['reveal_trust', ['trust_primary', 'trust_secondary']],
    ['reveal_commitment', ['commitment']],
  ];
  for (const [rule, keys] of map) {
    if (!hasRule(ctx, rule as any)) continue;
    for (const k of keys) {
      if (!state.revealed.includes(k)) {
        state.revealed.push(k);
        events.push({ type: 'reveal', key: k });
      }
    }
  }
}

// ------------------------------------------------------------------ view

export function view(content: Content, state: RunState): CardView | null {
  if (state.phase !== 'card' || !state.current) return null;
  const card = content.cards[state.current];
  if (!card) return null;
  const ctx = ctxFor(content, state);
  const act = actDef(content, state.act);
  const fp = state.flashpoint ? content.flashpoints[state.flashpoint] : null;
  const timer = resolveTimer(card.timer, ctx);
  return {
    id: card.id,
    advisor: content.speakers[card.advisor] ?? content.speakers.aide,
    text: template(content, state, card.text),
    left: choiceView(content, state, card, 'left', ctx),
    right: choiceView(content, state, card, 'right', ctx),
    timer,
    timeout: timeoutSide(card, ctx),
    act: state.act,
    actName: act.name,
    day: Math.floor(state.day),
    isFlashpoint: !!state.flashpoint,
    flashpointName: fp ? fp.name : null,
    tags: card.tags,
    accident: state.accident ? { ...state.accident, label: ACCIDENT_LABEL[state.accident.type] } : null,
  };
}

function timeoutSide(card: CardDef, ctx: ModContext): Side {
  if (hasRule(ctx, 'predelegation')) {
    const mil = (s: Side) => card[s].tags.some((t) => t === 'military' || t === 'strike' || t === 'escalatory');
    if (mil('left') && !mil('right')) return 'left';
    if (mil('right') && !mil('left')) return 'right';
  }
  return card.timeout ?? 'right';
}

function choiceView(content: Content, state: RunState, card: CardDef, side: Side, ctx: ModContext): ChoiceView {
  const choice = card[side];
  const usesCharge = wouldUseCharge(state, choice, ctx);
  const effects = effectiveBase(state, choice, ctx, usesCharge);
  const preview = resolveEffects(effects, choice.tags, ctx);
  const hiddenCosts: EffectKey[] = [];
  if (hasRule(ctx, 'hide_escalation_cost') && (preview.escalation ?? 0) > 0) {
    hiddenCosts.push('escalation');
    delete preview.escalation;
  }
  let odds: ChoiceView['odds'];
  if (choice.odds) {
    const r = resolveOdds(choice.odds.base, choice.odds.tags, ctx, state.hidden);
    odds = { label: choice.odds.label, p: r.p };
  }
  return {
    side,
    text: template(content, state, choice.text),
    preview,
    hiddenCosts,
    odds,
    tags: choice.tags,
    usesCharge,
    leverage: computeLeverage(content, state, choice, ctx.pieces),
    capital: choice.capital ?? 0,
  };
}

function wouldUseCharge(state: RunState, choice: ChoiceDef, _ctx: ModContext): boolean {
  // Charges come from the Hotline (free_deescalation_per_act) or a One More Call order; either spends here.
  return choice.spend_charge === 'deescalation' && state.charges.deescalation > 0;
}

/**
 * Base effects before piece modifiers, after engine-level rules that depend on
 * run state: the commitment trap and free de-escalation charges.
 */
function effectiveBase(state: RunState, choice: ChoiceDef, ctx: ModContext, usesCharge: boolean): Effects {
  const e: Effects = { ...choice.effects };
  if (usesCharge) {
    if ((e.public ?? 0) < 0) delete e.public;
    if ((e.military ?? 0) < 0) delete e.military;
    if ((e.allies ?? 0) < 0) delete e.allies;
  }
  // Commitment trap: walking back a public commitment costs more public the more committed you are.
  // The base trap doubles the cost at full commitment; commitment_lock pieces add to it.
  if (choice.tags.includes('walk_back') && (e.public ?? 0) < 0) {
    const lock = 1 + ruleValue(ctx, 'commitment_lock', 0);
    e.public = (e.public ?? 0) * (1 + (state.hidden.commitment / 100) * lock);
  }
  return e;
}

// ------------------------------------------------------------------ choose

export function choose(content: Content, state: RunState, side: Side | 'timeout'): StepResult {
  const events: RunEvent[] = [];
  if (state.phase !== 'card' || !state.current) return { state, events };
  const card = content.cards[state.current];
  if (!card) return { state, events };
  const rng = rngOf(state);
  const ctx = ctxFor(content, state);
  const act = actDef(content, state.act);

  let resolvedSide: Side;
  if (side === 'timeout') {
    resolvedSide = timeoutSide(card, ctx);
    state.stats.timeouts++;
    events.push({ type: 'timeout' });
  } else resolvedSide = side;
  const choice = card[resolvedSide];

  // 0. Leverage is scored on the state as shown to the player (what you see is what you score).
  const lv = computeLeverage(content, state, choice, ctx.pieces);

  // 1. Effects (with charge + commitment trap), through the resolver.
  const usesCharge = wouldUseCharge(state, choice, ctx);
  if (usesCharge) {
    state.charges.deescalation--;
    events.push({ type: 'charge_used', charge: 'deescalation' });
  }
  const applied = applyEffects(content, state, rng, effectiveBase(state, choice, ctx, usesCharge), choice.tags, ctx);
  events.push({ type: 'effects', applied });
  if (choice.capital) addCapital(state, choice.capital, 'choice', events);

  const entry: HistoryEntry = { card: card.id, side: resolvedSide, timedOut: side === 'timeout', act: state.act, day: state.day, applied: { ...applied }, leverage: lv.total };
  let forcedEnding: string | undefined = choice.ending;

  // 2. Odds roll.
  if (choice.odds) {
    const o = resolveOdds(choice.odds.base, choice.odds.tags, ctx, state.hidden);
    const r = rng.roll(o.p);
    const margin = Math.abs(o.p - r.roll) * 100;
    const result: RollResult = { label: choice.odds.label, p: o.p, roll: r.roll, success: r.success, margin, nearMiss: margin < NEAR_MISS_MARGIN };
    state.stats.rolls++;
    if (result.nearMiss) state.stats.nearMisses++;
    entry.roll = result;
    events.push({ type: 'roll', result });
    const outcome: OutcomeDef = r.success ? choice.odds.success : choice.odds.failure;
    const tags = [...choice.tags, ...choice.odds.tags, r.success ? 'success' : 'failure'];
    if (outcome.effects) {
      const a2 = applyEffects(content, state, rng, outcome.effects, tags, ctx);
      for (const k of Object.keys(a2) as EffectKey[]) entry.applied[k] = (entry.applied[k] ?? 0) + (a2[k] ?? 0);
      events.push({ type: 'effects', applied: a2 });
    }
    if (outcome.capital) addCapital(state, outcome.capital, 'roll', events);
    applyFlags(state, outcome.set, outcome.clear, events);
    queueFollows(content, state, rng, outcome.follow, !!card.flashpoint);
    if (outcome.ending) forcedEnding = outcome.ending;
    grow(content, state, r.success ? 'roll_success' : 'roll_failure', choice.tags, events);
    if (result.nearMiss) grow(content, state, 'near_miss', choice.tags, events);
  }

  // 3. Flags, reveals, follow-ups.
  applyFlags(state, choice.set, choice.clear, events);
  if (choice.reveal && !state.revealed.includes(choice.reveal)) {
    state.revealed.push(choice.reveal);
    events.push({ type: 'reveal', key: choice.reveal });
  }
  queueFollows(content, state, rng, choice.follow, !!card.flashpoint);

  // 4. Warning resolution: the truth was decided on draw; the right branch is queued now.
  if (card.warning && state.truth !== null) {
    entry.truth = state.truth;
    const w = card.warning;
    queueFollows(content, state, rng, [{ card: state.truth ? w.true_follow : w.false_follow, in: w.in }], !!card.flashpoint);
    if (state.truth) state.stats.trueWarnings++;
    else state.stats.falseAlarms++;
    events.push({ type: 'warning', truth: state.truth });
  }
  state.truth = null;

  // 5. Leverage.
  state.score += lv.total;
  if (!card.flashpoint) state.actLeverage += lv.total;
  if (lv.total > state.stats.bestChoice) state.stats.bestChoice = lv.total;
  state.lastLeverage = lv;
  state.nextRetrigger = 0;
  state.nextMult = 1;
  events.push({ type: 'leverage', breakdown: lv, actLeverage: state.actLeverage, actTarget: state.actTarget });
  grow(content, state, 'choice', choice.tags, events);

  // 6. Accident.
  let accidentFired = false;
  if (state.accident) {
    const acc = state.accident;
    let fired: boolean;
    let roll: number;
    if (acc.known !== null) {
      fired = acc.known;
      roll = fired ? 0 : 1;
    } else {
      roll = rng.next();
      fired = roll < acc.p;
      if (!fired && hasRule(ctx, 'accidents_twice')) {
        const r2 = rng.next();
        if (r2 < acc.p) {
          fired = true;
          roll = r2;
        }
      }
    }
    const { severityMult } = accidentModifiers(ctx.pieces);
    let appliedAcc: Effects = {};
    if (fired) {
      state.stats.accidents++;
      appliedAcc = applyEffects(content, state, rng, accidentEffects(acc.type, state.meters.escalation, severityMult), ['accident', acc.type], ctx);
      if (acc.type === 'false_alarm') addFlag(state, 'false_alarm_live');
      addFlag(state, 'accident:fired');
      addFlag(state, `accident:${acc.type}`);
      state.flags = state.flags.filter((f) => !f.startsWith('accident:last_'));
      addFlag(state, `accident:last_${acc.type}`);
      if (state.meters.escalation >= 100) addFlag(state, 'accident:fatal');
      accidentFired = true;
    }
    const result: AccidentResult = { type: acc.type, p: acc.p, roll, fired, applied: appliedAcc };
    entry.accident = result;
    events.push({ type: 'accident', result });
    if (!fired) grow(content, state, 'accident_avoided', undefined, events);
    state.accident = null;
  }

  // 7. Bookkeeping.
  markSeen(state, card.id);
  state.history.push(entry);
  state.cardsPlayed++;
  if (card.flashpoint || card.bluff) state.day += FLASHPOINT_DAY_PER_CARD;
  else {
    state.actCards++;
    state.day += act.day_per_card;
  }
  if (card.arc) addFlag(state, `arc:${card.arc}`);
  state.trail.push([state.meters.public, state.meters.military, state.meters.allies, state.meters.economy, state.meters.escalation]);
  if (state.meters.escalation > state.stats.peakEscalation) state.stats.peakEscalation = state.meters.escalation;
  for (const p of [50, 80, 90, 95] as const) if (state.stats.peakEscalation >= p) addFlag(state, `peak:${p}`);

  // 8. Passive drift from doctrines and advisors.
  applyDrift(content, state, rng, ctx);

  // 9. Endings (with the Deadman Switch).
  if (forcedEnding) {
    const e = content.endings[forcedEnding];
    if (e && e.kind === 'nuclear' && tryDeadman(content, state, ctx, events)) {
      /* survived */
    } else {
      endRun(content, state, forcedEnding, events);
      saveRng(state, rng);
      return { state, events };
    }
  }
  const trig = thresholdTrigger(state);
  if (trig) {
    if (trig.type === 'meter' && trig.key === 'escalation' && tryDeadman(content, state, ctx, events)) {
      /* survived */
    } else {
      endRun(content, state, pickEnding(content, state, trig)?.id ?? fallbackEndingId(trig), events);
      saveRng(state, rng);
      return { state, events };
    }
  }
  if (accidentFired) {
    state.stats.accidentsSurvived++;
    grow(content, state, 'accident_survived', undefined, events);
  }

  // 10. Mid-act shop, or tick the queue and draw.
  tickQueue(state);
  const halfway = act.cards >= 8 && state.actCards === Math.floor(act.cards / 2);
  if (!state.flashpoint && (card.shop || (!state.midShopDone && halfway))) {
    state.midShopDone = true;
    openShop(content, state, rng, true, events);
    saveRng(state, rng);
    return { state, events };
  }
  drawNext(content, state, rng, events);
  saveRng(state, rng);
  return { state, events };
}

function tryDeadman(content: Content, state: RunState, ctx: ModContext, events: RunEvent[]): boolean {
  if (state.deadmanUsed || !hasRule(ctx, 'deadman_switch')) return false;
  state.deadmanUsed = true;
  state.meters.escalation = Math.max(escalationBounds(ctx, state.escalationFloor).floor, 70);
  addFlag(state, 'deadman:fired');
  events.push({ type: 'deadman' });
  return true;
}

/** Chief-of-Staff Fixer: bury the current card without playing it. */
export function buryCard(content: Content, state: RunState): StepResult {
  const events: RunEvent[] = [];
  if (state.phase !== 'card' || !state.current || state.charges.removal <= 0) return { state, events };
  const card = content.cards[state.current];
  if (!card || card.flashpoint || card.bluff) return { state, events };
  state.charges.removal--;
  markSeen(state, card.id);
  state.truth = null;
  state.accident = null;
  const rng = rngOf(state);
  drawNext(content, state, rng, events);
  saveRng(state, rng);
  return { state, events };
}

function markSeen(state: RunState, id: string): void {
  if (!state.seen.includes(id)) state.seen.push(id);
}

function addFlag(state: RunState, f: string): void {
  if (!state.flags.includes(f)) state.flags.push(f);
}

function addCapital(state: RunState, delta: number, reason: string, events: RunEvent[]): void {
  if (!delta) return;
  state.capital = Math.max(0, state.capital + delta);
  events.push({ type: 'capital', delta, reason });
}

function applyFlags(state: RunState, set: string[] | undefined, clear: string[] | undefined, events: RunEvent[]): void {
  const s = set ?? [];
  const c = clear ?? [];
  if (s.length === 0 && c.length === 0) return;
  for (const f of s) addFlag(state, f);
  if (c.length) state.flags = state.flags.filter((f) => !c.includes(f));
  events.push({ type: 'flag', set: s, clear: c });
}

function queueFollows(content: Content, state: RunState, rng: Rng, follows: import('./types').FollowDef[] | undefined, fromFlashpoint: boolean): void {
  if (!follows) return;
  for (const f of follows) {
    if (f.chance !== undefined && rng.next() >= f.chance) continue;
    if (state.queue.some((q) => q.card === f.card)) continue;
    const target = content.cards[f.card];
    if (target && target.once && state.seen.includes(f.card)) continue;
    state.queue.push({ card: f.card, in: fromFlashpoint ? 0 : f.in });
  }
}

function tickQueue(state: RunState): void {
  for (const q of state.queue) if (q.in > 0) q.in--;
}

/** Apply resolved effects to meters/hidden values with all clamps. Returns the applied deltas. */
function applyEffects(content: Content, state: RunState, rng: Rng, effects: Effects, tags: readonly string[], ctx: ModContext): Effects {
  const resolved = resolveEffects(effects, tags, ctx);
  const applied: Effects = {};
  const variance = ruleValue(ctx, 'trust_variance');
  for (const k of Object.keys(resolved) as EffectKey[]) {
    let d = resolved[k] ?? 0;
    if (variance && (k === 'trust_primary' || k === 'trust_secondary')) d += rng.int(2 * variance + 1) - variance;
    if (d === 0) continue;
    const before = getValue(state, k);
    setValue(content, state, ctx, k, before + d);
    const after = getValue(state, k);
    if (after !== before) applied[k] = after - before;
  }
  return applied;
}

function getValue(state: RunState, k: EffectKey): number {
  return (METERS as readonly string[]).includes(k) ? state.meters[k as MeterKey] : state.hidden[k as HiddenKey];
}

function setValue(content: Content, state: RunState, ctx: ModContext, k: EffectKey, v: number): void {
  if ((METERS as readonly string[]).includes(k)) {
    const key = k as MeterKey;
    let lo = 0;
    let hi = 100;
    if (key === 'escalation') {
      const b = escalationBounds(ctx, state.escalationFloor);
      lo = b.floor;
      hi = b.ceiling;
      if (hi < 100 && v >= hi) v = hi;
    }
    if (key === 'military') lo = Math.max(lo, ruleValue(ctx, 'military_floor'));
    if (key === 'economy') lo = Math.max(lo, ruleValue(ctx, 'economy_floor'));
    state.meters[key] = clamp(roundHalfAway(v), lo, hi);
  } else {
    state.hidden[k as HiddenKey] = clamp(roundHalfAway(v), 0, 100);
  }
}

function applyDrift(content: Content, state: RunState, rng: Rng, ctx: ModContext): void {
  for (const p of ctx.pieces) {
    for (const m of p.modifiers) {
      if (m.kind !== 'drift') continue;
      if (m.when && !checkConditions(m.when, state, ctx.pieces)) continue;
      const whole = Math.trunc(m.per_card);
      const frac = m.per_card - whole;
      let d = whole;
      if (frac !== 0 && rng.next() < Math.abs(frac)) d += Math.sign(frac);
      if (d !== 0) setValue(content, state, ctx, m.key, getValue(state, m.key) + d);
    }
  }
  const anchor = ruleValue(ctx, 'allies_anchor');
  if (anchor) {
    const a = state.meters.allies;
    if (a < 50) setValue(content, state, ctx, 'allies', Math.min(50, a + anchor));
    else if (a > 50) setValue(content, state, ctx, 'allies', Math.max(50, a - anchor));
  }
  // Escalate-to-de-escalate: each limited strike raises the floor.
  if (hasRule(ctx, 'escalate_to_deescalate')) {
    const last = state.history[state.history.length - 1];
    if (last) {
      const card = content.cards[last.card];
      const c = card ? card[last.side === 'timeout' ? (card.timeout ?? 'right') : last.side] : null;
      if (c && c.tags.includes('limited_strike')) state.escalationFloor = Math.min(60, state.escalationFloor + 5);
    }
  }
}

// ------------------------------------------------------------------ scaling pieces

function grow(content: Content, state: RunState, trigger: ScaleTrigger, tags: readonly string[] | undefined, events: RunEvent[]): void {
  for (const id of state.pieces) {
    const p = content.pieces[id];
    if (!p) continue;
    for (const m of p.modifiers) {
      if (m.kind !== 'scale' || m.on !== trigger) continue;
      if (m.tags && m.tags.length && (!tags || !m.tags.some((t) => tags.includes(t)))) continue;
      const ps = (state.pieceState[id] ??= { mult: 0, base: 0, count: 0 });
      ps.count++;
      const cap = m.max ?? Infinity;
      if (m.mult_add) ps.mult = Math.round(Math.min(cap, ps.mult + m.mult_add) * 100) / 100;
      if (m.base_add) ps.base = Math.min(cap * 10, ps.base + m.base_add);
      events.push({ type: 'scale', piece: id, mult: ps.mult, base: ps.base });
    }
  }
}

// ------------------------------------------------------------------ endings

function thresholdTrigger(state: RunState): EndingTrigger | null {
  if (state.meters.escalation >= 100) return { type: 'meter', key: 'escalation', at: 100 };
  for (const k of ['public', 'military', 'allies', 'economy'] as MeterKey[]) {
    if (state.meters[k] <= 0) return { type: 'meter', key: k, at: 0 };
    if (state.meters[k] >= 100) return { type: 'meter', key: k, at: 100 };
  }
  return null;
}

function triggerMatches(a: EndingTrigger, b: EndingTrigger): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'meter' && b.type === 'meter') return a.key === b.key && a.at === b.at;
  return true;
}

export function pickEnding(content: Content, state: RunState, trigger: EndingTrigger): EndingDef | null {
  const pieces = heldPieces(content, state);
  let best: EndingDef | null = null;
  for (const id of content.endingOrder) {
    const e = content.endings[id];
    if (!triggerMatches(e.trigger, trigger)) continue;
    if (e.id.startsWith('fallback_')) continue;
    if (e.seats && !e.seats.includes(state.seat)) continue;
    if (!checkConditions(e.conditions, state, pieces)) continue;
    if (!best || e.priority > best.priority) best = e;
  }
  return best;
}

export function fallbackEndingId(trigger: EndingTrigger): string {
  if (trigger.type === 'meter') return trigger.key === 'escalation' ? 'fallback_nuclear' : `fallback_${trigger.key}_${trigger.at}`;
  if (trigger.type === 'run_end') return 'fallback_survival';
  return 'fallback_special';
}

function endRun(content: Content, state: RunState, endingId: string, events: RunEvent[]): void {
  const ending = content.endings[endingId] ?? content.endings.fallback_special;
  state.ending = ending ? ending.id : endingId;
  state.phase = 'ended';
  state.current = null;
  state.shop = null;
  state.accident = null;
  state.moment = findMoment(content, state, ending);
  const kind = ending?.kind ?? 'special';
  state.canContinue = kind === 'standdown' || kind === 'survival';
  events.push({ type: 'ending', id: state.ending, kind, canContinue: state.canContinue });
}

/**
 * "The moment it went wrong" (or held): the card that pushed hardest toward
 * the fatal outcome in the closing stretch — or, for a stand-down, the card
 * that pulled escalation down the most across the run.
 */
export function findMoment(content: Content, state: RunState, ending: EndingDef | undefined): string | null {
  const h = state.history;
  if (h.length === 0) return null;
  const last = h[h.length - 1];
  if (!ending) return last.card;
  const window = h.slice(-10);
  const scoreBy = (key: EffectKey, dir: 1 | -1) => {
    let best = last;
    let bestV = -Infinity;
    for (const e of window) {
      const v = ((e.applied[key] ?? 0) + (e.accident?.applied[key] ?? 0)) * dir;
      if (v > bestV) {
        bestV = v;
        best = e;
      }
    }
    return bestV > 0 ? best.card : last.card;
  };
  switch (ending.kind) {
    case 'nuclear':
      return scoreBy('escalation', 1);
    case 'removed': {
      const t = ending.trigger;
      if (t.type === 'meter') return scoreBy(t.key, t.at === 0 ? -1 : 1);
      return last.card;
    }
    case 'standdown': {
      let best = last;
      let bestV = 0;
      for (const e of h) {
        const v = -(e.applied.escalation ?? 0);
        if (v > bestV) {
          bestV = v;
          best = e;
        }
      }
      return best.card;
    }
    case 'survival': {
      // The biggest single score of the run: the moment the bluff held.
      let best = last;
      for (const e of h) if (e.leverage > best.leverage) best = e;
      return best.card;
    }
    default:
      return last.card;
  }
}

// ------------------------------------------------------------------ drawing

function activeArcs(content: Content, state: RunState): Set<string> {
  const s = new Set<string>();
  for (const q of state.queue) {
    const c = content.cards[q.card];
    if (c?.arc) s.add(c.arc);
  }
  return s;
}

function eligible(content: Content, state: RunState, card: CardDef, pieces: readonly PieceDef[]): boolean {
  if (card.chained || card.flashpoint || card.bluff) return false;
  if (state.act < card.acts[0] || (state.act <= content.acts.length && state.act > card.acts[1])) return false;
  if (card.seats && !card.seats.includes(state.seat)) return false;
  if (card.modes && !card.modes.includes(state.mode)) return false;
  if (card.once && state.seen.includes(card.id)) return false;
  if (!card.once && state.history.length && state.history[state.history.length - 1].card === card.id) return false;
  if (state.queue.some((q) => q.card === card.id)) return false;
  if (state.removedTags.length && card.tags.some((t) => state.removedTags.includes(t))) return false;
  return checkConditions(card.conditions, state, pieces);
}

function drawNext(content: Content, state: RunState, rng: Rng, events: RunEvent[]): void {
  if (state.phase !== 'card') return;
  const pieces = heldPieces(content, state);
  const act = actDef(content, state.act);

  // Queued follow-ups that are due come first, in order. Inside a flashpoint,
  // ordinary follow-ups stay in the queue (untouched) until it is over.
  for (let i = 0; i < state.queue.length; i++) {
    const q = state.queue[i];
    if (q.in > 0) continue;
    const card = content.cards[q.card];
    if (card && state.flashpoint && !card.flashpoint && !card.bluff) continue;
    state.queue.splice(i, 1);
    i--;
    if (!card) continue;
    // A flashpoint card can only surface inside its flashpoint.
    if (card.flashpoint && card.flashpoint !== state.flashpoint) continue;
    if (card.seats && !card.seats.includes(state.seat)) continue;
    if (!checkConditions(card.conditions, state, pieces)) continue;
    present(content, state, rng, card);
    return;
  }

  // Inside a flashpoint with nothing due: the flashpoint is over.
  if (state.flashpoint) {
    events.push({ type: 'flashpoint_end', id: state.flashpoint });
    state.flashpoint = null;
    grow(content, state, 'flashpoint_cleared', undefined, events);
    finishAct(content, state, rng, events);
    return;
  }

  // Act complete: settle the ante, then start the flashpoint. With no
  // flashpoint left for this act a called bluff is still dealt on its own.
  if (state.actCards >= act.cards) {
    if (endAct(content, state, rng, events)) return;
    finishAct(content, state, rng, events);
    return;
  }

  // Random draw.
  const arcs = activeArcs(content, state);
  const ctx: ModContext = { pieces, act, difficulty: difficultyDef(content, state.difficulty) };
  const ids: string[] = [];
  const weights: number[] = [];
  for (const id of content.cardOrder) {
    const card = content.cards[id];
    if (!eligible(content, state, card, pieces)) continue;
    let w = resolveWeight(card.weight, card.id, card.tags, ctx);
    if (card.arc && !arcs.has(card.arc) && arcs.size >= MAX_ACTIVE_ARCS) w *= 0.25;
    if (w <= 0) continue;
    ids.push(id);
    weights.push(w);
  }
  const idx = rng.weightedIndex(weights);
  if (idx < 0) {
    // Content gap: allow repeats of any act-appropriate card whose conditions hold (ignoring `once`).
    const lastId = state.history.length ? state.history[state.history.length - 1].card : null;
    const fallback = content.cardOrder.filter((id) => {
      const c = content.cards[id];
      if (c.chained || c.flashpoint || c.bluff || c.warning || id === lastId) return false;
      if (state.act < c.acts[0] || (state.act <= content.acts.length && state.act > c.acts[1])) return false;
      if (c.seats && !c.seats.includes(state.seat)) return false;
      if (c.modes && !c.modes.includes(state.mode)) return false;
      if (state.removedTags.length && c.tags.some((t) => state.removedTags.includes(t))) return false;
      return checkConditions(c.conditions, state, pieces);
    });
    if (fallback.length === 0) {
      if (endAct(content, state, rng, events)) return;
      finishAct(content, state, rng, events);
      return;
    }
    present(content, state, rng, content.cards[rng.pick(fallback)]);
    return;
  }
  present(content, state, rng, content.cards[ids[idx]]);
}

function present(content: Content, state: RunState, rng: Rng, card: CardDef): void {
  state.current = card.id;
  state.truth = null;
  state.accident = null;
  const ctx = ctxFor(content, state);
  if (card.warning) {
    let p = resolveIntel(state.hidden.intel, ctx) / 100 + (card.warning.bias ?? 0);
    const floor = ruleValue(ctx, 'warning_floor');
    if (floor) p = Math.max(p, floor / 100);
    state.truth = rng.next() < clamp(p, 0.05, 0.98);
  }
  // Accidents: the price of living near the top of the curve.
  if (!card.flashpoint && !card.bluff) {
    const { pMult } = accidentModifiers(ctx.pieces);
    const p = Math.round(clamp(accidentChance(state.meters.escalation) * pMult, 0, 0.9) * 100) / 100;
    if (p > 0 && rng.next() < 0.75) {
      const type: AccidentType = ACCIDENT_TYPES[rng.int(ACCIDENT_TYPES.length)];
      const known = hasRule(ctx, 'perfect_intel') ? rng.next() < p : null;
      state.accident = { type, p, known } satisfies AccidentState;
    }
  }
}

/**
 * Settle the ante once per act and open the flashpoint. Returns true when a
 * card was presented (flashpoint entry or a standalone bluff card) and false
 * when the act should simply finish.
 */
function endAct(content: Content, state: RunState, rng: Rng, events: RunEvent[]): boolean {
  if (state.anteSettled) return false;
  const bluff = settleAnte(content, state, events);
  if (startFlashpoint(content, state, rng, events, bluff)) {
    drawNext(content, state, rng, events);
    return true;
  }
  if (bluff) {
    const bluffCard = pickBluffCard(content, state, rng, heldPieces(content, state));
    if (bluffCard) {
      state.queue.unshift({ card: bluffCard, in: 0 });
      drawNext(content, state, rng, events);
      return true;
    }
  }
  return false;
}

/** Compare accumulated leverage with the act's target. Returns true when the bluff is called. */
function settleAnte(content: Content, state: RunState, events: RunEvent[]): boolean {
  state.anteSettled = true;
  const target = state.actTarget;
  const r = anteReward(state.actLeverage, target, state.act);
  events.push({ type: 'ante', met: r.met, smashed: r.smashed, leverage: state.actLeverage, target, capital: r.capital });
  if (r.met) {
    state.stats.antesMet++;
    addFlag(state, 'ante:met');
    addCapital(state, r.capital, 'ante', events);
    grow(content, state, 'ante_met', undefined, events);
    if (r.smashed) {
      state.stats.antesSmashed++;
      addFlag(state, 'ante:smashed');
      if (state.stats.antesSmashed >= 3) addFlag(state, 'ante:smashed_x3');
      grow(content, state, 'ante_smashed', undefined, events);
    }
    return false;
  }
  state.stats.antesMissed++;
  addFlag(state, 'ante:missed');
  if (state.stats.antesMissed >= 2) addFlag(state, 'ante:missed_x2');
  return true;
}

function startFlashpoint(content: Content, state: RunState, rng: Rng, events: RunEvent[], bluff: boolean): boolean {
  const pieces = heldPieces(content, state);
  const falseAlarm = activeFlags(state, pieces).has('false_alarm_live');
  const ids: string[] = [];
  const weights: number[] = [];
  const actIndex = Math.min(state.act, content.acts.length);
  for (const id of Object.keys(content.flashpoints)) {
    const fp = content.flashpoints[id];
    if (actIndex < fp.acts[0] || actIndex > fp.acts[1]) continue;
    if (state.flashpointsUsed.includes(id) && !state.endless) continue;
    if (!checkConditions(fp.conditions, state, pieces)) continue;
    let w = fp.weight;
    if (falseAlarm && fp.false_alarm_entry) w *= 4;
    ids.push(id);
    weights.push(w);
  }
  const idx = rng.weightedIndex(weights);
  if (idx < 0) return false;
  const fp: FlashpointDef = content.flashpoints[ids[idx]];
  state.flashpoint = fp.id;
  if (!state.flashpointsUsed.includes(fp.id)) state.flashpointsUsed.push(fp.id);
  const entry = falseAlarm && fp.false_alarm_entry ? fp.false_alarm_entry : fp.entry;
  state.queue.unshift({ card: entry, in: 0 });
  if (bluff) {
    const bluffCard = fp.bluff_entry ?? pickBluffCard(content, state, rng, pieces);
    if (bluffCard) state.queue.unshift({ card: bluffCard, in: 0 });
  }
  events.push({ type: 'flashpoint_start', id: fp.id, name: fp.name });
  return true;
}

function pickBluffCard(content: Content, state: RunState, rng: Rng, pieces: readonly PieceDef[]): string | null {
  const ids: string[] = [];
  const weights: number[] = [];
  for (const id of content.cardOrder) {
    const c = content.cards[id];
    if (!c.bluff) continue;
    if (c.seats && !c.seats.includes(state.seat)) continue;
    if (state.seen.includes(id)) continue;
    if (!checkConditions(c.conditions, state, pieces)) continue;
    ids.push(id);
    weights.push(c.weight);
  }
  const i = rng.weightedIndex(weights);
  return i < 0 ? null : ids[i];
}

function finishAct(content: Content, state: RunState, rng: Rng, events: RunEvent[]): void {
  if (state.act >= content.acts.length && !state.endless) {
    const e = pickEnding(content, state, { type: 'run_end' });
    endRun(content, state, e?.id ?? (state.meters.escalation <= STANDDOWN_THRESHOLD ? 'fallback_standdown' : 'fallback_survival'), events);
    return;
  }
  openShop(content, state, rng, false, events);
}

// ------------------------------------------------------------------ shop

function isUnlocked(state: RunState, piece: PieceDef): boolean {
  if (!piece.unlock) return true;
  return state.flags.includes('unlocked:all') || state.flags.includes(`unlocked:${piece.unlock.id}`);
}

function shopPrice(ctx: ModContext, base: number): number {
  const disc = ruleValue(ctx, 'shop_discount', 1);
  return Math.max(1, Math.round(base * disc));
}

function offerCandidates(content: Content, state: RunState): { id: string; w: number }[] {
  const out: { id: string; w: number }[] = [];
  for (const id of content.pieceOrder) {
    const p = content.pieces[id];
    if (state.pieces.includes(id)) continue;
    if (state.shop && state.shop.offers.some((o) => o.piece === id && !o.sold)) continue;
    if (p.seats && !p.seats.includes(state.seat)) continue;
    if (p.min_act && state.act + (state.shop?.mid ? 0 : 1) < p.min_act) continue;
    if (!isUnlocked(state, p)) continue;
    if (p.excludes && p.excludes.some((x) => state.pieces.includes(x))) continue;
    if (state.pieces.some((h) => content.pieces[h]?.excludes?.includes(id))) continue;
    out.push({ id, w: RARITY_WEIGHT[p.rarity] * p.offer_weight });
  }
  return out;
}

function rollOffers(content: Content, state: RunState, rng: Rng, ctx: ModContext): void {
  const shop = state.shop!;
  const count = 4 + ruleValue(ctx, 'extra_offer');
  const pool = offerCandidates(content, state);
  const offers: typeof shop.offers = [];
  while (offers.length < count && pool.length > 0) {
    const i = rng.weightedIndex(pool.map((x) => x.w));
    if (i < 0) break;
    const p = content.pieces[pool[i].id];
    offers.push({ piece: p.id, price: shopPrice(ctx, p.price), sold: false });
    pool.splice(i, 1);
  }
  shop.offers = offers;
  const orderPool = content.orderOrder.map((id) => ({ id, w: RARITY_WEIGHT[content.orders[id].rarity] }));
  const orders: typeof shop.orders = [];
  while (orders.length < 2 && orderPool.length > 0) {
    const i = rng.weightedIndex(orderPool.map((x) => x.w));
    if (i < 0) break;
    const o = content.orders[orderPool[i].id];
    orders.push({ order: o.id, price: shopPrice(ctx, o.price), sold: false });
    orderPool.splice(i, 1);
  }
  shop.orders = orders;
}

function openShop(content: Content, state: RunState, rng: Rng, mid: boolean, events: RunEvent[]): void {
  const ctx = ctxFor(content, state);
  state.phase = 'shop';
  state.current = null;
  state.accident = null;
  state.shop = { offers: [], orders: [], rerolls: 0, mid, removed: [] };
  rollOffers(content, state, rng, ctx);
  events.push({ type: 'shop', mid });
}

export function rerollCost(state: RunState, ctx: ModContext): number {
  if (!state.shop) return 0;
  const free = ruleValue(ctx, 'free_rerolls');
  if (state.shop.rerolls < free) return 0;
  return REROLL_BASE + (state.shop.rerolls - free);
}

export function sellPrice(content: Content, state: RunState, pieceId: string): number {
  const p = content.pieces[pieceId];
  if (!p) return 0;
  const ctx = ctxFor(content, state);
  const frac = ruleValue(ctx, 'sell_bonus', 0.5);
  return Math.max(1, Math.floor(p.price * frac));
}

export function buyPiece(content: Content, state: RunState, index: number): StepResult {
  const events: RunEvent[] = [];
  if (state.phase !== 'shop' || !state.shop) return { state, events };
  const offer = state.shop.offers[index];
  if (!offer || offer.sold) return { state, events };
  const ctx = ctxFor(content, state);
  if (state.capital < offer.price || state.pieces.length >= maxPieces(ctx)) return { state, events };
  addCapital(state, -offer.price, 'buy', events);
  offer.sold = true;
  state.pieces.push(offer.piece);
  addFlag(state, `piece:${offer.piece}`);
  applyReveals(content, state, events);
  return { state, events };
}

export function sellPiece(content: Content, state: RunState, pieceId: string): StepResult {
  const events: RunEvent[] = [];
  if (state.phase !== 'shop' || !state.shop || !state.pieces.includes(pieceId)) return { state, events };
  addCapital(state, sellPrice(content, state, pieceId), 'sell', events);
  state.pieces = state.pieces.filter((p) => p !== pieceId);
  delete state.pieceState[pieceId];
  state.flags = state.flags.filter((f) => f !== `piece:${pieceId}`);
  return { state, events };
}

export function rerollShop(content: Content, state: RunState): StepResult {
  const events: RunEvent[] = [];
  if (state.phase !== 'shop' || !state.shop) return { state, events };
  const ctx = ctxFor(content, state);
  const cost = rerollCost(state, ctx);
  if (state.capital < cost) return { state, events };
  addCapital(state, -cost, 'reroll', events);
  state.shop.rerolls++;
  const rng = rngOf(state);
  rollOffers(content, state, rng, ctx);
  saveRng(state, rng);
  return { state, events };
}

export function buyOrder(content: Content, state: RunState, index: number): StepResult {
  const events: RunEvent[] = [];
  if (state.phase !== 'shop' || !state.shop) return { state, events };
  const offer = state.shop.orders[index];
  if (!offer || offer.sold) return { state, events };
  const ctx = ctxFor(content, state);
  if (state.capital < offer.price || state.orders.length >= maxOrders(ctx)) return { state, events };
  addCapital(state, -offer.price, 'buy_order', events);
  offer.sold = true;
  state.orders.push(offer.order);
  return { state, events };
}

export function removeTag(content: Content, state: RunState, tag: string): StepResult {
  const events: RunEvent[] = [];
  if (state.phase !== 'shop' || !state.shop) return { state, events };
  if (!REMOVABLE_TAGS.includes(tag) || state.removedTags.includes(tag) || state.shop.removed.length >= 1) return { state, events };
  if (state.capital < REMOVE_TAG_PRICE) return { state, events };
  addCapital(state, -REMOVE_TAG_PRICE, 'remove_tag', events);
  state.removedTags.push(tag);
  state.shop.removed.push(tag);
  return { state, events };
}

export function leaveShop(content: Content, state: RunState): StepResult {
  const events: RunEvent[] = [];
  if (state.phase !== 'shop' || !state.shop) return { state, events };
  const mid = state.shop.mid;
  state.shop = null;
  const rng = rngOf(state);
  if (mid) {
    state.phase = 'card';
    drawNext(content, state, rng, events);
  } else beginAct(content, state, rng, events);
  saveRng(state, rng);
  return { state, events };
}

/** Continue past a winning ending into endless acts with rising targets. */
export function continueRun(content: Content, state: RunState): StepResult {
  const events: RunEvent[] = [];
  if (state.phase !== 'ended' || !state.canContinue) return { state, events };
  state.endless = true;
  state.canContinue = false;
  state.ending = null;
  state.moment = null;
  addFlag(state, 'endless');
  const rng = rngOf(state);
  openShop(content, state, rng, false, events);
  saveRng(state, rng);
  return { state, events };
}

function beginAct(content: Content, state: RunState, rng: Rng, events: RunEvent[]): void {
  state.act++;
  state.actCards = 0;
  state.actLeverage = 0;
  state.midShopDone = false;
  state.anteSettled = false;
  state.phase = 'card';
  const diff = difficultyDef(content, state.difficulty);
  state.actTarget = actTarget(content, state.act, diff.target_scale ?? 1);
  resetCharges(content, state);
  const ctx = ctxFor(content, state);
  const perAct = ruleValue(ctx, 'capital_per_act');
  if (perAct) addCapital(state, perAct, 'act', events);
  grow(content, state, 'act_start', undefined, events);
  const act = actDef(content, state.act);
  events.push({ type: 'act_start', act: state.act, name: act.name, target: state.actTarget });
  drawNext(content, state, rng, events);
}

// ------------------------------------------------------------------ orders (consumables)

export function useOrder(content: Content, state: RunState, index: number): StepResult {
  const events: RunEvent[] = [];
  if (state.phase !== 'card' || !state.current) return { state, events };
  const id = state.orders[index];
  const order: OrderDef | undefined = id ? content.orders[id] : undefined;
  if (!order) return { state, events };
  const ctx = ctxFor(content, state);
  const rng = rngOf(state);
  const e = order.effect;
  let consumed = true;
  switch (e.type) {
    case 'meter': {
      const before = getValue(state, e.key);
      setValue(content, state, ctx, e.key, before + e.delta);
      const after = getValue(state, e.key);
      events.push({ type: 'effects', applied: { [e.key]: after - before } });
      break;
    }
    case 'retrigger_next':
      state.nextRetrigger += e.times ?? 1;
      break;
    case 'mult_next':
      state.nextMult *= e.mult;
      break;
    case 'reveal':
      if (!state.revealed.includes(e.key)) {
        state.revealed.push(e.key);
        events.push({ type: 'reveal', key: e.key });
      }
      break;
    case 'skip_accident':
      if (!state.accident) consumed = false;
      state.accident = null;
      break;
    case 'bury': {
      const card = content.cards[state.current];
      if (card.flashpoint) {
        consumed = false;
        break;
      }
      markSeen(state, card.id);
      state.truth = null;
      state.accident = null;
      drawNext(content, state, rng, events);
      break;
    }
    case 'capital':
      addCapital(state, e.delta, 'order', events);
      break;
    case 'charge':
      state.charges[e.charge] += e.count;
      break;
    case 'leverage':
      state.score += e.amount;
      state.actLeverage += e.amount;
      break;
  }
  if (consumed) {
    state.orders.splice(index, 1);
    events.push({ type: 'order_used', order: order.id });
  }
  saveRng(state, rng);
  return { state, events };
}

// ------------------------------------------------------------------ serialisation

export function serialise(state: RunState): string {
  return JSON.stringify(state);
}

export function deserialise(json: string): RunState {
  const s = JSON.parse(json) as RunState;
  if (s.v !== 2) throw new Error('Unsupported run state version');
  if (typeof s.anteSettled !== 'boolean') s.anteSettled = false;
  return s;
}

/** Human-readable read of a hidden value, for advisor language. */
export function describeHidden(key: HiddenKey, v: number): string {
  if (key === 'intel') return v >= 75 ? 'high confidence' : v >= 55 ? 'moderate confidence' : v >= 35 ? 'low confidence' : 'guesswork';
  if (key === 'commitment') return v >= 75 ? 'boxed in' : v >= 50 ? 'on the record' : v >= 25 ? 'some room' : 'free hands';
  return v >= 75 ? 'they believe you' : v >= 50 ? 'wary' : v >= 25 ? 'suspicious' : 'they expect the worst';
}
