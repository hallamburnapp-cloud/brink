/**
 * Numbers from the Python reference (docs/war/reference), for printing beside ours.
 * - Calibration: calib2.txt and calib2b.txt (200 crises per row, Random(5)), rounded in spec
 *   section 7; the random tapper from randbot.py (2,000 crises, Random(2)).
 * - Choice spread: `python3 final_spread.py 4000` (Random(1)).
 * - Gates: spec section 14 (the bracketed reference results).
 */
import type { PatternId } from '../engine';

export interface RefRate {
  /** Clear rate in percent, as the reference printed it. */
  pct: number;
  /** Crises the reference played for it. */
  n: number;
}

export const SPREAD_REF = {
  deals: 4000,
  atLeast3x: 0.96,
  ratio: { p10: 3.5, median: 8.4, p90: 16.0 },
  ratioNext: { p10: 1.17, median: 1.74, p90: 2.72 },
  bestScore: { p10: 120, median: 162, p90: 582 },
  bestShare: {
    SINGLE: 0.001,
    LINK: 0.011,
    TWO_LINKS: 0.075,
    WORLDWIDE: 0.206,
    CHAIN: 0.292,
    FRONT: 0.141,
    SURROUND: 0.163,
    NETWORK: 0.102,
    BLOC: 0.011,
    WHOLE_BLOC: 0,
    AROUND_THE_WORLD: 0,
  } satisfies Record<PatternId, number>,
  available: {
    SINGLE: 1,
    LINK: 0.994,
    TWO_LINKS: 0.776,
    WORLDWIDE: 0.444,
    CHAIN: 0.692,
    FRONT: 0.288,
    SURROUND: 0.21,
    NETWORK: 0.107,
    BLOC: 0.011,
    WHOLE_BLOC: 0,
    AROUND_THE_WORLD: 0,
  } satisfies Record<PatternId, number>,
} as const;

/**
 * A larger re-run of the reference calibration: the same loop (calib2.py's play_crisis,
 * Random(5), no Airlift) at 1,000 crises per row, so its figures are within about +/-3 points
 * rather than the +/-7 of the spec's 200-crisis rows (`python3 src/war/sim/reference-rerun.py
 * 1000 5`). The random tapper is randbot.py as shipped.
 */
export const PY_RERUN: Readonly<Record<string, RefRate>> = {
  'bare-300': { pct: 100.0, n: 1000 },
  'bare-450': { pct: 99.8, n: 1000 },
  'bare-600': { pct: 97.7, n: 1000 },
  'bare-900': { pct: 93.0, n: 1000 },
  'bare-1350': { pct: 72.9, n: 1000 },
  'bare-1800': { pct: 38.0, n: 1000 },
  'bare-2500': { pct: 8.0, n: 1000 },
  'bare-gridlock-600': { pct: 83.3, n: 1000 },
  'duty-1800': { pct: 90.1, n: 1000 },
  'duty-2500': { pct: 56.7, n: 1000 },
  'duty-3750': { pct: 11.7, n: 1000 },
  'duty-hotline-2500': { pct: 98.4, n: 1000 },
  'duty-hotline-3750': { pct: 85.6, n: 1000 },
  'duty-hotline-5000': { pct: 59.4, n: 1000 },
  'duty-hotline-blackout-1800': { pct: 99.4, n: 1000 },
  'hotline-duty-strategist-3750': { pct: 96.6, n: 1000 },
  'hotline-duty-strategist-5000': { pct: 92.0, n: 1000 },
  'hotline-duty-strategist-full-table-5000': { pct: 91.2, n: 1000 },
  'hotline-duty-strategist-9000': { pct: 57.9, n: 1000 },
  'random-300': { pct: 9.3, n: 2000 },
};
