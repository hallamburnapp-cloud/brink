/**
 * The statistics of a batch of games and BUILD.md's gates judged on them (2,000 games per bot):
 * - passive loses (war or frozen) in more than 70%;
 * - the far-promise opening wins no more often than sensible;
 * - sensible wins (treaty) between a third and a half, and ends FROZEN in fewer than 15%;
 * - the median sensible treaty is signed in week 5 to 7;
 * - every game's debrief has at least six hidden lines;
 * - and no game stalls.
 */
import type { BotName } from './bots.ts';
import type { GameRecord } from './play.ts';
import { counts, mean, median, pct, share } from './stats.ts';

export interface BotStats {
  bot: BotName;
  games: number;
  treaty: number;
  war: number;
  frozen: number;
  stalls: number;
  medianScore: number;
  medianTreatyWeek: number;
  medianWarWeek: number;
  medianWarPeak: number;
  meanPhones: number;
  meanTests: number;
  meanBacked: number;
  meanBackedDown: number;
  meanWaited: number;
  meanWaysOutOffered: number;
  meanWaysOutAccepted: number;
  minHidden: number;
  medianHidden: number;
  shortGames: number;
  /** Games by the ladder's highest step. */
  stepPeaks: Record<string, number>;
  /** Treaty games by week. */
  treatyWeeks: Record<string, number>;
  /** Treaty share by appetite and jumpiness thirds (low, mid, high). */
  byAppetite: [number, number, number];
  byJumpiness: [number, number, number];
}

function third(x: number): 0 | 1 | 2 {
  return x < 0.4 ? 0 : x > 0.6 ? 2 : 1;
}

export function summarise(bot: BotName, games: readonly GameRecord[]): BotStats {
  const treaty = games.filter((g) => g.ending === 'treaty');
  const war = games.filter((g) => g.ending === 'war');
  const byA: [number, number, number] = [0, 0, 0];
  const nA: [number, number, number] = [0, 0, 0];
  const byJ: [number, number, number] = [0, 0, 0];
  const nJ: [number, number, number] = [0, 0, 0];
  for (const g of games) {
    const a = third(g.appetite);
    const j = third(g.jumpiness);
    nA[a]++;
    nJ[j]++;
    if (g.ending === 'treaty') {
      byA[a]++;
      byJ[j]++;
    }
  }
  return {
    bot,
    games: games.length,
    treaty: treaty.length,
    war: war.length,
    frozen: games.filter((g) => g.ending === 'frozen').length,
    stalls: games.filter((g) => g.ending === 'STALL').length,
    medianScore: median(games.map((g) => g.score)),
    medianTreatyWeek: median(treaty.map((g) => g.week)),
    medianWarWeek: median(war.map((g) => g.week)),
    medianWarPeak: median(games.map((g) => g.warPeak)),
    meanPhones: mean(games.map((g) => g.phones)),
    meanTests: mean(games.map((g) => g.tests)),
    meanBacked: mean(games.map((g) => g.backed)),
    meanBackedDown: mean(games.map((g) => g.backedDown)),
    meanWaited: mean(games.map((g) => g.waited)),
    meanWaysOutOffered: mean(games.map((g) => g.waysOutOffered)),
    meanWaysOutAccepted: mean(games.map((g) => g.waysOutAccepted)),
    minHidden: games.length ? Math.min(...games.map((g) => g.hidden)) : 0,
    medianHidden: median(games.map((g) => g.hidden)),
    shortGames: games.filter((g) => g.short > 0).length,
    stepPeaks: counts(games.map((g) => g.stepPeak)),
    treatyWeeks: counts(treaty.map((g) => g.week)),
    byAppetite: byA.map((n, i) => share(n, nA[i])) as [number, number, number],
    byJumpiness: byJ.map((n, i) => share(n, nJ[i])) as [number, number, number],
  };
}

export interface Gate {
  id: string;
  text: string;
  value: string;
  pass: boolean;
}

export const GATES = {
  passiveLoseMin: 0.7,
  sensibleTreaty: [1 / 3, 1 / 2] as const,
  sensibleFrozenMax: 0.15,
  treatyWeek: [5, 7] as const,
  minHidden: 6,
} as const;

/** Judge the gates on the batch; a gate whose bot was not played is left out. */
export function evaluateGates(stats: Partial<Record<BotName, BotStats>>): Gate[] {
  const out: Gate[] = [];
  const p = stats.passive;
  const f = stats['far-promise'];
  const s = stats.sensible;
  if (p) {
    const lose = share(p.war + p.frozen, p.games);
    out.push({ id: 'G1', text: 'Passive loses (war or frozen) in more than 70%', value: pct(lose), pass: lose > GATES.passiveLoseMin });
  }
  if (f && s) {
    const a = share(f.treaty, f.games);
    const b = share(s.treaty, s.games);
    out.push({ id: 'G2', text: 'The far-promise opening wins no more often than sensible', value: `${pct(a)} vs ${pct(b)}`, pass: a <= b });
  }
  if (s) {
    const win = share(s.treaty, s.games);
    const frozen = share(s.frozen, s.games);
    out.push({ id: 'G3', text: 'Sensible wins (treaty) between a third and a half', value: pct(win), pass: win >= GATES.sensibleTreaty[0] && win <= GATES.sensibleTreaty[1] });
    out.push({ id: 'G4', text: 'Sensible ends FROZEN in fewer than 15%', value: pct(frozen), pass: frozen < GATES.sensibleFrozenMax });
    out.push({
      id: 'G5',
      text: 'The median sensible treaty is signed in week 5 to 7',
      value: `week ${s.medianTreatyWeek}`,
      pass: s.medianTreatyWeek >= GATES.treatyWeek[0] && s.medianTreatyWeek <= GATES.treatyWeek[1],
    });
  }
  const all = Object.values(stats).filter((x): x is BotStats => !!x);
  if (all.length) {
    const minHidden = Math.min(...all.map((x) => x.minHidden));
    out.push({ id: 'G6', text: "Every game's debrief has at least six hidden lines", value: `min ${minHidden}`, pass: minHidden >= GATES.minHidden });
    const stalls = all.reduce((a, x) => a + x.stalls, 0);
    out.push({ id: 'G7', text: 'No game stalls', value: String(stalls), pass: stalls === 0 });
  }
  return out;
}
