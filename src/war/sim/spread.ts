/**
 * Choice spread, a port of docs/war/reference/spread.py: deal 8 random regions on the starting
 * map (the first is the flashpoint), score every legal selection of 1-5 of them with no staff,
 * and compare the best play with the median play and with the best play of any other pattern.
 * This is what "choices feel pointless" is measured by: if the best play is rarely far above
 * an ordinary one, the choice does not matter.
 */
import { Rng } from '../../engine/rng';
import { REGION_IDS } from '../content/map';
import { PATTERN_IDS } from '../content/patterns';
import { buildBoard, scoreSelection, startingWorld, type Board, type PatternId, type RegionId } from '../engine';
import { ALL_SIZES, subsets } from './combos';

export interface DealSpread {
  deal: RegionId[];
  best: bigint;
  bestPattern: PatternId;
  bestPins: RegionId[];
  /** The two middle plays summed (the median of 218 plays is their mean). */
  middleSum: bigint;
  /** The best play whose pattern differs from the best play's (0 if none). */
  bestOther: bigint;
  available: PatternId[];
}

const freshBoard = (): Board => buildBoard(startingWorld(), [], null);

/** Score every selection of a deal (deal[0] is the flashpoint). */
export function dealSpread(deal: readonly RegionId[], board: Board = freshBoard()): DealSpread {
  const plays: Array<{ pattern: PatternId; leverage: bigint; pins: RegionId[] }> = [];
  for (const pins of subsets(deal, ALL_SIZES)) {
    const r = scoreSelection(board, { pins, lit: deal, flashpoint: deal[0] }, { trace: false });
    plays.push({ pattern: r.pattern, leverage: r.leverage, pins });
  }
  // The first play with the top value wins ties, as Python's max() does.
  const top = plays.reduce((b, p) => (p.leverage > b.leverage ? p : b));
  const values = plays.map((p) => p.leverage).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const mid = values.length >> 1;
  const middleSum = values.length % 2 ? values[mid] * 2n : values[mid - 1] + values[mid];
  const bestOther = plays.reduce((b, p) => (p.pattern !== top.pattern && p.leverage > b ? p.leverage : b), 0n);
  return {
    deal: [...deal],
    best: top.leverage,
    bestPattern: top.pattern,
    bestPins: top.pins,
    middleSum,
    bestOther,
    available: [...new Set(plays.map((p) => p.pattern))],
  };
}

export interface Quantiles {
  p10: number;
  median: number;
  p90: number;
}

export interface SpreadStats {
  deals: number;
  /** Share of deals where the best play is at least 3x the median play. */
  atLeast3x: number;
  /** best / median play. */
  ratio: Quantiles;
  /** best / best play of another pattern. */
  ratioNext: Quantiles;
  bestScore: Quantiles;
  /** Share of deals where each pattern is the best play. */
  bestShare: Record<PatternId, number>;
  /** Share of deals where each pattern can be made at all. */
  available: Record<PatternId, number>;
  /** The pattern that is the best play most often, and how often. */
  topPattern: { pattern: PatternId; share: number };
}

/** Python's q(a, p) = a[int(p * (len(a) - 1))] on a sorted list. */
function quantiles(xs: number[]): Quantiles {
  const a = [...xs].sort((x, y) => x - y);
  const q = (p: number) => a[Math.floor(p * (a.length - 1))];
  return { p10: q(0.1), median: q(0.5), p90: q(0.9) };
}

/** Deal `i` of a spread run: 8 random regions of the starting map, flashpoint first. */
export function randomDeal(seed: string, i: number): RegionId[] {
  return new Rng(`${seed}:deal-${i}`).shuffle([...REGION_IDS]).slice(0, 8);
}

/** Deals [from, to) of a spread run. */
export function spreadDeals(seed: string, from: number, to: number): DealSpread[] {
  const board = freshBoard();
  const out: DealSpread[] = [];
  for (let i = from; i < to; i++) out.push(dealSpread(randomDeal(seed, i), board));
  return out;
}

export function summariseSpread(spreads: readonly DealSpread[]): SpreadStats {
  const n = spreads.length;
  const zero = () => Object.fromEntries(PATTERN_IDS.map((p) => [p, 0])) as Record<PatternId, number>;
  const best = zero();
  const avail = zero();
  let ge3 = 0;
  const ratio: number[] = [];
  const ratioNext: number[] = [];
  const scores: number[] = [];
  for (const d of spreads) {
    // best >= 3 x median  <=>  2 x best >= 3 x (sum of the two middle plays)
    if (2n * d.best >= 3n * d.middleSum) ge3++;
    ratio.push((2 * Number(d.best)) / Number(d.middleSum));
    ratioNext.push(d.bestOther > 0n ? Number(d.best) / Number(d.bestOther) : 99);
    scores.push(Number(d.best));
    best[d.bestPattern]++;
    for (const p of d.available) avail[p]++;
  }
  const share = (r: Record<PatternId, number>) =>
    Object.fromEntries(PATTERN_IDS.map((p) => [p, n ? r[p] / n : 0])) as Record<PatternId, number>;
  const bestShare = share(best);
  const topPattern = PATTERN_IDS.reduce(
    (t, p) => (bestShare[p] > t.share ? { pattern: p, share: bestShare[p] } : t),
    { pattern: 'SINGLE' as PatternId, share: -1 },
  );
  return {
    deals: n,
    atLeast3x: n ? ge3 / n : 0,
    ratio: quantiles(ratio),
    ratioNext: quantiles(ratioNext),
    bestScore: quantiles(scores),
    bestShare,
    available: share(avail),
    topPattern,
  };
}

export function runSpread(n: number, seed: string): SpreadStats {
  return summariseSpread(spreadDeals(seed, 0, n));
}
