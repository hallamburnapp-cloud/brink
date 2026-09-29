/**
 * The modifier resolver. All posture pieces express their power through the
 * ModifierDef union; this module turns (base value, tags, context) into a
 * final number with one deterministic order of operations:
 *
 *   1. Filter: a modifier applies only if its key/tags/sign filters match.
 *   2. Additive terms are summed.        base + Σadd
 *   3. Sign guard: an additive modifier can shrink a cost or grow a benefit,
 *      but it cannot flip the sign of an effect. If it would, the result is 0.
 *   4. Multiplicative terms are multiplied. × Πmult
 *   5. Context scale (act × difficulty) is applied to visible meters only.
 *   6. Rounding to the nearest integer (half away from zero) and clamping
 *      happen in the engine, after resolution.
 *
 * Because addition happens before multiplication and both are commutative,
 * the order in which pieces were acquired never matters. See ENGINE.md.
 */
import type {
  ActDef,
  DifficultyDef,
  EffectKey,
  Effects,
  HiddenKey,
  ModifierDef,
  PieceDef,
  RuleId,
} from './types';
import { HIDDEN, METERS } from './types';

export interface ModContext {
  pieces: readonly PieceDef[];
  act: ActDef;
  difficulty: DifficultyDef;
}

export const ODDS_MIN = 0.03;
export const ODDS_MAX = 0.97;
export const TIMER_MIN = 4;
export const TIMER_MAX = 30;

export function roundHalfAway(n: number): number {
  return n < 0 ? -Math.round(-n) : Math.round(n);
}

export function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

function tagsMatch(filter: string[] | undefined, tags: readonly string[]): boolean {
  if (!filter || filter.length === 0) return true;
  for (const t of filter) if (tags.includes(t)) return true;
  return false;
}

function keyMatches(filter: EffectKey | 'meters' | 'hidden' | 'trust' | undefined, key: EffectKey): boolean {
  if (filter === undefined) return true;
  if (filter === 'meters') return (METERS as readonly string[]).includes(key);
  if (filter === 'hidden') return (HIDDEN as readonly string[]).includes(key);
  if (filter === 'trust') return key === 'trust_primary' || key === 'trust_secondary';
  return filter === key;
}

export function allModifiers(ctx: ModContext): ModifierDef[] {
  const out: ModifierDef[] = [];
  for (const p of ctx.pieces) for (const m of p.modifiers) out.push(m);
  return out;
}

/** Rules whose values are levels (take the strongest) rather than counts (sum). */
const MAX_RULES: ReadonlySet<RuleId> = new Set<RuleId>(['warning_floor', 'military_floor', 'economy_floor', 'sell_bonus']);
/** Rules whose values multiply (e.g. shop discounts stack multiplicatively). */
const MULT_RULES: ReadonlySet<RuleId> = new Set<RuleId>(['shop_discount', 'escalate_to_deescalate']);

/** Rule maps are pure functions of the held pieces; cache them per pieces array (one draw or choose builds one ctx). */
const RULE_CACHE = new WeakMap<readonly PieceDef[], Map<RuleId, number>>();

export function rules(ctx: ModContext): Map<RuleId, number> {
  const cached = RULE_CACHE.get(ctx.pieces);
  if (cached) return cached;
  const map = new Map<RuleId, number>();
  for (const m of allModifiers(ctx)) {
    if (m.kind !== 'rule') continue;
    const v = m.value ?? 1;
    if (!map.has(m.rule)) {
      map.set(m.rule, v);
      continue;
    }
    const prev = map.get(m.rule)!;
    if (MAX_RULES.has(m.rule)) map.set(m.rule, Math.max(prev, v));
    else if (MULT_RULES.has(m.rule)) map.set(m.rule, prev * v);
    else map.set(m.rule, prev + v);
  }
  RULE_CACHE.set(ctx.pieces, map);
  return map;
}

export function hasRule(ctx: ModContext, rule: RuleId): boolean {
  return rules(ctx).has(rule);
}

