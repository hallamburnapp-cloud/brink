/**
 * The run state machine. Pure and deterministic: every function takes the
 * content and a RunState, mutates the state in place (for speed in the
 * simulator) and returns it with a list of events for the UI and audio.
 * Serialising the state with JSON.stringify and continuing later yields
 * identical results because the RNG state travels with it.
 */
import { Rng } from './rng';
import {
  METERS,
  HIDDEN,
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
  type OutcomeDef,
  type PieceDef,
  type RollResult,
  type RunEvent,
  type RunState,
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
  return content.acts[Math.min(Math.max(act, 1), content.acts.length) - 1];
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

/** Replace {us}, {rival}, {other}, {leader}, {capital}, {rival_adj}, {us_adj} in card text. */
export function template(content: Content, state: RunState, text: string): string {
  const seat = content.seats[state.seat];
  const rival = content.seats[seat.rivals[0]];
  const other = content.seats[seat.rivals[1]];
  const map: Record<string, string> = {
    us: seat.the,
    Us: cap(seat.the),
    rival: rival.the,
    Rival: cap(rival.the),
    other: other.the,
    Other: cap(other.the),
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
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in map ? map[k] : m));
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
    v: 1,
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
    seen: [],
    queue: [],
    phase: 'card',
    current: null,
    truth: null,
    offer: null,
    flashpoint: null,
    flashpointsUsed: [],
    ending: null,
    moment: null,
    history: [],
    trail: [],
    charges: { deescalation: 0, removal: 0 },
    escalationFloor: 0,
    revealed: [],
    stats: { rolls: 0, nearMisses: 0, timeouts: 0, falseAlarms: 0, trueWarnings: 0 },
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
  return { side, text: template(content, state, choice.text), preview, hiddenCosts, odds, tags: choice.tags, usesCharge };
}

