/** The simulator's printed tables (plain text or Markdown). */
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

const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '-');
const f0 = (x: number) => (Number.isFinite(x) ? String(x) : '-');

export function gatesTable(gates: readonly Gate[], fmt: Format): string {
  return table([['gate', 'what', 'value', 'result'], ...gates.map((g) => [g.id, g.text, g.value, g.pass ? 'PASS' : 'FAIL'])], fmt);
}

export function outcomesTable(stats: Partial<Record<BotName, BotStats>>, fmt: Format): string {
  const rows: string[][] = [['bot', 'games', 'treaty', 'war', 'frozen', 'stalls', 'median score', 'treaty week (median)', 'war week (median)', 'war peak (median)']];
  for (const s of Object.values(stats)) {
    if (!s) continue;
    rows.push([s.bot, String(s.games), pct(share(s.treaty, s.games)), pct(share(s.war, s.games)), pct(share(s.frozen, s.games)), String(s.stalls), f0(s.medianScore), f0(s.medianTreatyWeek), f0(s.medianWarWeek), f0(s.medianWarPeak)]);
  }
  return table(rows, fmt);
}

export function phonesTable(stats: Partial<Record<BotName, BotStats>>, fmt: Format): string {
  const rows: string[][] = [['bot', 'phones', 'tests', 'backed', 'backed down', 'waited', 'ways out offered', 'accepted', 'short of influence', 'idle weeks', 'hidden lines (min / median)']];
  for (const s of Object.values(stats)) {
    if (!s) continue;
    rows.push([s.bot, f1(s.meanPhones), f1(s.meanTests), f1(s.meanBacked), f1(s.meanBackedDown), f1(s.meanWaited), f1(s.meanWaysOutOffered), f1(s.meanWaysOutAccepted), pct(share(s.shortGames, s.games)), pct(s.idleShare), `${s.minHidden} / ${f0(s.medianHidden)}`]);
  }
  return table(rows, fmt);
}

export function ladderTable(stats: Partial<Record<BotName, BotStats>>, fmt: Format): string {
  const rows: string[][] = [['bot', 'TESTING', 'PUSHING', 'MASSING', 'FIGHTING', 'ALL-OUT']];
  for (const s of Object.values(stats)) {
    if (!s) continue;
    rows.push([s.bot, ...[1, 2, 3, 4, 5].map((k) => pct(share(s.stepPeaks[String(k)] ?? 0, s.games)))]);
  }
  return table(rows, fmt);
}

export function treatyWeeksTable(s: BotStats, fmt: Format): string {
  const weeks = [1, 2, 3, 4, 5, 6, 7, 8];
  return table([['week', ...weeks.map(String)], ['treaties', ...weeks.map((w) => String(s.treatyWeeks[String(w)] ?? 0))]], fmt);
}

export function dialsTable(s: BotStats, fmt: Format): string {
  return table(
    [
      ['treaty share by dial', 'low', 'mid', 'high'],
      ['appetite (careful / steady / hungry)', ...s.byAppetite.map((x) => pct(x))],
      ['jumpiness (not easily scared / watchful / easily scared)', ...s.byJumpiness.map((x) => pct(x))],
    ],
    fmt,
  );
}
