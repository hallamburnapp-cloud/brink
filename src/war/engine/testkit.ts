/**
 * Small helpers for the engine's tests (and handy for bots): unwrap results, pin several
 * regions, and build a board or a run with a custom world.
 */
import type { RegionId } from '../content/map';
import type { StaffId } from '../content/staff';
import { buildBoard, type Board } from './board';
import { draft } from './draft';
import { clearPins, pin, scorePins, startingWorld, sweep, twistInForce } from './run';
import type { Result, RunState, SeatedStaff, Twist, World } from './types';

/** The state of a successful result; throws with the refusal reason otherwise. */
export function must(r: Result): RunState {
  if (!r.ok) throw new Error(`refused: ${r.reason}`);
  return r.state;
}

/** Pin each region in turn (throws on refusal). */
export function pinAll(s: RunState, ids: readonly RegionId[]): RunState {
  return ids.reduce((st, id) => must(pin(st, id)), s);
}

export function seatedStaff(ids: readonly StaffId[], counts: Partial<Record<number, number>> = {}): SeatedStaff[] {
  return ids.map((id, i) => ({ uid: i + 1, id, count: counts[i] ?? 0 }));
}

/** A board on the starting map, adjusted by `edit`. */
export function testBoard(opts: { staff?: readonly StaffId[]; twist?: Twist | null; edit?: (w: World) => void } = {}): Board {
  const world = startingWorld();
  opts.edit?.(world);
  return buildBoard(world, seatedStaff(opts.staff ?? []), opts.twist ?? null);
}

/** A copy of `s` changed by `edit` (for setting up test positions). */
export function tweak(s: RunState, edit: (d: RunState) => void): RunState {
  const d = draft(s);
  edit(d);
  return d;
}

function combinations<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  const out: T[][] = [];
  items.forEach((x, i) => {
    for (const rest of combinations(items.slice(i + 1), k - 1)) out.push([x, ...rest]);
  });
  return out;
}

/** The lit pins with the highest leverage right now (a greedy player, no swaps or Airlift). */
export function bestPins(s: RunState): RegionId[] {
  const sizes = twistInForce(s)?.kind === 'FULL_TABLE' ? [5] : [1, 2, 3, 4, 5];
  let best: { leverage: bigint; pins: RegionId[] } = { leverage: -1n, pins: [] };
  for (const k of sizes) {
    for (const pins of combinations(s.crisis.lit, k)) {
      const leverage = scorePins(s, pins, { trace: false })!.leverage;
      if (leverage > best.leverage) best = { leverage, pins };
    }
  }
  return best.pins;
}

/** Pin the greedy best and sweep. */
export function greedySweep(s: RunState): RunState {
  const cleared = must(clearPins(s));
  return must(sweep(pinAll(cleared, bestPins(cleared))));
}
