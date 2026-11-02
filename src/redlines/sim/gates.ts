/**
 * The statistics of a batch of games and the gates judged on them (2,000 games per bot), as SPEC-SMALL's ruling
 * "Ten weeks, not eight" states them:
 * - G1 passive loses (war or frozen) in more than 70%;
 * - G2 the far-promise opening (the review's: a promise two moves from both pieces, backed from afar) wins at
 *   most half as often as sensible;
 * - G3 sensible wins (treaty) between a third and a half; G4 ends FROZEN in fewer than 20%;
 * - G5 the median sensible treaty is signed in week 5 to 7;
 * - G6 every game's debrief has at least six hidden lines;
 * - G7 no game stalls;
 * - G8 the no-orders bot (sitting still) wins at most half as often as sensible;
 * - G9 the seller (a far promise sold back) wins at least ten points less often than sensible;
 * - G10 no line reaches the player with a slot unfilled;
 * - G11 the shark (SPEC-SMALL "No formula wins": the strongest visible-information line the second review found) signs
 *   at most 60%; G12 no one-rule bot (summits only; never move a piece) signs more than 45%.
 * The careful hand is reported beside them, never gated (SPEC-SMALL "Hand play is reported, not gated"), and
 * every game's invariants (invariants.ts) are counted apart: any broken one fails --strict.
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
  /** Games in which a solid test went unbacked for want of influence. */
  shortSolidGames: number;
  /** Rules broken over the batch (must be 0), and the first one in words. */
  broken: number;
  brokenFirst: string | null;
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
    shortSolidGames: games.filter((g) => g.shortSolid > 0).length,
    broken: games.reduce((a, g) => a + g.broken, 0),
    brokenFirst: games.find((g) => g.brokenFirst)?.brokenFirst ?? null,
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
  /** SPEC-SMALL ruling: the far-promise opening wins at most half as often as sensible. */
  farShare: 0.5,
  sensibleTreaty: [1 / 3, 1 / 2] as const,
  /** SPEC-SMALL ruling ("Ten weeks, not eight"): FROZEN under 20%. */
  sensibleFrozenMax: 0.2,
  treatyWeek: [5, 7] as const,
  minHidden: 6,
  /** SPEC-SMALL ruling: a no-orders bot wins at most half as often as the sensible bot. */
  noOrdersShare: 0.5,
  /** The seller sits at least this many points of treaty share under sensible. */
  sellerGap: 0.1,
  /** SPEC-SMALL "No formula wins": the shark signs at most 60%; no one-rule bot (summits only; never move a piece) more than 45%. */
  sharkMax: 0.6,
  oneRuleMax: 0.45,
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
    out.push({ id: 'G2', text: 'The far-promise opening wins at most half as often as sensible', value: `${pct(a)} vs ${pct(b)}`, pass: a <= b * GATES.farShare });
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
  const shark = stats.shark;
  if (shark) {
    const a = share(shark.treaty, shark.games);
    out.push({ id: 'G11', text: 'The shark (the strongest visible line found) signs at most 60%', value: pct(a), pass: a <= GATES.sharkMax });
  }
  const oneRule = (['summit-only', 'shark-still'] as BotName[]).map((b) => stats[b]).filter((x): x is BotStats => !!x);
  if (oneRule.length) {
    const best = oneRule.reduce((a, b) => (share(b.treaty, b.games) > share(a.treaty, a.games) ? b : a));
    const a = share(best.treaty, best.games);
    out.push({ id: 'G12', text: 'No one-rule bot (summits only; never move a piece) signs more than 45%', value: `${pct(a)} (${best.bot})`, pass: a <= GATES.oneRuleMax });
  }
  return out;
}