function wouldUseCharge(state: RunState, choice: ChoiceDef, ctx: ModContext): boolean {
  return choice.spend_charge === 'deescalation' && state.charges.deescalation > 0 && hasRule(ctx, 'free_deescalation_per_act');
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
  if (choice.tags.includes('walk_back') && (e.public ?? 0) < 0) {
    const lock = ruleValue(ctx, 'commitment_lock', 1);
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

  // 1. Effects (with charge + commitment trap), through the resolver.
  const usesCharge = wouldUseCharge(state, choice, ctx);
  if (usesCharge) {
    state.charges.deescalation--;
    events.push({ type: 'charge_used', charge: 'deescalation' });
  }
  const applied = applyEffects(content, state, rng, effectiveBase(state, choice, ctx, usesCharge), choice.tags, ctx);
  events.push({ type: 'effects', applied });

  const entry: HistoryEntry = { card: card.id, side, act: state.act, day: state.day, applied: { ...applied } };
  let forcedEnding: string | undefined = choice.ending;

  // 2. Odds roll.
  if (choice.odds) {
    const o = resolveOdds(choice.odds.base, choice.odds.tags, ctx, state.hidden);
    const r = rng.roll(o.p);
    const margin = Math.abs(o.p - r.roll) * 100;
    const result: RollResult = {
      label: choice.odds.label,
      p: o.p,
      roll: r.roll,
      success: r.success,
      margin,
      nearMiss: margin < NEAR_MISS_MARGIN,
    };
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
    applyFlags(state, outcome.set, outcome.clear, events);
    queueFollows(state, rng, outcome.follow, !!card.flashpoint);
    if (outcome.ending) forcedEnding = outcome.ending;
  }

  // 3. Flags, reveals, follow-ups.
  applyFlags(state, choice.set, choice.clear, events);
  if (choice.reveal && !state.revealed.includes(choice.reveal)) {
    state.revealed.push(choice.reveal);
    events.push({ type: 'reveal', key: choice.reveal });
  }
  queueFollows(state, rng, choice.follow, !!card.flashpoint);

  // 4. Warning resolution: the truth was decided on draw; the right branch is queued now.
  if (card.warning && state.truth !== null) {
    entry.truth = state.truth;
    const w = card.warning;
    state.queue.push({ card: state.truth ? w.true_follow : w.false_follow, in: w.in });
    if (state.truth) state.stats.trueWarnings++;
    else state.stats.falseAlarms++;
    events.push({ type: 'warning', truth: state.truth });
  }
  state.truth = null;

  // 5. Bookkeeping.
  markSeen(state, card.id);
  state.history.push(entry);
  state.cardsPlayed++;
  if (card.flashpoint) state.day += FLASHPOINT_DAY_PER_CARD;
  else {
    state.actCards++;
    state.day += act.day_per_card;
  }
  if (card.arc) addFlag(state, `arc:${card.arc}`);
  state.trail.push([state.meters.public, state.meters.military, state.meters.allies, state.meters.economy, state.meters.escalation]);

  // 6. Passive drift from doctrines and advisors.
  applyDrift(content, state, rng, ctx);

  // 7. Endings.
  if (forcedEnding) {
    endRun(content, state, forcedEnding, events);
    saveRng(state, rng);
    return { state, events };
  }
  const trig = thresholdTrigger(state);
  if (trig) {
    endRun(content, state, pickEnding(content, state, trig)?.id ?? fallbackEndingId(trig), events);
    saveRng(state, rng);
    return { state, events };
  }

  // 8. Tick queue and draw.
  tickQueue(state);
  drawNext(content, state, rng, events);
  saveRng(state, rng);
  return { state, events };
}

/** Chief-of-Staff Fixer: bury the current card without playing it. */
export function buryCard(content: Content, state: RunState): StepResult {
  const events: RunEvent[] = [];
  if (state.phase !== 'card' || !state.current || state.charges.removal <= 0) return { state, events };
  const card = content.cards[state.current];
  if (card.flashpoint) return { state, events };
  state.charges.removal--;
  markSeen(state, card.id);
  state.truth = null;
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

function applyFlags(state: RunState, set: string[] | undefined, clear: string[] | undefined, events: RunEvent[]): void {
  const s = set ?? [];
  const c = clear ?? [];
  if (s.length === 0 && c.length === 0) return;
  for (const f of s) addFlag(state, f);
  if (c.length) state.flags = state.flags.filter((f) => !c.includes(f));
  events.push({ type: 'flag', set: s, clear: c });
}

function queueFollows(state: RunState, rng: Rng, follows: import('./types').FollowDef[] | undefined, fromFlashpoint: boolean): void {
  if (!follows) return;
  for (const f of follows) {
    if (f.chance !== undefined && rng.next() >= f.chance) continue;
    if (state.queue.some((q) => q.card === f.card) || state.seen.includes(f.card)) continue;
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
      // A ceiling below 100 means the doctrine caps escalation; hitting the ceiling is still not war.
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
      const c = card && last.side !== 'timeout' ? card[last.side] : card ? card[card.timeout ?? 'right'] : null;
      if (c && c.tags.includes('limited_strike')) state.escalationFloor = Math.min(60, state.escalationFloor + 5);
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
  state.offer = null;
  state.moment = findMoment(content, state, ending);
  events.push({ type: 'ending', id: state.ending, kind: ending?.kind ?? 'special' });
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
      const v = (e.applied[key] ?? 0) * dir;
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
  if (card.chained || card.flashpoint) return false;
  if (state.act < card.acts[0] || state.act > card.acts[1]) return false;
  if (card.seats && !card.seats.includes(state.seat)) return false;
  if (card.modes && !card.modes.includes(state.mode)) return false;
  if (card.once && state.seen.includes(card.id)) return false;
  if (!card.once && state.history.length && state.history[state.history.length - 1].card === card.id) return false;
  if (state.queue.some((q) => q.card === card.id)) return false;
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
    if (card && state.flashpoint && !card.flashpoint) continue;
    state.queue.splice(i, 1);
    i--;
    if (!card) continue;
    if (card.seats && !card.seats.includes(state.seat)) continue;
    if (!checkConditions(card.conditions, state, pieces)) continue;
    present(content, state, rng, card);
    return;
  }

  // Inside a flashpoint with nothing due: the flashpoint is over.
  if (state.flashpoint) {
    events.push({ type: 'flashpoint_end', id: state.flashpoint });
    state.flashpoint = null;
    finishAct(content, state, rng, events);
    return;
  }

  // Act complete: start the flashpoint.
  if (state.actCards >= act.cards) {
    if (startFlashpoint(content, state, rng, events)) {
      drawNext(content, state, rng, events);
      return;
    }
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
  let idx = rng.weightedIndex(weights);
  if (idx < 0) {
    // Content gap: allow repeats of any act-appropriate card whose conditions hold (ignoring `once`).
    const lastId = state.history.length ? state.history[state.history.length - 1].card : null;
    const fallback = content.cardOrder.filter((id) => {
      const c = content.cards[id];
      if (c.chained || c.flashpoint || c.warning || id === lastId) return false;
      if (state.act < c.acts[0] || state.act > c.acts[1]) return false;
      if (c.seats && !c.seats.includes(state.seat)) return false;
      return checkConditions(c.conditions, state, pieces);
    });
    if (fallback.length === 0) {
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
  if (card.warning) {
    const ctx = ctxFor(content, state);
    let p = resolveIntel(state.hidden.intel, ctx) / 100 + (card.warning.bias ?? 0);
    const floor = ruleValue(ctx, 'warning_floor');
    if (floor) p = Math.max(p, floor / 100);
    state.truth = rng.next() < clamp(p, 0.05, 0.98);
  }
}

function startFlashpoint(content: Content, state: RunState, rng: Rng, events: RunEvent[]): boolean {
  const pieces = heldPieces(content, state);
  const falseAlarm = activeFlags(state, pieces).has('false_alarm_live');
  const ids: string[] = [];
  const weights: number[] = [];
  for (const id of Object.keys(content.flashpoints)) {
    const fp = content.flashpoints[id];
    if (state.act < fp.acts[0] || state.act > fp.acts[1]) continue;
    if (state.flashpointsUsed.includes(id)) continue;
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
  state.flashpointsUsed.push(fp.id);
  const entry = falseAlarm && fp.false_alarm_entry ? fp.false_alarm_entry : fp.entry;
  state.queue.unshift({ card: entry, in: 0 });
  events.push({ type: 'flashpoint_start', id: fp.id, name: fp.name });
  return true;
}

function finishAct(content: Content, state: RunState, rng: Rng, events: RunEvent[]): void {
  if (state.act >= content.acts.length) {
    const e = pickEnding(content, state, { type: 'run_end' });
    endRun(content, state, e?.id ?? (state.meters.escalation <= STANDDOWN_THRESHOLD ? 'fallback_standdown' : 'fallback_survival'), events);
    return;
  }
  const offer = makeOffer(content, state, rng);
  if (offer.length === 0) {
    beginAct(content, state, rng, events);
    return;
  }
  state.phase = 'offer';
  state.current = null;
  state.offer = offer;
  events.push({ type: 'offer', pieces: offer });
}

function isUnlocked(state: RunState, piece: PieceDef): boolean {
  if (!piece.unlock) return true;
  return state.flags.includes('unlocked:all') || state.flags.includes(`unlocked:${piece.unlock.id}`);
}

/** Three pieces, one per pool where possible, weighted by offer_weight. */
export function makeOffer(content: Content, state: RunState, rng: Rng): string[] {
  const byPool: Record<string, { id: string; w: number }[]> = { advisor: [], doctrine: [], asset: [] };
  for (const id of content.pieceOrder) {
    const p = content.pieces[id];
    if (state.pieces.includes(id)) continue;
    if (p.seats && !p.seats.includes(state.seat)) continue;
    if (p.min_act && state.act + 1 < p.min_act) continue;
    if (!isUnlocked(state, p)) continue;
    if (p.excludes && p.excludes.some((x) => state.pieces.includes(x))) continue;
    if (state.pieces.some((h) => content.pieces[h]?.excludes?.includes(id))) continue;
    byPool[p.pool].push({ id, w: p.offer_weight });
  }
  const pools = rng.shuffle(['advisor', 'doctrine', 'asset']);
  const out: string[] = [];
  for (const pool of pools) {
    const list = byPool[pool];
    if (list.length === 0) continue;
    const i = rng.weightedIndex(list.map((x) => x.w));
    if (i < 0) continue;
    out.push(list[i].id);
    list.splice(i, 1);
  }
  // Top up from any pool if a pool was empty.
  const rest = ([] as { id: string; w: number }[]).concat(byPool.advisor, byPool.doctrine, byPool.asset);
  while (out.length < 3 && rest.length > 0) {
    const i = rng.weightedIndex(rest.map((x) => x.w));
    if (i < 0) break;
    out.push(rest[i].id);
    rest.splice(i, 1);
  }
  return out;
}

export function pickPiece(content: Content, state: RunState, pieceId: string): StepResult {
  const events: RunEvent[] = [];
  if (state.phase !== 'offer' || !state.offer || !state.offer.includes(pieceId)) return { state, events };
  state.pieces.push(pieceId);
  state.offer = null;
  addFlag(state, `piece:${pieceId}`);
  const rng = rngOf(state);
  applyReveals(content, state, events);
  beginAct(content, state, rng, events);
  saveRng(state, rng);
  return { state, events };
}

function beginAct(content: Content, state: RunState, rng: Rng, events: RunEvent[]): void {
  state.act++;
  state.actCards = 0;
  state.phase = 'card';
  resetCharges(content, state);
  const act = actDef(content, state.act);
  events.push({ type: 'act_start', act: state.act, name: act.name });
  drawNext(content, state, rng, events);
}

// ------------------------------------------------------------------ serialisation

export function serialise(state: RunState): string {
  return JSON.stringify(state);
}

export function deserialise(json: string): RunState {
  const s = JSON.parse(json) as RunState;
  if (s.v !== 1) throw new Error('Unsupported run state version');
  return s;
}

/** Human-readable read of a hidden value, for advisor language. */
export function describeHidden(key: HiddenKey, v: number): string {
  if (key === 'intel') return v >= 75 ? 'high confidence' : v >= 55 ? 'moderate confidence' : v >= 35 ? 'low confidence' : 'guesswork';
  if (key === 'commitment') return v >= 75 ? 'boxed in' : v >= 50 ? 'on the record' : v >= 25 ? 'some room' : 'free hands';
  return v >= 75 ? 'they believe you' : v >= 50 ? 'wary' : v >= 25 ? 'suspicious' : 'they expect the worst';
}