export function ruleValue(ctx: ModContext, rule: RuleId, fallback = 0): number {
  const v = rules(ctx).get(rule);
  return v === undefined ? fallback : v;
}

export interface ResolvedEffect {
  value: number;
  add: number;
  mult: number;
  scale: number;
}

/**
 * Resolve one effect delta. `tags` are the choice's tags.
 * Returns the unrounded value; callers round + clamp.
 */
export function resolveEffect(key: EffectKey, base: number, tags: readonly string[], ctx: ModContext, skipAlways = false): ResolvedEffect {
  if (base === 0) return { value: 0, add: 0, mult: 1, scale: 1 };
  let add = 0;
  let mult = 1;
  for (const m of allModifiers(ctx)) {
    if (m.kind !== 'effect') continue;
    if (!keyMatches(m.key, key)) continue;
    if (!tagsMatch(m.tags, tags)) continue;
    if (m.sign === 'pos' && base <= 0) continue;
    if (m.sign === 'neg' && base >= 0) continue;
    // An injected `always` add is already in the base; its mult still applies.
    if (m.add && !(m.always && skipAlways)) add += m.add;
    if (m.mult !== undefined) mult *= m.mult;
  }
  // Rule-based amplifiers that are cleaner as rules than as generic modifiers.
  if (key === 'escalation' && base > 0) {
    const sd = ruleValue(ctx, 'security_dilemma');
    if (sd && tagsMatch(['military', 'deterrence', 'strike', 'mobilise'], tags)) add += sd;
    if (hasRule(ctx, 'escalation_twitch') && ctx.act.index >= 3) mult *= 1 + 0.15 * (ctx.act.index - 2);
    if (hasRule(ctx, 'escalate_to_deescalate') && tags.includes('limited_strike')) mult *= ruleValue(ctx, 'escalate_to_deescalate', 0.6);
  }
  if (key === 'commitment' && base > 0 && tags.includes('public_commitment')) add += ruleValue(ctx, 'red_lines');

  let v = base + add;
  // Sign guard: additive modifiers never flip the sign.
  if ((base > 0 && v < 0) || (base < 0 && v > 0)) v = 0;
  v *= mult;
  const actScale = key === 'escalation' ? (ctx.act.escalation_scale ?? ctx.act.effect_scale) : ctx.act.effect_scale;
  const scale = (METERS as readonly string[]).includes(key) ? actScale * ctx.difficulty.effect_scale : 1;
  // Scaling amplifies pressure: it applies to costs on all meters and to gains on escalation,
  // but does not inflate benefits (otherwise pieces that heal meters get stronger late).
  const isCost = key === 'escalation' ? base > 0 : base < 0;
  const applied = isCost ? v * scale : v;
  return { value: applied, add, mult, scale: isCost ? scale : 1 };
}

function keysFor(filter: string | undefined): EffectKey[] {
  if (filter === 'trust') return ['trust_primary', 'trust_secondary'];
  if (filter === undefined || filter === 'meters' || filter === 'hidden') return [];
  return [filter as EffectKey];
}

/**
 * Resolve a whole Effects map into rounded integer deltas (no clamping to meter bounds).
 * `always` modifiers inject their `add` on keys the choice does not touch; those injected
 * sums become the base for that key, so they are not counted twice.
 */
export function resolveEffects(effects: Effects, tags: readonly string[], ctx: ModContext): Effects {
  const base: Effects = { ...effects };
  const injected = new Set<EffectKey>();
  for (const m of allModifiers(ctx)) {
    if (m.kind !== 'effect' || !m.always || !m.add) continue;
    if (!tagsMatch(m.tags, tags)) continue;
    for (const k of keysFor(m.key)) {
      if (effects[k]) continue; // key already present: handled as a normal add in resolveEffect
      base[k] = (base[k] ?? 0) + m.add;
      injected.add(k);
    }
  }
  const out: Effects = {};
  for (const k of Object.keys(base) as EffectKey[]) {
    const b = base[k] ?? 0;
    if (!b) continue;
    const r = roundHalfAway(resolveEffect(k, b, tags, ctx, injected.has(k)).value);
    if (r !== 0) out[k] = r;
  }
  return out;
}

