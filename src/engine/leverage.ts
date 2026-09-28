/**
 * Brinkmanship scaling: LEVERAGE, the escalation multiplier curve, accidents,
 * antes and political capital. Pure functions over content + state.
 *
 * Resolution order for a choice (ENGINE.md §Leverage):
 *   1. base       = printed base + Σ base additions (pieces, run-grown bonuses)
 *   2. mult       = 1 + Σ mult additions (pieces, run-grown bonuses, orders)
 *   3. mult      ×= Π mult multipliers (pieces, orders)
 *   4. escMult    = curve(escalation) [× endless climb]
 *   5. retriggers = Σ retrigger pieces + queued order retriggers
 *   total = round(base × mult × escMult × (1 + retriggers))
 */
import type { AccidentType, ActDef, ChoiceDef, ConditionDef, Content, Effects, LeverageBreakdown, LeverageTerm, ModifierDef, PieceDef, RunState } from './types';
import { checkConditions } from './conditions';

// ------------------------------------------------------------------ escalation multiplier

/** Piecewise-linear curve: ×1 at 0–29, ×2 at 50, ×5 at 80, ×12 at 95, ×20 at 99. */
export const ESC_CURVE: [number, number][] = [
  [0, 1],
  [29, 1],
  [50, 2],
  [80, 5],
  [95, 12],
  [99, 20],
  [100, 20],
];

/** Per-endless-act multiplier on the escalation curve. */
export const ENDLESS_CLIMB = 2;

export function escalationMultiplier(escalation: number, endlessActs = 0): number {
  const e = Math.max(0, Math.min(100, escalation));
  let m = 1;
  for (let i = 1; i < ESC_CURVE.length; i++) {
    const [x0, y0] = ESC_CURVE[i - 1];
    const [x1, y1] = ESC_CURVE[i];
    if (e <= x1) {
      m = x1 === x0 ? y1 : y0 + ((e - x0) / (x1 - x0)) * (y1 - y0);
      break;
    }
  }
  // Endless: the curve keeps climbing, ×2 per act past the Endgame (scores are meant to explode).
  if (endlessActs > 0) m *= Math.pow(ENDLESS_CLIMB, endlessActs);
  return Math.round(m * 100) / 100;
}

// ------------------------------------------------------------------ antes

/** Leverage target for an act (acts past 5 grow ×2.8 each). */
export function actTarget(content: Content, act: number, difficultyScale = 1): number {
  const acts = content.acts;
  if (act <= acts.length) return Math.round(acts[act - 1].target * difficultyScale);
  const last = acts[acts.length - 1].target;
  return Math.round(last * Math.pow(2.8, act - acts.length) * difficultyScale);
}

/** Political capital for meeting an ante: 4 + act, plus 1 per extra 50% of target over 100% (max +4). */
/** Political capital paid at the start of every act after the first: the budget that lets a build grow even after a called bluff. */
export const ACT_STIPEND = 2;
/** A missed ante still pays this when at least CONSOLATION_RATIO of the target was reached (the room saw you try). */
export const CONSOLATION = 2;
export const CONSOLATION_RATIO = 0.5;

export function anteReward(leverage: number, target: number, act: number): { met: boolean; smashed: boolean; capital: number } {
  const ratio = leverage / Math.max(1, target);
  if (leverage < target) return { met: false, smashed: false, capital: ratio >= CONSOLATION_RATIO ? CONSOLATION : 0 };
  const bonus = Math.min(4, Math.floor((ratio - 1) / 0.5));
  return { met: true, smashed: ratio >= 2, capital: 4 + Math.min(act, 5) + bonus };
}

// ------------------------------------------------------------------ base derivation (authoring default)

const ESCALATORY = new Set(['escalatory', 'strike', 'limited_strike', 'mobilise', 'deterrence', 'military', 'blockade', 'public_commitment', 'sanction', 'probe']);
const DIPLOMATIC = new Set(['deescalate', 'concede', 'reassurance', 'back_channel', 'diplomacy', 'transparency', 'walk_back']);

/**
 * Printed base leverage when the author leaves it out: the size of the move.
 * Escalatory moves are worth more raw leverage; diplomacy scales from trust
 * through pieces instead (the stand-down path).
 */
