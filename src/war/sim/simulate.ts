/**
 * Runs the whole simulator: the calibration rows, the choice spread and (optionally) full
 * runs, then the gates. Work is cut into jobs and handed to an executor, so the CLI can spread
 * it over worker processes while tests run it in-process.
 */
import type { RunBot, RunOutcome } from './builder';
import { CALIBRATION, mergeTallies, type RowTally } from './calibration';
import { evaluateGates, GATE_ROWS, type GateOptions, type GateResult } from './gates';
import { runJob, slices, type Job, type JobResult } from './jobs';
import { summariseSpread, type DealSpread, type SpreadStats } from './spread';

export interface SimOptions {
  seed: string;
  /** Crises per calibration row. */
  crises: number;
  /** Fresh deals for the choice spread. */
  deals: number;
  /** Calibration rows to play (default: all). The gate rows are always played. */
  rows?: readonly string[];
  /** Full runs per bot (none by default). */
  runs?: Partial<Record<RunBot, number>>;
  gates?: GateOptions;
}

export interface SimResults {
  seed: string;
  tallies: Record<string, RowTally>;
  spread: SpreadStats;
  runs: Partial<Record<RunBot, RunOutcome[]>>;
  gates: GateResult[];
}

export type Executor = (jobs: readonly Job[], onDone?: (done: number, total: number) => void) => Promise<JobResult[]>;

export const inProcess: Executor = async (jobs, onDone) =>
  jobs.map((job, i) => {
    const r = runJob(job);
    onDone?.(i + 1, jobs.length);
    return r;
  });

/** Jobs sized so that each takes a second or two. */
const SLICE = { row: 50, spread: 250, runs: 10 } as const;

export function planJobs(opts: SimOptions): Job[] {
  const { seed } = opts;
  const rows = new Set<string>([...(opts.rows ?? CALIBRATION.map((r) => r.id)), ...GATE_ROWS]);
  const jobs: Job[] = [];
  // Slowest first, so a pool of workers finishes together.
  for (const [bot, n] of Object.entries(opts.runs ?? {}) as Array<[RunBot, number]>) {
    for (const [from, to] of slices(n, SLICE.runs)) jobs.push({ kind: 'runs', bot, seed, from, to });
  }
  for (const row of CALIBRATION.filter((r) => rows.has(r.id))) {
    for (const [from, to] of slices(opts.crises, SLICE.row)) jobs.push({ kind: 'row', row: row.id, seed, from, to });
  }
  for (const [from, to] of slices(opts.deals, SLICE.spread)) jobs.push({ kind: 'spread', seed, from, to });
  return jobs;
}

export function collect(seed: string, results: readonly JobResult[], gateOpts?: GateOptions): SimResults {
  const tallies: Record<string, RowTally> = {};
  const deals: DealSpread[][] = [];
  const runs: Partial<Record<RunBot, RunOutcome[]>> = {};
  for (const r of results) {
    if (r.kind === 'row') tallies[r.tally.id] = tallies[r.tally.id] ? mergeTallies(tallies[r.tally.id], r.tally) : r.tally;
    else if (r.kind === 'spread') deals.push(r.deals);
    else (runs[r.bot] ??= []).push(...r.runs);
  }
  const spread = summariseSpread(deals.flat());
  return { seed, tallies, spread, runs, gates: evaluateGates({ spread, rows: tallies }, gateOpts) };
}

export async function simulate(opts: SimOptions, exec: Executor = inProcess, onDone?: (done: number, total: number) => void): Promise<SimResults> {
  const results = await exec(planJobs(opts), onDone);
  return collect(opts.seed, results, opts.gates);
}
