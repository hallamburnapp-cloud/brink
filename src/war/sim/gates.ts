/**
 * The five simulator gates (spec section 14) that must pass before the owner sees a build.
 * Each gate is one or two checks of a measured share against a threshold, printed beside the
 * reference result.
 */
import { PATTERN } from '../content/patterns';
import type { RowTally } from './calibration';
import type { SpreadStats } from './spread';

export interface GateCheck {
  label: string;
  /** Measured share, 0-1. */
  value: number;
  op: '>=' | '<=';
  threshold: number;
  /** The reference result, 0-1. */
  reference: number;
  /** Sample size behind `value`. */
  n: number;
  /** Slack allowed below / above the threshold (0 for the real gate). */
  tolerance: number;
  pass: boolean;
}

export interface GateResult {
  index: number;
  title: string;
  checks: GateCheck[];
  pass: boolean;
  /** Extra words for the value column (e.g. which pattern). */
  note?: string;
}

/** Calibration rows the gates read. */
export const GATE_ROWS = ['random-300', 'bare-300', 'bare-2500', 'duty-hotline-2500'] as const;

export interface GateInput {
  spread: SpreadStats;
  rows: Readonly<Record<string, RowTally>>;
}

export interface GateOptions {
  /** Slack for a check with this threshold on this many samples (default none). */
  tolerance?: (threshold: number, n: number) => number;
}

/** Two standard errors of a share near `threshold` measured on `n` samples. */
export const twoSigma = (threshold: number, n: number): number => 2 * Math.sqrt((threshold * (1 - threshold)) / n);

function check(
  label: string,
  value: number,
  op: GateCheck['op'],
  threshold: number,
  reference: number,
  n: number,
  opts: GateOptions,
): GateCheck {
  const tolerance = opts.tolerance ? opts.tolerance(threshold, n) : 0;
  const pass = op === '>=' ? value >= threshold - tolerance : value <= threshold + tolerance;
  return { label, value, op, threshold, reference, n, tolerance, pass };
}

function rate(rows: GateInput['rows'], id: string): { value: number; n: number } {
  const r = rows[id];
  if (!r || r.n === 0) throw new Error(`gate needs calibration row '${id}'`);
  return { value: r.cleared / r.n, n: r.n };
}

export function evaluateGates(input: GateInput, opts: GateOptions = {}): GateResult[] {
  const { spread, rows } = input;
  const random = rate(rows, 'random-300');
  const bare300 = rate(rows, 'bare-300');
  const bare2500 = rate(rows, 'bare-2500');
  const dh2500 = rate(rows, 'duty-hotline-2500');
  const gates: Array<Omit<GateResult, 'pass'>> = [
    {
      index: 1,
      title: 'Best legal play is at least 3x the median play',
      checks: [check('fresh deals', spread.atLeast3x, '>=', 0.9, 0.96, spread.deals, opts)],
    },
    {
      index: 2,
      title: 'No pattern is the best play in more than 30% of deals',
      checks: [check('most common best play', spread.topPattern.share, '<=', 0.3, 0.29, spread.deals, opts)],
      note: PATTERN[spread.topPattern.pattern].name,
    },
    {
      index: 3,
      title: 'Random tapper clears the 22:00 Flare-up (300)',
      checks: [check('random, 300', random.value, '<=', 0.15, 0.09, random.n, opts)],
    },
    {
      index: 4,
      title: 'Greedy, no staff: 22:00 Flare-up (300) and 00:00 Flare-up (2,500)',
      checks: [
        check('greedy, 300', bare300.value, '>=', 0.95, 1.0, bare300.n, opts),
        check('greedy, 2,500', bare2500.value, '<=', 0.15, 0.07, bare2500.n, opts),
      ],
    },
    {
      index: 5,
      title: 'Greedy, Duty Officer + Hotline Operator: 00:00 Flare-up (2,500)',
      checks: [check('duty + hotline, 2,500', dh2500.value, '>=', 0.9, 0.99, dh2500.n, opts)],
    },
  ];
  return gates.map((g) => ({ ...g, pass: g.checks.every((c) => c.pass) }));
}
