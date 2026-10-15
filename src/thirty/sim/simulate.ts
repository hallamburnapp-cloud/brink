/**
 * Play N games per bot and judge the gates. Games are seeded `${prefix}${i}` for every bot, so the two
 * bots play the same maps and the same cards fall the same way where the choices agree.
 */
import type { ThirtyContent } from '../content/types.ts';
import { BOTS, BOT_NAMES, type BotName } from './bots.ts';
import { evaluateGates, summarise, type BotStats, type Gate } from './gates.ts';
import { playGame, type GameRecord } from './play.ts';

export interface SimOptions {
  games: number;
  bots: readonly BotName[];
  prefix: string;
  onProgress?: (done: number, total: number) => void;
}

export interface SimResult {
  options: Omit<SimOptions, 'onProgress'>;
  stats: Partial<Record<BotName, BotStats>>;
  gates: Gate[];
  /** Every game, for anyone who wants to dig. */
  games: Partial<Record<BotName, GameRecord[]>>;
  seconds: number;
}

export function simulate(content: ThirtyContent, opts: SimOptions): SimResult {
  const started = Date.now();
  const bots = opts.bots.length ? opts.bots : BOT_NAMES;
  const games: Partial<Record<BotName, GameRecord[]>> = {};
  const stats: Partial<Record<BotName, BotStats>> = {};
  const total = bots.length * opts.games;
  let done = 0;
  for (const name of bots) {
    const rows: GameRecord[] = [];
    for (let i = 0; i < opts.games; i++) {
      rows.push(playGame(content, BOTS[name], `${opts.prefix}${i}`));
      opts.onProgress?.(++done, total);
    }
    games[name] = rows;
    stats[name] = summarise(content, name, rows);
  }
  return {
    options: { games: opts.games, bots, prefix: opts.prefix },
    stats,
    gates: evaluateGates(content, stats),
    games,
    seconds: (Date.now() - started) / 1000,
  };
}
