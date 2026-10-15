/**
 * The statistics of a batch of games and SPEC "Balance gates" judged on them:
 * - Random choices: holds to day 30 in under 10% of games.
 * - Sensible: holds in 55 to 70%, stand-down early in 15 to 30%, war in the rest.
 * - Every piece is taken by the sensible bot in at least 10% of games; none in more than 70%.
 * - A game runs 20 to 30 days at the median; no game stalls.
 * - The median sensible game sees the gauge above 60 at least once.
 */
import type { PieceId, ThirtyContent } from '../content/types.ts';
import type { BotName } from './bots.ts';
import type { GameRecord } from './play.ts';
import { median, pct, quantile, share } from './stats.ts';

export interface BotStats {
  bot: BotName;
  games: number;
  held: number;
  standDown: number;
  war: number;
  stalls: number;
  clean: number;
  closeCalls: number;
  medianDay: number;
  medianPeak: number;
  peakP90: number;
  meanMapDays: number;
  meanRiskyDays: number;
  /** Games in which the piece was held at the end, per piece. */
  taken: Record<PieceId, number>;
  /** Games in which the piece was offered at least once. */
  offered: Record<PieceId, number>;
  /** Mean DANGER at the end of each day over games still going. */
  curve: number[];
  /** Hold rate by final team size. */
  heldByTeamSize: Record<number, { games: number; held: number }>;
}

export function summarise(content: ThirtyContent, bot: BotName, games: readonly GameRecord[]): BotStats {
  const taken: Record<PieceId, number> = Object.fromEntries(content.pieceOrder.map((p) => [p, 0]));
  const offered: Record<PieceId, number> = Object.fromEntries(content.pieceOrder.map((p) => [p, 0]));
  const curveSum: number[] = [];
  const curveN: number[] = [];
  const heldByTeamSize: BotStats['heldByTeamSize'] = {};
  for (const g of games) {
    for (const p of g.team) taken[p] = (taken[p] ?? 0) + 1;
    for (const p of new Set(g.offered)) offered[p] = (offered[p] ?? 0) + 1;
    g.curve.forEach((d, i) => {
      curveSum[i] = (curveSum[i] ?? 0) + d;
      curveN[i] = (curveN[i] ?? 0) + 1;
    });
    const row = (heldByTeamSize[g.team.length] ??= { games: 0, held: 0 });
    row.games++;
    if (g.ending === 'HELD') row.held++;
  }
  return {
    bot,
    games: games.length,
    held: games.filter((g) => g.ending === 'HELD').length,
    standDown: games.filter((g) => g.ending === 'STAND-DOWN').length,
    war: games.filter((g) => g.ending === 'WAR').length,
    stalls: games.filter((g) => g.ending === 'STALL').length,
    clean: games.filter((g) => g.clean).length,
    closeCalls: games.filter((g) => g.closeCall).length,
    medianDay: median(games.map((g) => g.day)),
    medianPeak: median(games.map((g) => g.peak)),
    peakP90: quantile(
      games.map((g) => g.peak),
      0.9,
    ),
    meanMapDays: games.length ? games.reduce((a, g) => a + g.mapDays, 0) / games.length : 0,
    meanRiskyDays: games.length ? games.reduce((a, g) => a + g.riskyDays, 0) / games.length : 0,
    taken,
    offered,
    curve: curveSum.map((s, i) => s / curveN[i]),
    heldByTeamSize,
  };
}

export interface Gate {
  id: string;
  text: string;
  value: string;
  pass: boolean;
}

export const GATES = {
  randomHoldMax: 0.1,
  sensibleHold: [0.55, 0.7] as const,
  sensibleStandDown: [0.15, 0.3] as const,
  pieceTakeMin: 0.1,
  pieceTakeMax: 0.7,
  medianDays: [20, 30] as const,
  closeCallMin: 0.5,
} as const;

/** Judge the gates on the batch; a gate whose bot was not played is left out. */
export function evaluateGates(content: ThirtyContent, stats: Partial<Record<BotName, BotStats>>): Gate[] {
  const out: Gate[] = [];
  const r = stats.random;
  const s = stats.sensible;
  if (r) {
    const hold = share(r.held, r.games);
    out.push({ id: 'G1', text: 'Random choices hold to day 30 in under 10% of games', value: pct(hold), pass: hold < GATES.randomHoldMax });
  }
  if (s) {
    const hold = share(s.held, s.games);
    const stand = share(s.standDown, s.games);
    out.push({ id: 'G2', text: 'Sensible holds in 55–70%', value: pct(hold), pass: hold >= GATES.sensibleHold[0] && hold <= GATES.sensibleHold[1] });
    out.push({ id: 'G3', text: 'Sensible stands down early in 15–30%', value: pct(stand), pass: stand >= GATES.sensibleStandDown[0] && stand <= GATES.sensibleStandDown[1] });
    const rates = content.pieceOrder.map((p) => ({ p, rate: share(s.taken[p] ?? 0, s.games) }));
    const low = rates.filter((x) => x.rate < GATES.pieceTakeMin);
    const high = rates.filter((x) => x.rate > GATES.pieceTakeMax);
    const minP = rates.reduce((a, b) => (b.rate < a.rate ? b : a));
    const maxP = rates.reduce((a, b) => (b.rate > a.rate ? b : a));
    out.push({
      id: 'G4',
      text: 'Every piece taken by sensible in at least 10% of games',
      value: `${minP.p} ${pct(minP.rate)}${low.length ? ` (${low.length} under)` : ''}`,
      pass: low.length === 0,
    });
    out.push({ id: 'G5', text: 'No piece taken in more than 70%', value: `${maxP.p} ${pct(maxP.rate)}`, pass: high.length === 0 });
    out.push({
      id: 'G6',
      text: 'A sensible game runs 20–30 days at the median',
      value: `${s.medianDay} days`,
      pass: s.medianDay >= GATES.medianDays[0] && s.medianDay <= GATES.medianDays[1],
    });
    const close = share(s.closeCalls, s.games);
    out.push({ id: 'G8', text: 'The median sensible game sees the gauge above 60', value: `${pct(close)} of games (median peak ${s.medianPeak})`, pass: close >= GATES.closeCallMin });
  }
  const stalls = Object.values(stats).reduce((a, b) => a + (b?.stalls ?? 0), 0);
  if (r || s) out.push({ id: 'G7', text: 'No game stalls', value: `${stalls}`, pass: stalls === 0 });
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
