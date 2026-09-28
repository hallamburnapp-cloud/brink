/**
 * Bot policies for the balance simulator.
 *
 * A policy sees only what a player sees: the CardView (previews after
 * modifiers, odds %, timer, tags, hidden-cost markers) plus the public parts
 * of the run state (meters, act, held pieces, charges). Every policy draws its
 * randomness from an Rng that the simulator seeds from the run seed and the
 * policy name, so a (seed, policy) pair replays identically.
 */
import type { Rng } from '../engine/rng';
import type { CardView, ChoiceView, Content, MeterKey, PieceDef, RunState } from '../engine/types';

export type Decision = 'left' | 'right' | 'timeout' | 'bury';
export type PolicyName = 'random' | 'greedy' | 'heuristic';

export interface Policy {
  name: PolicyName;
  choose(content: Content, state: RunState, view: CardView, rng: Rng): Decision;
  pickPiece(content: Content, state: RunState, offer: string[], rng: Rng): string;
}

/** The four meters that remove you from office at either edge. */
export const OFFICE: readonly MeterKey[] = ['public', 'military', 'allies', 'economy'] as const;

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

function hasAny(tags: readonly string[], wanted: readonly string[]): boolean {
  for (const t of wanted) if (tags.includes(t)) return true;
  return false;
}

function coin(rng: Rng): 'left' | 'right' {
  return rng.next() < 0.5 ? 'left' : 'right';
}

// ------------------------------------------------------------------ random

/** Uniform left/right; 30% chance to let a timer expire; uniform piece picks. */
export const randomPolicy: Policy = {
  name: 'random',
  choose(_content, _state, view, rng) {
    if (view.timer !== null && rng.next() < 0.3) return 'timeout';
    return coin(rng);
  },
  pickPiece(_content, _state, offer, rng) {
    return offer[rng.int(offer.length)];
  },
};

// ------------------------------------------------------------------ greedy (meter)

/**
 * Greedy-meter score: the smallest distance to an edge among the four office
 * meters after the visible preview, plus 1.5 × (100 − escalation). Hidden
 * costs are unknown to the bot and odds are treated as neutral (the preview
 * already excludes roll outcomes).
 */
export function greedyScore(state: RunState, side: ChoiceView): number {
  let minEdge = 100;
  for (const k of OFFICE) {
    const d = edgeDistance(clamp(state.meters[k] + (side.preview[k] ?? 0), 0, 100));
    if (d < minEdge) minEdge = d;
  }
  const esc = clamp(state.meters.escalation + (side.preview.escalation ?? 0), 0, 100);
  return minEdge + 1.5 * (100 - esc);
}

export const greedyPolicy: Policy = {
  name: 'greedy',
  choose(_content, state, view, rng) {
    if (view.timer !== null && rng.next() < 0.1) return 'timeout';
    const l = greedyScore(state, view.left);
    const r = greedyScore(state, view.right);
    if (l === r) return coin(rng);
    return l > r ? 'left' : 'right';
  },
  pickPiece(content, _state, offer, rng) {
    let bestW = -Infinity;
    const best: string[] = [];
    for (const id of offer) {
      const w = content.pieces[id]?.offer_weight ?? 1;
      if (w > bestW) {
        bestW = w;
        best.length = 0;
        best.push(id);
      } else if (w === bestW) best.push(id);
    }
    return best.length === 1 ? best[0] : best[rng.int(best.length)];
  },
};

// ------------------------------------------------------------------ heuristic (strategic)

/** A side is hard-avoid when it leaves an office meter this close to an edge without improving it. */
export const EDGE_MARGIN = 8;
/** ... or leaves escalation above this without lowering it. */
export const ESCALATION_HARD = 85;
/** Each "?" (hidden cost) is read as this much extra escalation. */
export const HIDDEN_COST_ESCALATION = 6;
/** Above this, calming tags are strongly preferred. */
export const HOT_ESCALATION = 60;
/** Hotline charges are worth spending from here. */
export const CHARGE_ESCALATION = 40;

const CALM_TAGS: readonly string[] = ['deescalate', 'reassurance', 'back_channel', 'diplomacy'];
const CALM_DOCTRINES: ReadonlySet<string> = new Set(['hotline_protocol', 'no_first_use', 'transparency']);
/** Assets that shore up one office meter, keyed by piece id. */
const PROTECTORS: Readonly<Record<string, MeterKey>> = {
  strategic_reserve: 'economy',
  allied_basing: 'allies',
  civil_defence: 'public',
};

export interface SideEvaluation {
  score: number;
  hardAvoid: boolean;
  /** Projected escalation including hidden-cost assumptions. */
  escalation: number;
}

/**
 * Score one side with only the information a player has. Higher is better.
 * Rules (a), (b), (c), (d), (f) and (g) from the simulator brief live here.
 */
