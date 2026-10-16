/** The simulator's printed tables (plain text or Markdown). */
import type { ThirtyContent } from '../content/types.ts';
import type { BotName } from './bots.ts';
import type { BotStats, Gate } from './gates.ts';
import { pct, share } from './stats.ts';

export type Format = 'text' | 'md';

function table(rows: string[][], fmt: Format): string {
  if (!rows.length) return '';
  if (fmt === 'md') {
    const [head, ...body] = rows;
    return [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...body.map((r) => `| ${r.join(' | ')} |`)].join('\n');
  }
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  return rows.map((r) => r.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd()).join('\n');
}

export function gatesTable(gates: readonly Gate[], fmt: Format): string {
  return table([['gate', 'what', 'value', 'result'], ...gates.map((g) => [g.id, g.text, g.value, g.pass ? 'PASS' : 'FAIL'])], fmt);
}

export function outcomesTable(stats: Partial<Record<BotName, BotStats>>, fmt: Format): string {
  const rows: string[][] = [['bot', 'games', 'held', 'clean', 'stand-down', 'war', 'stalls', 'median day', 'median peak', 'p90 peak', 'above 60', 'map days', 'risky days']];
  for (const s of Object.values(stats)) {
    if (!s) continue;
    rows.push([
      s.bot,
      String(s.games),
      pct(share(s.held, s.games)),
      pct(share(s.clean, s.games)),
      pct(share(s.standDown, s.games)),
      pct(share(s.war, s.games)),
      String(s.stalls),
      String(s.medianDay),
      String(s.medianPeak),
      String(s.peakP90),
      pct(share(s.closeCalls, s.games)),
      s.meanMapDays.toFixed(1),
      s.meanRiskyDays.toFixed(1),
    ]);
  }
  return table(rows, fmt);
}

export function piecesTable(content: ThirtyContent, s: BotStats, fmt: Format): string {
  const rows: string[][] = [['piece', 'taken', 'offered', 'taken when offered', 'acted (days held)']];
  for (const p of content.pieceOrder) {
    const taken = s.taken[p] ?? 0;
    const offered = s.offered[p] ?? 0;
    const a = s.feel.acted[p] ?? { held: 0, fired: 0 };
    rows.push([p, pct(share(taken, s.games)), pct(share(offered, s.games)), pct(share(taken, offered)), `${pct(share(a.fired, a.held))} of ${a.held}`]);
  }
  return table(rows, fmt);
}

/** What the playtests measured over the shoulder, per bot. */
export function feelTable(stats: Partial<Record<BotName, BotStats>>, fmt: Format): string {
  const rows: string[][] = [['bot', 'red seen', 'first red (median day)', 'war by push', 'night ≥ day', 'late spread : flare', 'HELD amber (median)', 'stand-down day / peak']];
  for (const s of Object.values(stats)) {
    if (!s) continue;
    const f = s.feel;
    rows.push([
      s.bot,
      pct(share(f.redSeen, s.games)),
      Number.isNaN(f.medianFirstRedDay) ? '-' : String(f.medianFirstRedDay),
      pct(share(f.warByPush, s.war)),
      pct(share(f.nightWins, f.dropDays)),
      `${f.lateSpread} : ${f.lateFlare}`,
      Number.isNaN(f.medianHeldTense) ? '-' : String(f.medianHeldTense),
      Number.isNaN(f.medianStandDownDay) ? '-' : `${f.medianStandDownDay} / ${f.medianStandDownPeak}`,
    ]);
  }
  return table(rows, fmt);
}

export function teamSizeTable(s: BotStats, fmt: Format): string {
  const rows: string[][] = [['team size', 'games', 'held']];
  for (const k of Object.keys(s.heldByTeamSize).sort()) {
    const row = s.heldByTeamSize[Number(k)];
    rows.push([k, String(row.games), pct(share(row.held, row.games))]);
  }
  return table(rows, fmt);
}

export function curveLine(s: BotStats): string {
  return s.curve.map((d, i) => `${i + 1}:${d.toFixed(0)}`).join(' ');
}
