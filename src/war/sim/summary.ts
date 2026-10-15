/**
 * From games to numbers (reference calibrate.py `_job`, `summarize`, `curve`): a compact digest of
 * each game, then every figure the gates and the report print for a bot.
 */
import type { Ending, StaffId } from '../engine';
import type { BotName } from './bots';
import type { SpreadSample } from './choose';
import type { GameLog } from './play';
import { mean, median, quantile, share, tally } from './stats';
import { FAST, FIRST, minutes, SLOW, STANDARD } from './timing';

/** One turn, as the by-turn curve reads it. */
export interface CurveRow {
  turn: number;
  target: number;
  score: number;
  win: boolean;
  gold: number;
  red: number;
}

export interface Minutes {
  std: number;
  first: number;
  slow: number;
  fast: number;
}

/** What one game contributes to the statistics (small enough to pass between processes). */
export interface GameDigest {
  bot: BotName;
  seed: string;
  end: Ending | 'STALL';
  turns: number;
  gold: number;
  red: number;
  grey: number;
  seats: StaffId[];
  shops: number;
  minutes: Minutes;
  /** The best send's score, and the best score ÷ target of any send. */
  best: number;
  bestRatio: number;
  /** The most regions one winning send took (0 without a win). */
  maxRegions: number;
  /** The most regions war held after any turn. */
  warPeak: number;
  misses: number;
  finalPush: boolean;
  /** Sends that pinned the crisis, of `sends`. */
  onCrisis: number;
  sends: number;
  /** Turns after which war spread by itself. */
  spreads: number;
  bought: number;
  /** Regions taken by each winning send. */
  winSizes: number[];
  /** Misses in a row at the end of the game. */
  tail: number;
  rows: CurveRow[];
  spread: SpreadSample[];
}

export function digest(g: GameLog): GameDigest {
  const log = g.log;
  let tail = 0;
  for (let i = log.length - 1; i >= 0 && log[i].result === 'miss'; i--) tail++;
  const wins = log.filter((t) => t.result === 'win');
  return {
    bot: g.bot,
    seed: g.seed,
    end: g.end,
    turns: g.turns,
    gold: g.gold,
    red: g.red,
    grey: g.grey,
    seats: g.seats,
    shops: g.shops,
    minutes: { std: minutes(log, STANDARD), first: minutes(log, FIRST), slow: minutes(log, SLOW), fast: minutes(log, FAST) },
    best: Math.max(0, ...log.map((t) => t.score)),
    bestRatio: Math.max(0, ...log.map((t) => t.score / t.target)),
    maxRegions: Math.max(0, ...wins.map((t) => t.won)),
    warPeak: Math.max(0, ...log.map((t) => t.red)),
    misses: log.length - wins.length,
    finalPush: log.some((t) => t.finalPush),
    onCrisis: log.filter((t) => t.onCrisis).length,
    sends: log.length,
    spreads: log.filter((t) => t.spread).length,
    bought: log.reduce((n, t) => n + (t.bought ?? 0), 0),
    winSizes: wins.map((t) => t.won),
    tail,
    rows: log.map((t) => ({ turn: t.turn, target: t.target, score: t.score, win: t.result === 'win', gold: t.gold, red: t.red })),
    spread: g.spread,
  };
}

/** A median with the 10th and 90th percentiles. */
export interface Spread3 {
  median: number;
  p10: number;
  p90: number;
}

const spread3 = (xs: readonly number[]): Spread3 => ({ median: median(xs), p10: quantile(xs, 0.1), p90: quantile(xs, 0.9) });

export interface BotStats {
  bot: BotName;
  n: number;
  worldUnited: number;
  ceasefire: number;
  war: number;
  stall: number;
  /** Holds the world: WORLD UNITED or CEASEFIRE. */
  held: number;
  heldGames: number;
  stalls: number;
  turns: Spread3;
  turnsHeld: number;
  turnsWorldUnited: number;
  turnsLost: number;
  maxTurns: number;
  /** Choice on the opening deal (every turn of every game). */
  spread2: number;
  spread3: number;
  spreadMedian: number;
  bestWinsMedianMisses: number;
  regionsBestMinusMedian: number;
  legalMedian: number;
  bestMedian: number;
  bestP90: number;
  bestMax: number;
  /** Games with a 1,000,000+ send. */
  million: number;
  /** Sends at 10x the target or more, of all sends. */
  ratio10: number;
  maxRegionsMedian: number;
  /** Games with a send that took 5+ regions. */
  flood5: number;
  /** Winning sends by regions taken. */
  sizes: Array<[number, number]>;
  missesMedian: number;
  tailMedian: number;
  tailP90: number;
  /** Held games in which war reached 6 or more (gate G10). */
  warPeak6InHeld: number;
  /** Held games in which war reached 8 or more, of all games. */
  warPeak8InHeld: number;
  /** WAR with 4 or fewer grey left, of all games (the slice's measure). */
  nearLoss: number;
  /** WAR while holding 18+ gold, of all games (G11). */
  closeLoss: number;
  /** WAR holding 8 or fewer gold, of all games (G12). */
  hopeless: number;
  lostGoldMedian: number;
  lostGreyMedian: number;
  finalPush: number;
  /** CEASEFIRE games by gold held. */
  ceasefireGold: Array<[number, number]>;
  long25: number;
  onCrisis: number;
  spreadsMedian: number;
  boughtMedian: number;
  minutes: Record<keyof Minutes, Spread3>;
  minutesHeld: Record<keyof Minutes, Spread3>;
  /** Staff in the final line-ups of held games, most common first (games, not shares). */
  staffHeld: Array<[StaffId, number]>;
  /** The raw samples the gates' sampling intervals need. */
  samples: { turns: number[]; minutesFirst: number[]; minutesFirstHeld: number[] };
}

