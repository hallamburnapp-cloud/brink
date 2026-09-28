import type { ConditionDef, EffectKey, PieceDef, RunState } from './types';

/** Flags active right now: run flags plus flags granted by held pieces. */
// One-entry cache: a draw checks every card against the same flags and pieces.
// `state.flags` only grows in place (push) or is replaced (filter), so the
// array identity plus its length is a sound key.
let lastFlags: readonly string[] | null = null;
let lastLen = -1;
let lastPieces: readonly PieceDef[] | null = null;
let lastSet: Set<string> | null = null;

export function activeFlags(state: RunState, pieces: readonly PieceDef[]): Set<string> {
  if (lastSet && lastFlags === state.flags && lastLen === state.flags.length && lastPieces === pieces) return lastSet;
  const s = new Set(state.flags);
  for (const p of pieces) for (const g of p.grants) s.add(g);
  lastFlags = state.flags;
  lastLen = state.flags.length;
  lastPieces = pieces;
  lastSet = s;
  return s;
}

export function valueOf(state: RunState, key: EffectKey): number {
  return key in state.meters ? state.meters[key as keyof typeof state.meters] : state.hidden[key as keyof typeof state.hidden];
}

export function checkConditions(cond: ConditionDef | undefined, state: RunState, pieces: readonly PieceDef[]): boolean {
  if (!cond) return true;
  const flags = activeFlags(state, pieces);
  if (cond.flags_all && !cond.flags_all.every((f) => flags.has(f))) return false;
  if (cond.flags_any && cond.flags_any.length > 0 && !cond.flags_any.some((f) => flags.has(f))) return false;
  if (cond.flags_none && cond.flags_none.some((f) => flags.has(f))) return false;
  if (cond.values) {
    for (const k of Object.keys(cond.values) as EffectKey[]) {
      const r = cond.values[k]!;
      const v = valueOf(state, k);
      if (r.min !== undefined && v < r.min) return false;
      if (r.max !== undefined && v > r.max) return false;
    }
  }
  if (cond.pieces_any && cond.pieces_any.length > 0 && !cond.pieces_any.some((p) => state.pieces.includes(p))) return false;
  if (cond.pieces_all && !cond.pieces_all.every((p) => state.pieces.includes(p))) return false;
  if (cond.pieces_none && cond.pieces_none.some((p) => state.pieces.includes(p))) return false;
  if (cond.day) {
    if (cond.day.min !== undefined && state.day < cond.day.min) return false;
    if (cond.day.max !== undefined && state.day > cond.day.max) return false;
  }
  if (cond.seen && !cond.seen.every((c) => state.seen.includes(c))) return false;
  if (cond.unseen && cond.unseen.some((c) => state.seen.includes(c))) return false;
  if (cond.act_card_min !== undefined && state.actCards < cond.act_card_min) return false;
  return true;
}
