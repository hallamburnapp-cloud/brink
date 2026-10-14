/**
 * The calibration table (spec section 7): one crisis per run, from a fresh map (no traffic,
 * Playbooks, stamps or brass), no Airlift, a fixed staff line-up and maybe a Summit twist.
 * Crisis i of every row is dealt from seed `${seed}-${i}`, so rows share their opening deals.
 */
import { Rng } from '../../engine/rng';
import { COLOUR_ORDER } from '../content/map';
import type { StaffId, TwistKind } from '../engine';
import { playGreedyCrisis, type CrisisOutcome } from './greedy';
import { playRandomCrisis } from './random-bot';
import type { RefRate } from './reference';
import { crisisState, type TwistSpec } from './setup';

export type BotKind = 'greedy' | 'random';

export interface CalibrationRow {
  id: string;
  /** The staff line-up as the spec names it. */
  build: string;
  /** Seated left to right (order matters: Duty's +4 lands before the Strategist's x2). */
  staff: readonly StaffId[];
  twist: TwistKind | null;
  target: number;
  bot: BotKind;
  /** Spec section 7, percent. */
  spec: number;
  /** The reference run the spec number was rounded from. */
  ref: RefRate;
}

const NONE: readonly StaffId[] = [];
const DUTY: readonly StaffId[] = ['DUTY'];
const DUTY_HOTLINE: readonly StaffId[] = ['DUTY', 'HOTLINE'];
const HOTLINE_DUTY_STRATEGIST: readonly StaffId[] = ['HOTLINE', 'DUTY', 'STRATEGIST'];

type RowSpec = [build: string, staff: readonly StaffId[], twist: TwistKind | null, target: number, spec: number, ref: number, refN: number];

const greedy: RowSpec[] = [
  ['No staff', NONE, null, 300, 100, 100, 200],
  ['No staff', NONE, null, 450, 100, 100, 200],
  ['No staff', NONE, null, 600, 98, 98, 200],
  ['No staff', NONE, null, 900, 90, 90, 200],
  ['No staff', NONE, null, 1350, 71, 71, 200],
  ['No staff', NONE, null, 1800, 34, 34, 200],
  ['No staff', NONE, null, 2500, 7, 7, 200],
  ['No staff', NONE, 'GRIDLOCK', 600, 84, 83.5, 200],
  ['Duty Officer', DUTY, null, 1800, 92, 92, 200],
  ['Duty Officer', DUTY, null, 2500, 50, 49.5, 200],
  ['Duty Officer', DUTY, null, 3750, 10, 10, 200],
  ['Duty Officer + Hotline Operator', DUTY_HOTLINE, null, 2500, 99, 99, 200],
  ['Duty Officer + Hotline Operator', DUTY_HOTLINE, null, 3750, 83, 83, 200],
  ['Duty Officer + Hotline Operator', DUTY_HOTLINE, null, 5000, 59, 58.5, 200],
  ['Duty Officer + Hotline Operator', DUTY_HOTLINE, 'BLACKOUT', 1800, 100, 100, 200],
  ['Duty + Hotline + Strategist', HOTLINE_DUTY_STRATEGIST, null, 3750, 97, 96.5, 200],
  ['Duty + Hotline + Strategist', HOTLINE_DUTY_STRATEGIST, null, 5000, 93, 92.5, 200],
  ['Duty + Hotline + Strategist', HOTLINE_DUTY_STRATEGIST, 'FULL_TABLE', 5000, 92, 91.5, 200],
  ['Duty + Hotline + Strategist', HOTLINE_DUTY_STRATEGIST, null, 9000, 54, 53.5, 200],
];

const STAFF_KEY: Record<string, string> = {
  'No staff': 'bare',
  'Duty Officer': 'duty',
  'Duty Officer + Hotline Operator': 'duty-hotline',
  'Duty + Hotline + Strategist': 'hotline-duty-strategist',
};

const rowId = (build: string, twist: TwistKind | null, target: number) =>
  [STAFF_KEY[build], twist?.toLowerCase().replace('_', '-'), target].filter(Boolean).join('-');

export const CALIBRATION: readonly CalibrationRow[] = [
  ...greedy.map(([build, staff, twist, target, spec, ref, refN]) => ({
    id: rowId(build, twist, target),
    build,
    staff,
    twist,
    target,
    bot: 'greedy' as const,
    spec,
    ref: { pct: ref, n: refN },
  })),
  {
    id: 'random-300',
    build: 'Random tapper',
    staff: NONE,
    twist: null,
    target: 300,
    bot: 'random',
    spec: 9,
    ref: { pct: 9.3, n: 2000 },
  },
];

export function calibrationRow(id: string): CalibrationRow {
  const row = CALIBRATION.find((r) => r.id === id);
  if (!row) throw new Error(`no calibration row '${id}'`);
  return row;
}

/** Crisis `i` of a row: the setup the bot plays. */
export function rowCrisis(row: CalibrationRow, seed: string, i: number) {
  const crisisSeed = `${seed}-${i}`;
  let twist: TwistSpec | null = null;
  if (row.twist) {
    const colour = row.twist === 'BLACKOUT' ? new Rng(`${crisisSeed}:blackout`).pick(COLOUR_ORDER) : null;
    twist = { kind: row.twist, colour };
  }
  return crisisState({ seed: crisisSeed, target: BigInt(row.target), staff: row.staff, twist });
}

/** Play crisis `i` of a row. */
export function playRowCrisis(row: CalibrationRow, seed: string, i: number): CrisisOutcome {
  const s = rowCrisis(row, seed, i);
  return row.bot === 'random' ? playRandomCrisis(s, new Rng(`${seed}-${i}:tapper`)) : playGreedyCrisis(s);
}

export interface RowTally {
  id: string;
  n: number;
  cleared: number;
  /** Crisis totals, for the median. */
  totals: number[];
}

/** Play crises [from, to) of a row. */
export function tallyRow(row: CalibrationRow, seed: string, from: number, to: number): RowTally {
  const t: RowTally = { id: row.id, n: 0, cleared: 0, totals: [] };
  for (let i = from; i < to; i++) {
    const o = playRowCrisis(row, seed, i);
    t.n++;
    if (o.cleared) t.cleared++;
    t.totals.push(Number(o.total));
  }
  return t;
}

export function mergeTallies(a: RowTally, b: RowTally): RowTally {
  return { id: a.id, n: a.n + b.n, cleared: a.cleared + b.cleared, totals: [...a.totals, ...b.totals] };
}

/** Python's statistics.median. */
export function median(xs: readonly number[]): number {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
