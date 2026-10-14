/**
 * Records how a crisis's deck was ordered: the opening pile and every reshuffle of the spent
 * regions. The cross-check replays the reference bot on exactly these orders, so the two
 * implementations see identical deals without sharing a random number generator.
 */
import type { RegionId, RunState } from '../engine';

export interface DeckLog {
  /** The opening pile: the 8 lit regions (flashpoint first), then the pile. */
  opening: RegionId[];
  /** Each time the spent regions were shuffled back in, their new order. */
  reshuffles: RegionId[][];
}

export function openDeckLog(s: RunState): DeckLog {
  return { opening: [...s.crisis.lit, ...s.crisis.pile], reshuffles: [] };
}

/**
 * Note a reshuffle, if the action that turned `before` into `after` made one.
 * `before` is the state just before a sweep or swap (pins already placed); `spentNow` are the
 * regions that action spent.
 */
export function noteReshuffle(log: DeckLog, before: RunState, after: RunState, spentNow: readonly RegionId[]): void {
  // Spending always leaves something in `spent` unless the spent regions went back into the pile.
  if (spentNow.length === 0 || after.crisis.spent.length > 0) return;
  const gone = new Set(spentNow);
  const kept = before.crisis.lit.filter((r) => !gone.has(r)).length;
  const drawn = [...after.crisis.lit.slice(kept), ...after.crisis.pile];
  log.reshuffles.push(drawn.slice(before.crisis.pile.length));
}
