/**
 * The statistics of a batch of games and the gates judged on them (2,000 games per bot). BUILD.md's:
 * - G1 passive loses (war or frozen) in more than 70%;
 * - G2 the far-promise opening wins no more often than sensible;
 * - G3 sensible wins (treaty) between a third and a half; G4 ends FROZEN in fewer than 20% (BUILD said 15;
 *   SPEC-SMALL lets it sit at 20 if the gentler spread needs it);
 * - G5 the median sensible treaty is signed in week 5 to 7;
 * - G6 every game's debrief has at least six hidden lines;
 * - G7 no game stalls.
 * SPEC-SMALL's rulings after the first review add:
 * - G8 the no-orders bot (sitting still) wins at most half as often as sensible;
 * - G9 the seller (a far promise sold back) wins at least ten points less often than sensible;
 * - G10 no line reaches the player with a slot unfilled.
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
  /** Lines (tape, debrief, ending) that reached the player with a `{slot}` unfilled, over the batch. */
  unfilled: number;
  /** Share of weeks in which the bot gave no orders at all. */
  idleShare: number;
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
    unfilled: games.reduce((a, g) => a + g.unfilled, 0),
    idleShare: share(games.reduce((a, g) => a + g.idleWeeks, 0), games.reduce((a, g) => a + g.weeks, 0)),
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
  /** BUILD.md said 15%; SPEC-SMALL ("The other side") lets the frozen gate sit at 20% to keep the gentler spread. */
  sensibleFrozenMax: 0.2,
  treatyWeek: [5, 7] as const,
  minHidden: 6,
  /** SPEC-SMALL ruling: a no-orders bot wins at most half as often as the sensible bot. */
  noOrdersShare: 0.5,
  /** The seller sits at least this many points of treaty share under sensible. */
  sellerGap: 0.1,
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
    out.push({ id: 'G4', text: 'Sensible ends FROZEN in fewer than 20%', value: pct(frozen), pass: frozen < GATES.sensibleFrozenMax });
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
  const n = stats['no-orders'];
  if (n && s) {
    const a = share(n.treaty, n.games);
    const b = share(s.treaty, s.games);
    out.push({ id: 'G8', text: 'Sitting still (no orders) wins at most half as often as sensible', value: `${pct(a)} vs ${pct(b)}`, pass: a <= b * GATES.noOrdersShare });
  }
  const sell = stats.seller;
  if (sell && s) {
    const a = share(sell.treaty, sell.games);
    const b = share(s.treaty, s.games);
    out.push({ id: 'G9', text: 'The sold far promise wins at least ten points less often than sensible', value: `${pct(a)} vs ${pct(b)}`, pass: a <= b - GATES.sellerGap });
  }
  if (all.length) {
    const unfilled = all.reduce((a, x) => a + x.unfilled, 0);
    out.push({ id: 'G10', text: 'No line reaches the player with a slot unfilled', value: String(unfilled), pass: unfilled === 0 });
  }
  return out;
}
