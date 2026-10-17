/**
 * GameState → PaperView. The map never reads the engine; this adapter does, through the engine's
 * public shape only (src/redlines/engine/types.ts). `holdable` is the engine's holdable(s, region)
 * curried by the caller, so the map draws a promise solid exactly when the engine says it can be held.
 */
import type { GameState, PhoneKind, RegionId } from '../../engine/types';
import type { PaperView, RegionState } from './contract';

export interface ViewExtras {
  /** The region under a held finger. */
  pressed?: RegionId | null;
  /** The counter picked up to move. */
  lifted?: 'fleet' | 'brigade' | null;
  /** Override the tested place (the resolve playback may mark it before the phone rings). */
  tested?: RegionId | null;
}

/** The phone kinds that are a test of a promise at `phone.region`. */
const TEST_KINDS: ReadonlySet<PhoneKind> = new Set<PhoneKind>(['test', 'test-inherited', 'feint']);

/** The place tested this week: the phone's region while a test is ringing, else the carried test. */
export function testedOf(s: GameState): RegionId | null {
  if (s.phase === 'phone' && s.phone && s.phone.region && TEST_KINDS.has(s.phone.kind)) return s.phone.region;
  return s.pendingTest ?? null;
}

export function viewFromState(s: GameState, holdable: (region: RegionId) => boolean, extra: ViewExtras = {}): PaperView {
  const states: Record<RegionId, RegionState> = {};
  for (const [id, rec] of Object.entries(s.regions)) if (rec.state !== 'calm') states[id] = rec.state;
  return {
    states,
    promises: s.promises.map((p) => ({ region: p.region, solid: holdable(p.region) })),
    headings: s.fed.headings.map((h) => ({ from: h.from, to: h.to })),
    pieces: s.pieces.map((p) => ({ kind: p.kind, at: p.at })),
    tested: extra.tested !== undefined ? extra.tested : testedOf(s),
    pressed: extra.pressed ?? null,
    lifted: extra.lifted ?? null,
  };
}

/** True when two views would draw the same sheet (so a screen can skip an update). */
export function sameView(a: PaperView, b: PaperView): boolean {
  if (a === b) return true;
  if (a.tested !== b.tested || a.pressed !== b.pressed || (a.lifted ?? null) !== (b.lifted ?? null)) return false;
  if (a.promises.length !== b.promises.length || a.headings.length !== b.headings.length || a.pieces.length !== b.pieces.length) return false;
  for (let i = 0; i < a.promises.length; i++) if (a.promises[i].region !== b.promises[i].region || a.promises[i].solid !== b.promises[i].solid) return false;
  for (let i = 0; i < a.headings.length; i++) if (a.headings[i].from !== b.headings[i].from || a.headings[i].to !== b.headings[i].to) return false;
  for (let i = 0; i < a.pieces.length; i++) if (a.pieces[i].kind !== b.pieces[i].kind || a.pieces[i].at !== b.pieces[i].at) return false;
  const ids = new Set([...Object.keys(a.states), ...Object.keys(b.states)]);
  for (const id of ids) if ((a.states[id] ?? 'calm') !== (b.states[id] ?? 'calm')) return false;
  return true;
}
