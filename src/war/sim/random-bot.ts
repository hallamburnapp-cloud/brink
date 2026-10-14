/**
 * The random tapper (spec section 14), a port of docs/war/reference/randbot.py: each sweep it
 * pins a random 1-5 of the lit regions (or exactly 5 when `five` is set) and never swaps.
 */
import type { Rng } from '../../engine/rng';
import type { RegionId, RunState } from '../engine';
import { doSweep, outcome, type BotStep, type CrisisOutcome } from './greedy';
import { openDeckLog } from './deck-log';

/** `k` distinct items in random order (Python's random.sample). */
export function sample<T>(rng: Rng, items: readonly T[], k: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  for (let i = 0; i < k && pool.length; i++) out.push(pool.splice(rng.int(pool.length), 1)[0]);
  return out;
}

export function playRandomCrisis(start: RunState, rng: Rng, opts: { five?: boolean } = {}): CrisisOutcome {
  if (start.phase !== 'crisis') throw new Error('playRandomCrisis needs a crisis on the table');
  let s = start;
  const steps: BotStep[] = [];
  const deck = openDeckLog(s);
  while (s.phase === 'crisis' && s.crisis.sweepsLeft > 0) {
    const n = opts.five ? 5 : 1 + rng.int(5);
    const pins: RegionId[] = sample(rng, s.crisis.lit, n);
    s = doSweep(s, { leverage: 0n, pins, airlift: null }, steps, deck);
  }
  return outcome(s, steps, deck);
}
