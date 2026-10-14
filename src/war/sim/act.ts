/**
 * Thin helpers for driving the engine's actions from a bot. A refused action is a bot bug,
 * so it throws with the engine's reason instead of being ignored.
 */
import { pin, type RegionId, type Result, type RunState } from '../engine';

export function must(r: Result): RunState {
  if (!r.ok) throw new Error(`bot action refused: ${r.reason}`);
  return r.state;
}

/** Pin each region in turn, in the order given (the order they are spent in). */
export function pinAll(s: RunState, regions: readonly RegionId[]): RunState {
  return regions.reduce((st, r) => must(pin(st, r)), s);
}