export function evaluateSide(state: RunState, side: ChoiceView): SideEvaluation {
  const m = state.meters;
  let score = 0;
  let hardAvoid = false;

  for (const k of OFFICE) {
    const v = m[k];
    const v2 = clamp(v + (side.preview[k] ?? 0), 0, 100);
    const d = edgeDistance(v);
    const d2 = edgeDistance(v2);
    // (a) within 8 of an edge and not climbing away from it.
    if (d2 <= EDGE_MARGIN && d2 <= d) hardAvoid = true;
    // (f) keep meters in 25..75: the change in a quadratic out-of-band penalty...
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

  // (g) hidden costs shown as "?" are read as +6 escalation each.
  const esc = m.escalation;
  const esc2 = clamp(esc + (side.preview.escalation ?? 0) + side.hiddenCosts.length * HIDDEN_COST_ESCALATION, 0, 100);
  if (esc2 > ESCALATION_HARD && esc2 >= esc) hardAvoid = true;
  score -= (esc2 - esc) * (1 + esc2 / 50);
  const hot = Math.max(0, esc2 - 60);
  const hotBefore = Math.max(0, esc - 60);
  score -= (hot * hot - hotBefore * hotBefore) / 20;

  // (b) when it is hot, strongly prefer the calming side.
  if (esc >= HOT_ESCALATION && hasAny(side.tags, CALM_TAGS)) score += 8;

  // (c) odds: attractive at p ≥ 0.6, neutral 0.45..0.6, avoided below 0.45.
  if (side.odds) {
    const p = side.odds.p;
    if (p >= 0.6) score += 3 + (p - 0.6) * 10;
    else if (p < 0.45) score -= 4 + (0.45 - p) * 20;
  }

  // (d) spend a Hotline charge when the room is warm enough to need it.
  if (side.usesCharge && esc >= CHARGE_ESCALATION) score += 6;

  return { score, hardAvoid, escalation: esc2 };
}

function heldPieces(content: Content, state: RunState): PieceDef[] {
  const out: PieceDef[] = [];
  for (const id of state.pieces) {
    const p = content.pieces[id];
    if (p) out.push(p);
  }
  return out;
}

function weakestMeter(state: RunState): { key: MeterKey; value: number } {
  let key: MeterKey = 'public';
  let value = Infinity;
  for (const k of OFFICE) {
    if (state.meters[k] < value) {
      value = state.meters[k];
      key = k;
    }
  }
  return { key, value };
}

/** Rule (i): synergy, exclusions, calming doctrines when hot, protective assets, then offer weight. */
export function scorePiece(content: Content, state: RunState, id: string, held: readonly PieceDef[]): number {
  const p = content.pieces[id];
  if (!p) return -Infinity;
  let s = p.offer_weight;
  for (const h of held) {
    for (const t of p.tags) if (h.tags.includes(t)) s += 2;
    if (h.excludes && h.excludes.includes(id)) s -= 100;
  }
  if (p.excludes) for (const x of p.excludes) if (state.pieces.includes(x)) s -= 100;
  const esc = state.meters.escalation;
  if (esc >= 50) {
    if (CALM_DOCTRINES.has(id)) s += 5;
    if (hasAny(p.tags, CALM_TAGS)) s += 1;
  }
  const guard = PROTECTORS[id];
  if (guard) {
    const weakest = weakestMeter(state);
    if (weakest.key === guard && weakest.value < 50) {
      s += 4;
      if (weakest.value < 35) s += 4;
    }
  }
  return s;
}

export const heuristicPolicy: Policy = {
  name: 'heuristic',
  choose(_content, state, view, rng) {
    // (h) even a thoughtful player lets one timer in twenty run out.
    if (view.timer !== null && rng.next() < 0.05) return 'timeout';
    const L = evaluateSide(state, view.left);
    const R = evaluateSide(state, view.right);
    if (L.hardAvoid && R.hardAvoid) {
      // (e) bury the card when both sides are unacceptable and the Chief of Staff can make it disappear.
      if (state.charges.removal > 0 && !view.isFlashpoint) return 'bury';
    } else if (L.hardAvoid) return 'right';
    else if (R.hardAvoid) return 'left';
    if (L.score === R.score) return coin(rng);
    return L.score > R.score ? 'left' : 'right';
  },
  pickPiece(content, state, offer, rng) {
    const held = heldPieces(content, state);
    let bestScore = -Infinity;
    const best: string[] = [];
    for (const id of offer) {
      const s = scorePiece(content, state, id, held);
      if (s > bestScore) {
        bestScore = s;
        best.length = 0;
        best.push(id);
      } else if (s === bestScore) best.push(id);
    }
    if (best.length === 0) return offer[0];
    return best.length === 1 ? best[0] : best[rng.int(best.length)];
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