/**
 * Resolve an odds roll probability.
 *   p = clamp((base + Σadd + situational) × Πmult, 0.03, 0.97)
 * Situational terms make hidden values matter:
 *   - rolls tagged `adversary`  gain (trust_primary − 50) / 200   (±0.25 at extremes)
 *   - rolls tagged `intel`      gain (intel − 50) / 200
 *   - rolls tagged `alliance`   gain (commitment − 50) / 250
 */
export function resolveOdds(
  base: number,
  tags: readonly string[],
  ctx: ModContext,
  hidden: Record<HiddenKey, number>,
): { p: number; add: number; mult: number; situational: number } {
  let add = 0;
  let mult = 1;
  for (const m of allModifiers(ctx)) {
    if (m.kind !== 'odds') continue;
    if (!tagsMatch(m.tags, tags)) continue;
    if (m.add) add += m.add;
    if (m.mult !== undefined) mult *= m.mult;
  }
  let situational = 0;
  if (tags.includes('adversary')) situational += (hidden.trust_primary - 50) / 200;
  if (tags.includes('secondary')) situational += (hidden.trust_secondary - 50) / 200;
  if (tags.includes('intel')) situational += (hidden.intel - 50) / 200;
  if (tags.includes('alliance')) situational += (hidden.commitment - 50) / 250;
  const p = clamp((base + add + situational) * mult, ODDS_MIN, ODDS_MAX);
  return { p, add, mult, situational };
}

/** Effective intel reliability (0..100) for truth rolls and UI language. */
export function resolveIntel(hiddenIntel: number, ctx: ModContext): number {
  let add = 0;
  let mult = 1;
  for (const m of allModifiers(ctx)) {
    if (m.kind !== 'intel') continue;
    if (m.add) add += m.add;
    if (m.mult !== undefined) mult *= m.mult;
  }
  const v = (hiddenIntel + add) * mult + ctx.act.intel_shift + ctx.difficulty.intel_shift;
  return clamp(v, 5, 95);
}

/** Effective countdown length in seconds, or null when the card has none. */
export function resolveTimer(base: number | undefined, ctx: ModContext): number | null {
  if (base === undefined || base <= 0) return null;
  let add = 0;
  let mult = 1;
  for (const m of allModifiers(ctx)) {
    if (m.kind !== 'timer') continue;
    if (m.add) add += m.add;
    if (m.mult !== undefined) mult *= m.mult;
  }
  const v = (base + add) * mult * ctx.act.timer_scale * ctx.difficulty.timer_scale;
  return clamp(Math.round(v), TIMER_MIN, TIMER_MAX);
}

/** Draw weight for a card: base × Π(weight mults matching tags or id). */
export function resolveWeight(base: number, id: string, tags: readonly string[], ctx: ModContext, isWarningCard = tags.includes('warning')): number {
  let mult = 1;
  for (const m of allModifiers(ctx)) {
    if (m.kind !== 'weight') continue;
    const byId = m.ids && m.ids.includes(id);
    const byTag = m.tags && tagsMatch(m.tags, tags);
    if (byId || byTag) mult *= m.mult;
  }
  // `warning_frequency` is about warning *cards* (those with a truth roll), not the domain tag.
  if (isWarningCard) mult *= 1 + ruleValue(ctx, 'warning_frequency');
  return base * mult;
}

/** Escalation floor/ceiling from doctrines (plus the run's own floor). */
export function escalationBounds(ctx: ModContext, runFloor: number): { floor: number; ceiling: number } {
  let floor = runFloor;
  let ceiling = 100;
  for (const m of allModifiers(ctx)) {
    if (m.kind === 'floor') floor = Math.max(floor, m.value);
    if (m.kind === 'ceiling') ceiling = Math.min(ceiling, m.value);
  }
  return { floor: clamp(floor, 0, 99), ceiling: clamp(ceiling, floor + 1, 100) };
}
