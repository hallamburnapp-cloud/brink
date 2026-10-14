/**
 * Cross-check against the Python reference: play crises with the TypeScript bots, export each
 * deck order (and the random tapper's picks) to JSON, replay them in docs/war/reference with
 * crosscheck.py, and compare every committed sweep (pins, pattern, leverage) and the result.
 * The choice spread is checked the same way, deal by deal. Needs python3; dev-only.
 *
 * Ties: the spec breaks a tie between two equal-weight Surround rings towards the westmost
 * ringed region; the reference takes the last in map order. By default the replay patches the
 * reference to the spec's rule (ties: 'spec'), so any difference is a real one; ties: 'reference'
 * runs it as shipped, to count how often that ruling changes a sweep.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RegionId, StaffId } from '../engine';
import { calibrationRow, rowCrisis } from './calibration';
import { playGreedyCrisis, type CrisisOutcome } from './greedy';
import { playRandomCrisis } from './random-bot';
import { Rng } from '../../engine/rng';
import { crisisState } from './setup';
import { dealSpread, randomDeal, type DealSpread } from './spread';

/** Rows replayed: every staff line-up and twist the calibration uses, plus an Airlift row. */
export const CROSSCHECK_ROWS = [
  'bare-900',
  'bare-2500',
  'bare-gridlock-600',
  'duty-2500',
  'duty-hotline-5000',
  'duty-hotline-blackout-1800',
  'hotline-duty-strategist-full-table-5000',
  'hotline-duty-strategist-9000',
  'random-300',
  'bare-900-airlift',
] as const;

interface SweepLine {
  pins: RegionId[];
  pattern: string;
  leverage: string;
}

interface CrisisCase {
  id: string;
  row: string;
  bot: 'greedy' | 'random';
  target: number;
  staff: readonly StaffId[];
  twist: { kind: string; colour: string | null } | null;
  airlift: boolean;
  opening: RegionId[];
  reshuffles: RegionId[][];
  picks?: RegionId[][];
  expect: { cleared: boolean; total: string; sweepsLeft: number; sweeps: SweepLine[] };
}

interface PyCrisis {
  id: string;
  cleared?: boolean;
  total?: string;
  sweepsLeft?: number;
  sweeps: SweepLine[];
  error?: string;
}

interface PyDeal {
  id: string;
  best: string;
  bestPattern: string;
  middleSum: string;
  bestOther: string;
}

function sweepsOf(o: CrisisOutcome): SweepLine[] {
  return o.steps.flatMap((st) =>
    st.kind === 'sweep'
      ? [{ pins: st.airlift ? [...st.pins, st.airlift] : st.pins, pattern: st.pattern, leverage: st.leverage.toString() }]
      : [],
  );
}

function crisisCase(rowKey: string, seed: string, i: number): CrisisCase {
  const airlift = rowKey.endsWith('-airlift');
  const row = calibrationRow(airlift ? rowKey.slice(0, -'-airlift'.length) : rowKey);
  let start = rowCrisis(row, seed, i);
  if (airlift) start = crisisState({ seed: `${seed}-${i}`, target: BigInt(row.target), staff: row.staff, airlift: true });
  const twist = row.twist ? start.hour.twist : null;
  const o =
    row.bot === 'random' ? playRandomCrisis(start, new Rng(`${seed}-${i}:tapper`)) : playGreedyCrisis(start);
  return {
    id: `${rowKey}#${i}`,
    row: rowKey,
    bot: row.bot,
    target: row.target,
    staff: row.staff,
    twist: twist && { kind: twist.kind, colour: twist.colour },
    airlift,
    opening: o.deck.opening,
    reshuffles: o.deck.reshuffles,
    picks: row.bot === 'random' ? sweepsOf(o).map((s) => s.pins) : undefined,
    expect: { cleared: o.cleared, total: o.total.toString(), sweepsLeft: o.sweepsLeft, sweeps: sweepsOf(o) },
  };
}

const same = (a: SweepLine[], b: SweepLine[]) =>
  a.length === b.length &&
  a.every((x, k) => x.leverage === b[k].leverage && x.pattern === b[k].pattern && x.pins.join() === b[k].pins.join());

