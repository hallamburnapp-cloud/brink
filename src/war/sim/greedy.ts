/**
 * The greedy bot (spec section 14), a port of play_crisis() in docs/war/reference/crisis.py.
 *
 * Each sweep it scores every subset of up to 5 lit pins (exactly 5 under FULL TABLE) and takes
 * the highest leverage, the first one found on a tie. Before sweeping it swaps while
 * best x sweeps left < 0.8 x the remaining target: the lit regions outside the best play's
 * scoring set go, lightest first, at most 5. With an AIRLIFT paper it also weighs every
 * subset of up to 4 lit pins plus one region from the pile, and airlifts when that is at least
 * 1.5x the plain best, on the last sweep, or when only the airlift reaches the target.
 */
import { REGION } from '../content/map';
import {
  scorePins,
  swap,
  sweep,
  twistInForce,
  useOrder,
  type PatternId,
  type RegionId,
  type RunState,
} from '../engine';
import { must, pinAll } from './act';
import { ALL_SIZES, subsets } from './combos';
import { noteReshuffle, openDeckLog, type DeckLog } from './deck-log';

export interface Play {
  leverage: bigint;
  /** Lit pins, in the order they are pinned (and spent). */
  pins: RegionId[];
  /** The region to airlift onto the pins, if any. */
  airlift: RegionId | null;
}

const NO_PLAY: Play = { leverage: -1n, pins: [], airlift: null };

function fullTable(s: RunState): boolean {
  return twistInForce(s)?.kind === 'FULL_TABLE';
}

/** The highest-leverage selection of lit pins right now. */
export function bestPlay(s: RunState): Play {
  let best = NO_PLAY;
  for (const pins of subsets(s.crisis.lit, fullTable(s) ? [5] : ALL_SIZES)) {
    const leverage = scorePins(s, pins, { trace: false })!.leverage;
    if (leverage > best.leverage) best = { leverage, pins, airlift: null };
  }
  return best;
}

/** Tray slot of an AIRLIFT paper the bot may use now, or -1. */
export function airliftSlot(s: RunState): number {
  if (s.crisis.airlift) return -1;
  return s.tray.findIndex((p) => p.id === 'AIRLIFT');
}

/** The best selection of up to 4 lit pins plus one airlifted region from the pile. */
export function bestAirliftPlay(s: RunState): Play {
  if (airliftSlot(s) < 0) return NO_PLAY;
  let best = NO_PLAY;
  for (const lit of subsets(s.crisis.lit, fullTable(s) ? [4] : [0, 1, 2, 3, 4])) {
    for (const a of s.crisis.pile) {
      const leverage = scorePins(s, [...lit, a], { trace: false })!.leverage;
      if (leverage > best.leverage) best = { leverage, pins: lit, airlift: a };
    }
  }
  return best;
}

export type BotStep =
  | { kind: 'swap'; regions: RegionId[] }
  | { kind: 'sweep'; pins: RegionId[]; airlift: RegionId | null; pattern: PatternId; leverage: bigint };

export interface CrisisOutcome {
  cleared: boolean;
  total: bigint;
  target: bigint;
  sweepsLeft: number;
  swapsLeft: number;
  steps: BotStep[];
  deck: DeckLog;
  /** The state after the crisis (phase 'briefing', 'sliceEnd' or 'missed'). */
  state: RunState;
}

/** Swap `regions` (lit, not pinned) for fresh ones. */
function doSwap(s: RunState, regions: RegionId[], steps: BotStep[], deck: DeckLog): RunState {
  const before = pinAll(s, regions);
  const after = must(swap(before));
  noteReshuffle(deck, before, after, regions);
  steps.push({ kind: 'swap', regions });
  return after;
}

/** Pin `play` (and its airlift) and sweep. */
export function doSweep(s: RunState, play: Play, steps: BotStep[], deck: DeckLog): RunState {
  let before = pinAll(s, play.pins);
  if (play.airlift) before = must(useOrder(before, airliftSlot(before), [play.airlift]));
  const after = must(sweep(before));
  const spent = play.airlift ? [...play.pins, play.airlift] : play.pins;
  noteReshuffle(deck, before, after, spent);
  const rec = after.lastSweep!;
  steps.push({ kind: 'sweep', pins: play.pins, airlift: play.airlift, pattern: rec.pattern, leverage: rec.leverage });
  return after;
}

/** The regions the reference bot swaps: lit, outside the best play's scoring set, lightest first. */
export function swapOut(s: RunState, best: Play): RegionId[] {
  const scoring = new Set(scorePins(s, best.pins, { trace: false })!.scoringSet);
  return s.crisis.lit
    .filter((r) => !scoring.has(r))
    .sort((a, b) => REGION[a].weight - REGION[b].weight) // stable, like Python's sorted()
    .slice(0, 5);
}

/** Play the current crisis to its end with the greedy bot. */
export function playGreedyCrisis(start: RunState): CrisisOutcome {
  if (start.phase !== 'crisis') throw new Error('playGreedyCrisis needs a crisis on the table');
  let s = start;
  const steps: BotStep[] = [];
  const deck = openDeckLog(s);
  while (s.phase === 'crisis' && s.crisis.sweepsLeft > 0) {
    const sweepsLeft = s.crisis.sweepsLeft;
    const remaining = s.crisis.target - s.crisis.total;
    // Floats on purpose: the reference compares `best * sweeps < remaining * 0.8` in doubles.
    const short = (p: Play) => Number(p.leverage) * sweepsLeft < Number(remaining) * 0.8;
    let best = bestPlay(s);
    let air = bestAirliftPlay(s);
    while (s.crisis.swapsLeft > 0 && short(best) && short(air.leverage > best.leverage ? air : best)) {
      const out = swapOut(s, best);
      if (out.length === 0) break;
      s = doSwap(s, out, steps, deck);
      best = bestPlay(s);
      air = bestAirliftPlay(s);
    }
    const useAir =
      air.leverage > 0n &&
      (Number(air.leverage) >= 1.5 * Number(best.leverage) ||
        sweepsLeft === 1 ||
        (best.leverage < remaining && remaining <= air.leverage));
    s = doSweep(s, useAir ? air : best, steps, deck);
  }
  return outcome(s, steps, deck);
}

export function outcome(s: RunState, steps: BotStep[], deck: DeckLog): CrisisOutcome {
  const c = s.crisis;
  return {
    cleared: c.cleared,
    total: c.total,
    target: c.target,
    sweepsLeft: c.sweepsLeft,
    swapsLeft: c.swapsLeft,
    steps,
    deck,
    state: s,
  };
}