const MINUTE_KEYS: ReadonlyArray<keyof Minutes> = ['std', 'first', 'slow', 'fast'];

export function summarize(bot: BotName, games: readonly GameDigest[]): BotStats {
  const n = games.length;
  const wu = games.filter((g) => g.end === 'WORLD UNITED');
  const cf = games.filter((g) => g.end === 'CEASEFIRE');
  const lost = games.filter((g) => g.end === 'WAR');
  const held = [...wu, ...cf];
  const sp = games.flatMap((g) => g.spread);
  const rows = games.flatMap((g) => g.rows);
  const minutesOf = (gs: readonly GameDigest[]) =>
    Object.fromEntries(MINUTE_KEYS.map((k) => [k, spread3(gs.map((g) => g.minutes[k]))])) as Record<keyof Minutes, Spread3>;
  return {
    bot,
    n,
    worldUnited: wu.length / n,
    ceasefire: cf.length / n,
    war: lost.length / n,
    stall: share(games, (g) => g.end === 'STALL'),
    held: held.length / n,
    heldGames: held.length,
    stalls: games.filter((g) => g.end === 'STALL').length,
    turns: spread3(games.map((g) => g.turns)),
    turnsHeld: median(held.map((g) => g.turns)),
    turnsWorldUnited: median(wu.map((g) => g.turns)),
    turnsLost: median(lost.map((g) => g.turns)),
    maxTurns: Math.max(...games.map((g) => g.turns)),
    spread2: share(sp, (s) => s.ratio >= 2),
    spread3: share(sp, (s) => s.ratio >= 3),
    spreadMedian: median(sp.map((s) => s.ratio)),
    bestWinsMedianMisses: share(sp, (s) => s.bestWins && !s.medianWins),
    regionsBestMinusMedian: mean(sp.map((s) => s.bestRegions - s.medianRegions)),
    legalMedian: median(sp.map((s) => s.legal)),
    bestMedian: median(games.map((g) => g.best)),
    bestP90: quantile(games.map((g) => g.best), 0.9),
    bestMax: Math.max(...games.map((g) => g.best)),
    million: share(games, (g) => g.best >= 1_000_000),
    ratio10: share(rows, (r) => r.score >= 10 * r.target, Math.max(1, rows.length)),
    maxRegionsMedian: median(games.map((g) => g.maxRegions)),
    flood5: share(games, (g) => g.maxRegions >= 5),
    sizes: tally(games.flatMap((g) => g.winSizes)).sort((a, b) => a[0] - b[0]),
    missesMedian: median(games.map((g) => g.misses)),
    tailMedian: median(lost.map((g) => g.tail)),
    tailP90: quantile(lost.map((g) => g.tail), 0.9),
    warPeak6InHeld: share(held, (g) => g.warPeak >= 6),
    warPeak8InHeld: share(held, (g) => g.warPeak >= 8, n),
    nearLoss: share(lost, (g) => g.grey <= 4, n),
    closeLoss: share(lost, (g) => g.gold >= 18, n),
    hopeless: share(lost, (g) => g.gold <= 8, n),
    lostGoldMedian: median(lost.map((g) => g.gold)),
    lostGreyMedian: median(lost.map((g) => g.grey)),
    finalPush: share(games, (g) => g.finalPush),
    ceasefireGold: tally(cf.map((g) => g.gold)).sort((a, b) => a[0] - b[0]),
    long25: share(games, (g) => g.turns >= 25),
    onCrisis: games.reduce((k, g) => k + g.onCrisis, 0) / Math.max(1, games.reduce((k, g) => k + g.sends, 0)),
    spreadsMedian: median(games.map((g) => g.spreads)),
    boughtMedian: median(games.map((g) => g.bought)),
    minutes: minutesOf(games),
    minutesHeld: minutesOf(held),
    staffHeld: tally(held.flatMap((g) => [...new Set(g.seats)])),
    samples: {
      turns: games.map((g) => g.turns),
      minutesFirst: games.map((g) => g.minutes.first),
      minutesFirstHeld: held.map((g) => g.minutes.first),
    },
  };
}

/** One turn of the by-turn curve: games still going at that turn. */
export interface CurvePoint {
  turn: number;
  target: number;
  games: number;
  medianScore: number;
  winShare: number;
  medianGold: number;
  medianRed: number;
}

/** The by-turn curve, while at least max(30, n/50) games are still going. */
export function curve(games: readonly GameDigest[], maxTurn = 30): CurvePoint[] {
  const out: CurvePoint[] = [];
  for (let t = 1; t <= maxTurn; t++) {
    const xs = games.flatMap((g) => g.rows.filter((r) => r.turn === t));
    if (xs.length < Math.max(30, Math.floor(games.length / 50))) break;
    out.push({
      turn: t,
      target: xs[0].target,
      games: xs.length,
      medianScore: median(xs.map((x) => x.score)),
      winShare: share(xs, (x) => x.win),
      medianGold: median(xs.map((x) => x.gold)),
      medianRed: median(xs.map((x) => x.red)),
    });
  }
  return out;
}
