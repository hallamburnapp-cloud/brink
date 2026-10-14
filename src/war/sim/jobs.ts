/**
 * The simulator's units of work. Each job is a slice [from, to) of one table, pure and
 * seeded by index, so a slice gives the same answer in this process or in a worker and the
 * slices of a table can be merged in any order.
 */
import { calibrationRow, tallyRow, type RowTally } from './calibration';
import { playRuns, type RunBot, type RunOutcome } from './builder';
import { spreadDeals, type DealSpread } from './spread';

export type Job =
  | { kind: 'row'; row: string; seed: string; from: number; to: number }
  | { kind: 'spread'; seed: string; from: number; to: number }
  | { kind: 'runs'; bot: RunBot; seed: string; from: number; to: number };

export type JobResult =
  | { kind: 'row'; tally: RowTally }
  | { kind: 'spread'; deals: DealSpread[] }
  | { kind: 'runs'; bot: RunBot; runs: RunOutcome[] };

export function runJob(job: Job): JobResult {
  switch (job.kind) {
    case 'row':
      return { kind: 'row', tally: tallyRow(calibrationRow(job.row), job.seed, job.from, job.to) };
    case 'spread':
      return { kind: 'spread', deals: spreadDeals(job.seed, job.from, job.to) };
    case 'runs':
      return { kind: 'runs', bot: job.bot, runs: playRuns(job.bot, job.seed, job.from, job.to) };
  }
}

/** Split [0, n) into slices of about `size`. */
export function slices(n: number, size: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let from = 0; from < n; from += size) out.push([from, Math.min(n, from + size)]);
  return out;
}
