/**
 * What the bots read off the current deal (reference bots.py: best_send, random_group, and the
 * choice-spread sample that play() takes at the start of every turn).
 */
import type { Rng } from '../../engine/rng';
import { ADJ, pinnable, regionsWon, sendOptions, type GameState, type RegionId, type SendOption } from '../engine';

/**
 * The best legal send: most regions, then the highest score (the same thing, as the ladder only
 * climbs); ties go to the pins first in id order, as the reference's sorted groups do.
 */
export function bestSend(s: GameState): SendOption {
  return sendOptions(s)[0];
}

/**
 * A random touching group of `kmin`-`kmax` pinnable regions: one region at random, then random
 * neighbours of the group (fewer when the group runs out of neighbours). Sorted by id.
 */
export function randomGroup(s: GameState, rng: Rng, kmin = 1, kmax = 5): RegionId[] {
  const pool = pinnable(s.deal.lit, s.deal.crisis);
  const k = kmin + rng.int(kmax - kmin + 1);
  const group = [rng.pick(pool)];
  while (group.length < k) {
    const next = new Set<RegionId>();
    for (const r of group) for (const n of ADJ[r]) if (pool.includes(n) && !group.includes(n)) next.add(n);
    if (next.size === 0) break;
    group.push(rng.pick([...next].sort()));
  }
  return group.sort();
}

/** The choice on a turn's opening deal: the best send against the median send (gate G5). */
export interface SpreadSample {
  turn: number;
  /** Best score ÷ the median score (at least 1). */
  ratio: number;
  bestRegions: number;
  medianRegions: number;
  bestWins: boolean;
  medianWins: boolean;
  /** Legal sends on the deal. */
  legal: number;
}

export function openingSpread(s: GameState): SpreadSample {
  const options = sendOptions(s);
  const scores = options.map((o) => o.score).sort((a, b) => (a === b ? 0 : a < b ? -1 : 1));
  const n = scores.length;
  const mid = Math.floor(n / 2);
  // Twice the median, exact: the reference's median of an even list is the mean of the middle two.
  const median2 = n % 2 ? 2n * scores[mid] : scores[mid - 1] + scores[mid];
  const best = scores[n - 1];
  const T = s.deal.target;
  return {
    turn: s.turn,
    ratio: Number(best) / Math.max(1, Number(median2) / 2),
    bestRegions: regionsWon(best, T),
    medianRegions: regionsWon(median2 / 2n, T),
    bestWins: best >= T,
    medianWins: median2 >= 2n * T,
    legal: n,
  };
}
