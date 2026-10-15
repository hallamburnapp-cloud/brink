/**
 * The simulator: N games per bot, cut into jobs that an executor runs (in this process for tests,
 * or across worker processes in the CLI), then summarised into the statistics and the gates.
 * Seeds are `${prefix}0` ... `${prefix}${N-1}` for every bot, so all bots see the same war starts
 * (the reference uses 'W0' ... too; the TypeScript engine has its own seeded streams, so the games
 * themselves differ from the reference's).
 */
import type { BotName } from './bots';
import { evaluateGates, type GateResult, type StatsByBot } from './gates';
import { playGame } from './play';
import { BOT_NAMES } from './roster';
import { curve, digest, summarize, type BotStats, type CurvePoint, type GameDigest } from './summary';

/** A slice [from, to) of one bot's games. Pure and seeded by index, so slices merge in any order. */
export interface Job {
  bot: BotName;
  prefix: string;
  from: number;
  to: number;
}

export interface JobResult {
  bot: BotName;
  games: GameDigest[];
}

export function runJob(job: Job): JobResult {
  const games: GameDigest[] = [];
  for (let i = job.from; i < job.to; i++) games.push(digest(playGame(`${job.prefix}${i}`, job.bot)));
  return { bot: job.bot, games };
}

export interface SimOptions {
  /** Games per bot. */
  games: number;
  /** Bots to play (default all six; the gates need all six). */
  bots?: readonly BotName[];
  /** Seed prefix (default 'W'). */
  prefix?: string;
  /** Games per job (default 25). */
  slice?: number;
}

/** The look-ahead shoppers are the slow ones; their jobs go first so a pool of workers finishes together. */
const COST: Readonly<Record<BotName, number>> = { sensible: 0, breaker: 1, preview: 2, greedy: 3, novice: 4, random: 5 };

export function planJobs(opts: SimOptions): Job[] {
  const prefix = opts.prefix ?? 'W';
  const size = opts.slice ?? 25;
  const bots = [...(opts.bots ?? BOT_NAMES)].sort((a, b) => COST[a] - COST[b]);
  const jobs: Job[] = [];
  for (const bot of bots) for (let from = 0; from < opts.games; from += size) jobs.push({ bot, prefix, from, to: Math.min(opts.games, from + size) });
  return jobs;
}

export interface SimResults {
  games: number;
  prefix: string;
  stats: StatsByBot;
  curves: Partial<Record<BotName, CurvePoint[]>>;
  gates: GateResult[];
}

export function collect(opts: SimOptions, results: readonly JobResult[]): SimResults {
  const byBot = new Map<BotName, GameDigest[]>();
  for (const r of results) byBot.set(r.bot, [...(byBot.get(r.bot) ?? []), ...r.games]);
  const stats: Partial<Record<BotName, BotStats>> = {};
  const curves: SimResults['curves'] = {};
  for (const bot of BOT_NAMES) {
    const games = byBot.get(bot);
    if (!games?.length) continue;
    // Seed order, whatever order the jobs finished in.
    games.sort((a, b) => Number(a.seed.slice(a.seed.search(/\d+$/))) - Number(b.seed.slice(b.seed.search(/\d+$/))));
    stats[bot] = summarize(bot, games);
    curves[bot] = curve(games);
  }
  return { games: opts.games, prefix: opts.prefix ?? 'W', stats, curves, gates: evaluateGates(stats) };
}

export type Executor = (jobs: readonly Job[], onDone?: (done: number, total: number) => void) => Promise<JobResult[]>;

export const inProcess: Executor = async (jobs, onDone) =>
  jobs.map((job, i) => {
    const r = runJob(job);
    onDone?.(i + 1, jobs.length);
    return r;
  });

export async function simulate(opts: SimOptions, exec: Executor = inProcess, onDone?: (done: number, total: number) => void): Promise<SimResults> {
  return collect(opts, await exec(planJobs(opts), onDone));
}
