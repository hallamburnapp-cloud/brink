/**
 * The statistics of a batch of games and SPEC "Balance gates" judged on them:
 * - Random choices: holds to day 30 in under 10% of games.
 * - Sensible: holds in 55 to 70%, stand-down early in 15 to 30%, war in the rest.
 * - Every piece is taken by the sensible bot in at least 10% of games; none in more than 70%.
 * - A game runs 20 to 30 days at the median; no game stalls.
 * - The median sensible game feels close: the gauge above 60 at least once, or red on the map (item 15).
 * - Beyond the spec, G9: a hawk who builds on force holds in 40–65% (there is more than one way to play).
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
  /** What the playtests measured over the shoulder (ENGINE.md "Tuning", item 15). */
  feel: Feel;
}

export interface Feel {
  /** Games in which a region went red before the ending's own push. */
  redSeen: number;
  /** The median first day of red over those games (NaN when none). */
  medianFirstRedDay: number;
  /** WAR endings decided by the engine pushing a crisis red on the final night. */
  warByPush: number;
  /** Nights that gave back at least what the choice removed, over days the choice lowered DANGER. */
  nightWins: number;
  dropDays: number;
  /** Night steps in the last ten days: red spreading against trouble flaring at random. */
  lateSpread: number;
  lateFlare: number;
  /** TENSE regions on the final map of a HELD game, at the median. */
  medianHeldTense: number;
  /** STAND-DOWN games: the median day and the median peak before it. */
  medianStandDownDay: number;
  medianStandDownPeak: number;
  /** Per piece: the share of days held on which it changed the outcome. */
  acted: Record<PieceId, { held: number; fired: number }>;
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
  const acted: Feel['acted'] = Object.fromEntries(content.pieceOrder.map((p) => [p, { held: 0, fired: 0 }]));
  for (const g of games) {
    for (const [p, n] of Object.entries(g.heldDays)) if (acted[p]) acted[p].held += n;
    for (const [p, n] of Object.entries(g.firedDays)) if (acted[p]) acted[p].fired += n;
  }
  const red = games.filter((g) => g.firstRedDay !== null);
  const held = games.filter((g) => g.ending === 'HELD');
  const stood = games.filter((g) => g.ending === 'STAND-DOWN');
  const feel: Feel = {
    redSeen: red.length,
    medianFirstRedDay: median(red.map((g) => g.firstRedDay!)),
    warByPush: games.filter((g) => g.endedByPush).length,
    nightWins: games.reduce((a, g) => a + g.nightWins, 0),
    dropDays: games.reduce((a, g) => a + g.dropDays, 0),
    lateSpread: games.reduce((a, g) => a + g.lateSpread, 0),
    lateFlare: games.reduce((a, g) => a + g.lateFlare, 0),
    medianHeldTense: median(held.map((g) => g.finalTense)),
    medianStandDownDay: median(stood.map((g) => g.day)),
    medianStandDownPeak: median(stood.map((g) => g.peak)),
    acted,
  };
  return {
    feel,
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
  /** G9 (beyond the spec; ENGINE.md item 15): a hawk who builds on force holds in this range, so there is more than one way to play. */
  hawkHold: [0.4, 0.65] as const,
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
    out.push({
      id: 'G8',
      text: 'The median sensible game feels close: red on the map, or the gauge above 60',
      value: `${pct(close)} of games (red in ${pct(share(s.feel.redSeen, s.games))}, median peak ${s.medianPeak})`,
      pass: close >= GATES.closeCallMin,
    });
  }
  const h = stats.hawk;
  if (h) {
    const hold = share(h.held, h.games);
    out.push({ id: 'G9', text: 'A hawk (force pieces, prefers shows of force) holds in 40–65%', value: pct(hold), pass: hold >= GATES.hawkHold[0] && hold <= GATES.hawkHold[1] });
  }
  const stalls = Object.values(stats).reduce((a, b) => a + (b?.stalls ?? 0), 0);
  if (r || s || h) out.push({ id: 'G7', text: 'No game stalls', value: `${stalls}`, pass: stalls === 0 });
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