export function deriveBase(effects: Effects, tags: readonly string[], odds?: { base: number }): number {
  let size = 0;
  for (const [k, v] of Object.entries(effects)) {
    if (!v) continue;
    size += k === 'escalation' ? Math.abs(v) * 1.5 : Math.abs(v);
  }
  let base = 6 + size * 0.8;
  if (tags.some((t) => ESCALATORY.has(t))) base *= 1.35;
  else if (tags.some((t) => DIPLOMATIC.has(t))) base *= 0.9;
  if (odds) base *= 1.15;
  return Math.max(4, Math.min(40, Math.round(base)));
}

// ------------------------------------------------------------------ leverage

function tagsMatch(filter: string[] | undefined, tags: readonly string[]): boolean {
  if (!filter || filter.length === 0) return true;
  for (const t of filter) if (tags.includes(t)) return true;
  return false;
}

function whenHolds(when: ConditionDef | undefined, state: RunState, pieces: readonly PieceDef[]): boolean {
  if (!when) return true;
  if (when.act) {
    if (when.act.min !== undefined && state.act < when.act.min) return false;
    if (when.act.max !== undefined && state.act > when.act.max) return false;
  }
  return checkConditions(when, state, pieces);
}

function valueOf(state: RunState, key: string): number {
  return key in state.meters ? state.meters[key as keyof typeof state.meters] : state.hidden[key as keyof typeof state.hidden];
}

export function computeLeverage(content: Content, state: RunState, choice: ChoiceDef, pieces: readonly PieceDef[]): LeverageBreakdown {
  const tags = choice.tags;
  const baseTerms: LeverageTerm[] = [{ source: 'card', value: choice.base }];
  const multAddTerms: LeverageTerm[] = [];
  const multMultTerms: LeverageTerm[] = [];
  const retriggerTerms: LeverageTerm[] = [];

  for (const p of pieces) {
    const grown = state.pieceState[p.id];
    if (grown && grown.base) baseTerms.push({ source: `${p.name} (grown)`, value: grown.base });
    if (grown && grown.mult) multAddTerms.push({ source: `${p.name} (grown)`, value: grown.mult });
    for (const m of p.modifiers) {
      if (m.kind === 'leverage') {
        if (!tagsMatch(m.tags, tags)) continue;
        if (!whenHolds(m.when, state, pieces)) continue;
        let steps = 1;
        if (m.per) {
          const above = valueOf(state, m.per) - (m.per_above ?? 0);
          steps = above > 0 ? Math.floor(above / (m.per_step ?? 10)) : 0;
          if (steps === 0) continue;
        }
        if (m.base_add) baseTerms.push({ source: p.name, value: m.base_add * steps });
        if (m.mult_add) multAddTerms.push({ source: p.name, value: Math.round(m.mult_add * steps * 100) / 100 });
        if (m.mult_mult !== undefined && m.mult_mult !== 1) multMultTerms.push({ source: p.name, value: m.mult_mult });
      } else if (m.kind === 'retrigger') {
        if (!tagsMatch(m.tags, tags)) continue;
        if (!whenHolds(m.when, state, pieces)) continue;
        retriggerTerms.push({ source: p.name, value: m.times ?? 1 });
      }
    }
  }
  if (state.nextMult && state.nextMult !== 1) multMultTerms.push({ source: 'order', value: state.nextMult });
  if (state.nextRetrigger) retriggerTerms.push({ source: 'order', value: state.nextRetrigger });

  const base = Math.max(0, baseTerms.reduce((s, t) => s + t.value, 0));
  const multAdd = 1 + multAddTerms.reduce((s, t) => s + t.value, 0);
  const multMult = multMultTerms.reduce((s, t) => s * t.value, 1);
  const mult = Math.round(Math.max(0, multAdd) * multMult * 100) / 100;
  const endlessActs = Math.max(0, state.act - content.acts.length);
  const escMult = escalationMultiplier(state.meters.escalation, endlessActs);
  const retriggers = retriggerTerms.reduce((s, t) => s + t.value, 0);
  const total = Math.round(base * mult * escMult * (1 + retriggers));
  return { base, baseTerms, multAdd, multAddTerms, multMult, multMultTerms, mult, escMult, escalation: state.meters.escalation, retriggers, retriggerTerms, total };
}