/** Why a replayed crisis differs from ours, or null. */
function crisisDiff(ours: CrisisCase, py: PyCrisis | undefined): string | null {
  if (!py) return 'missing from the reference output';
  if (py.error) return py.error;
  const e = ours.expect;
  if (!same(e.sweeps, py.sweeps)) {
    const k = e.sweeps.findIndex((s, j) => !same([s], py.sweeps[j] ? [py.sweeps[j]] : []));
    const show = (s?: SweepLine) => (s ? `${s.pattern} ${s.leverage} [${s.pins.join(' ')}]` : 'none');
    return `sweep ${k + 1}: port ${show(e.sweeps[k])}, reference ${show(py.sweeps[k])}`;
  }
  if (e.cleared !== py.cleared || e.total !== py.total || e.sweepsLeft !== py.sweepsLeft) {
    return `result: port ${e.cleared} ${e.total} (${e.sweepsLeft} left), reference ${py.cleared} ${py.total} (${py.sweepsLeft} left)`;
  }
  return null;
}

function dealDiff(ours: DealSpread, py: PyDeal | undefined): string | null {
  if (!py) return 'missing from the reference output';
  const got = [ours.best.toString(), ours.bestPattern, ours.middleSum.toString(), ours.bestOther.toString()];
  const want = [py.best, py.bestPattern, py.middleSum, py.bestOther];
  return got.join() === want.join() ? null : `port ${got.join(' / ')}, reference ${want.join(' / ')}`;
}

export interface CrosscheckResult {
  ok: boolean;
  text: string;
  /** Every difference found, for the report. */
  differences: string[];
}

/** Replay `crises` crises per row and `deals` spread deals in Python and compare. */
export function runCrosscheck(opts: {
  seed: string;
  crises: number;
  deals: number;
  ties?: 'spec' | 'reference';
  python?: string;
}): CrosscheckResult {
  const crises = CROSSCHECK_ROWS.flatMap((row) => Array.from({ length: opts.crises }, (_, i) => crisisCase(row, opts.seed, i)));
  const deals = Array.from({ length: opts.deals }, (_, i) => ({ id: `deal#${i}`, deal: randomDeal(opts.seed, i) }));
  const ourDeals = deals.map((d) => dealSpread(d.deal));

  const dir = mkdtempSync(join(tmpdir(), 'war-crosscheck-'));
  try {
    const input = join(dir, 'cases.json');
    const output = join(dir, 'results.json');
    writeFileSync(input, JSON.stringify({ crises, deals }));
    const script = fileURLToPath(new URL('./crosscheck.py', import.meta.url));
    const run = spawnSync(opts.python ?? 'python3', ['-B', script, input, output, `${opts.ties ?? 'spec'}-ties`], { encoding: 'utf8' });
    if (run.status !== 0) {
      const why = run.error ? String(run.error) : run.stderr.trim().split('\n').slice(-3).join(' ');
      return { ok: false, text: `Python replay failed: ${why}`, differences: [why] };
    }
    const py = JSON.parse(readFileSync(output, 'utf8')) as { crises: PyCrisis[]; deals: PyDeal[] };
    const pyCrisis = new Map(py.crises.map((c) => [c.id, c]));
    const pyDeal = new Map(py.deals.map((d) => [d.id, d]));

    const differences: string[] = [];
    const lines: string[] = [];
    for (const row of CROSSCHECK_ROWS) {
      const cases = crises.filter((c) => c.row === row);
      const diffs = cases.map((c) => [c, crisisDiff(c, pyCrisis.get(c.id))] as const).filter(([, d]) => d);
      const sweeps = cases.reduce((n, c) => n + c.expect.sweeps.length, 0);
      lines.push(`  ${row.padEnd(42)} ${cases.length - diffs.length}/${cases.length} crises identical (${sweeps} sweeps)`);
      for (const [c, d] of diffs) differences.push(`${c.id}: ${d}`);
    }
    const dealDiffs = ourDeals.map((d, i) => [deals[i].id, dealDiff(d, pyDeal.get(deals[i].id))] as const).filter(([, d]) => d);
    lines.push(`  ${'choice spread deals'.padEnd(42)} ${ourDeals.length - dealDiffs.length}/${ourDeals.length} deals identical`);
    for (const [id, d] of dealDiffs) differences.push(`${id}: ${d}`);
    for (const d of differences.slice(0, 12)) lines.push(`    ${d}`);
    if (differences.length > 12) lines.push(`    ... and ${differences.length - 12} more`);
    return { ok: differences.length === 0, text: lines.join('\n'), differences };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