// ------------------------------------------------------------------ accidents

/** Probability of an accident attaching to an ordinary card at a given escalation. */
export function accidentChance(escalation: number): number {
  const pts: [number, number][] = [
    [0, 0],
    [49, 0],
    [50, 0.04],
    [70, 0.12],
    [85, 0.22],
    [95, 0.35],
    [99, 0.45],
    [100, 0.45],
  ];
  const e = Math.max(0, Math.min(100, escalation));
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (e <= x1) return x1 === x0 ? y1 : y0 + ((e - x0) / (x1 - x0)) * (y1 - y0);
  }
  return 0.45;
}

export const ACCIDENT_TYPES: AccidentType[] = ['false_alarm', 'misread', 'rogue_commander', 'attribution_error'];

export const ACCIDENT_LABEL: Record<AccidentType, string> = {
  false_alarm: 'False alarm',
  misread: 'Misread',
  rogue_commander: 'Rogue commander',
  attribution_error: 'Attribution error',
};

export const ACCIDENT_TEXT: Record<AccidentType, string> = {
  false_alarm: 'A sensor ghost reaches the alert chain before anyone can pull it back.',
  misread: 'A routine move of yours is read across the border as the opposite of what you meant.',
  rogue_commander: 'A local commander acts on standing orders nobody remembers writing.',
  attribution_error: 'Your people blame the wrong capital, in public, with a straight face.',
};

/** Severity grows with escalation (×1 at 50, ×2 at 100). */
export function accidentEffects(type: AccidentType, escalation: number, severityMult = 1): Effects {
  const s = (1 + Math.max(0, escalation - 50) / 50) * severityMult;
  const r = (n: number) => Math.round(n * s);
  switch (type) {
    case 'false_alarm':
      return { escalation: r(5), military: r(-3), public: r(-3) };
    case 'misread':
      return { escalation: r(4), trust_primary: r(-9) };
    case 'rogue_commander':
      return { escalation: r(7), allies: r(-5), military: r(2) };
    case 'attribution_error':
      return { escalation: r(4), trust_secondary: r(-9), public: r(-4) };
  }
}

/** Multiply accident probability / severity by piece modifiers. */
export function accidentModifiers(pieces: readonly PieceDef[]): { pMult: number; severityMult: number } {
  let pMult = 1;
  let severityMult = 1;
  for (const p of pieces)
    for (const m of p.modifiers as ModifierDef[]) {
      if (m.kind !== 'accident') continue;
      if (m.mult !== undefined) pMult *= m.mult;
      if (m.severity_mult !== undefined) severityMult *= m.severity_mult;
    }
  return { pMult, severityMult };
}

// ------------------------------------------------------------------ shop

export const RARITY_PRICE = { common: 3, uncommon: 5, rare: 7, legendary: 9 } as const;
export const RARITY_WEIGHT = { common: 10, uncommon: 6, rare: 2.5, legendary: 0.8 } as const;
export const REROLL_BASE = 2;
export const REMOVE_TAG_PRICE = 4;
export const MAX_PIECES = 6;
export const MAX_ORDERS = 2;
export const REMOVABLE_TAGS = ['proxy', 'naval', 'cyber', 'space', 'domestic', 'alliance', 'economy', 'warning', 'personal', 'intel', 'nuclear', 'misperception'];

/** Estimated minutes of human play for a run summary (used by the simulator's pacing target). */
export function estimateMinutes(cards: number, rolls: number, shops: number, accidents: number): number {
  return (cards * 11 + rolls * 4 + shops * 30 + accidents * 3) / 60;
}

/** Act definition for acts beyond the authored ones (endless). */
export function endlessActDef(last: ActDef, act: number): ActDef {
  const n = act - last.index;
  return {
    index: act,
    name: `Endless ${n}`,
    cards: 12,
    effect_scale: Math.round((last.effect_scale + 0.15 * n) * 100) / 100,
    intel_shift: last.intel_shift - 5 * n,
    timer_scale: Math.max(0.35, Math.round((last.timer_scale - 0.05 * n) * 100) / 100),
    day_per_card: last.day_per_card,
    target: Math.round(last.target * Math.pow(ENDLESS_CLIMB, n)),
    cooling: last.cooling,
    recovery: last.recovery,
  };
}
