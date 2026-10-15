/**
 * Tables for the simulator CLI and docs/war/v2/SIM-REPORT.md: the 17 gates and the outcomes beside
 * the reference (RESULTS.txt), a few details per shopping bot, and the by-turn curve. Plain text for
 * the terminal, or Markdown.
 */
import type { BotName } from './bots';
import type { GateResult, StatsByBot } from './gates';
import type { Reference } from './reference';
import { BOT_NAMES } from './roster';
import type { BotStats, CurvePoint } from './summary';

type Align = 'l' | 'r';
export type Format = 'text' | 'md';

export function table(head: readonly string[], rows: readonly string[][], align: readonly Align[], format: Format = 'text'): string {
  if (format === 'md') {
    const line = (cells: readonly string[]) => `| ${cells.join(' | ')} |`;
    return [line(head), line(align.map((a) => (a === 'r' ? '--:' : '---'))), ...rows.map(line)].join('\n');
  }
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: readonly string[]) =>
    cells.map((c, i) => (align[i] === 'r' ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join('  ').trimEnd();
  return [line(head), widths.map((w) => '-'.repeat(w)).join('  '), ...rows.map(line)].join('\n');
}

export const pct = (x: number | undefined): string => (x === undefined || Number.isNaN(x) ? '-' : `${(100 * x).toFixed(1)}%`);
const one = (x: number | null | undefined): string => (x === null || x === undefined || Number.isNaN(x) ? '-' : x.toFixed(1));
const int = (x: number | undefined): string => (x === undefined || Number.isNaN(x) ? '-' : Math.round(x).toLocaleString('en-GB'));
/** 'ours (reference)' */
const pair = (ours: string, ref: string): string => `${ours} (${ref})`;

export function gatesTable(gates: readonly GateResult[], ref: Reference, format: Format = 'text'): string {
  const refText = new Map(ref.gates.map((g) => [g.id, g.text]));
  const rows = gates.map((g) => [
    `${g.id} ${g.title}`,
    g.threshold,
    g.text,
    refText.get(g.id) ?? '-',
    g.pass ? 'PASS' : g.passLoose ? 'FAIL (within noise)' : 'FAIL',
  ]);
  return table(['Gate', 'Threshold', 'This sim', `Reference`, 'Result'], rows, ['l', 'l', 'r', 'r', 'l'], format);
}

/** Per bot, a row for this sim and a row for the reference. */
export function outcomesTable(stats: StatsByBot, ref: Reference, format: Format = 'text'): string {
  const rows: string[][] = [];
  for (const bot of BOT_NAMES) {
    const s = stats[bot];
    if (!s) continue;
    rows.push([
      bot,
      'this sim',
      int(s.n),
      pct(s.worldUnited),
      pct(s.ceasefire),
      pct(s.held),
      pct(s.war),
      int(s.stalls),
      `${one(s.turns.median)} (${s.turns.p10}-${s.turns.p90})`,
      `${one(s.minutes.first.median)} / ${one(s.minutes.first.p90)}`,
    ]);
    const r = ref.outcomes[bot];
    if (!r) continue;
    rows.push([
      '',
      'reference',
      int(ref.games),
      pct(r.worldUnited),
      pct(r.ceasefire),
      pct(r.held),
      pct(r.war),
      int(r.stall * ref.games),
      `${one(r.turns.median)} (${r.turns.p10}-${r.turns.p90})`,
      `${one(r.minutes.first[0])} / ${one(r.minutes.first[1])}`,
    ]);
  }
  return table(
    ['Bot', '', 'Games', 'WORLD UNITED', 'CEASEFIRE', 'Holds', 'WAR', 'Stalls', 'Turns: median (p10-p90)', 'First-game minutes: median / p90'],
    rows,
    ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r'],
    format,
  );
}

const sizeShare = (s: BotStats, pick: (k: number) => boolean): number => {
  const total = s.sizes.reduce((n, [, c]) => n + c, 0);
  return total ? s.sizes.filter(([k]) => pick(k)).reduce((n, [, c]) => n + c, 0) / total : NaN;
};

const refSizeShare = (sizes: Array<[number, number]> | undefined, pick: (k: number) => boolean): number | undefined =>
  sizes ? sizes.filter(([k]) => pick(k)).reduce((n, [, x]) => n + x, 0) : undefined;

/** Figures beyond the gates, for the bots that shop with a plan. */
export function detailTable(stats: StatsByBot, ref: Reference, format: Format = 'text'): string {
  const bots = (['sensible', 'preview', 'breaker'] as BotName[]).filter((b) => stats[b]);
  const rows: Array<[string, (s: BotStats) => string, (b: BotName) => string]> = [
    ['best send ≥ 2x the median send (turns)', (s) => pct(s.spread2), (b) => pct(ref.detail[b]?.spread2)],
    ['best send wins where the median misses', (s) => pct(s.bestWinsMedianMisses), (b) => pct(ref.detail[b]?.bestWinsMedianMisses)],
    ['sends that pin the crisis', (s) => pct(s.onCrisis), (b) => pct(ref.detail[b]?.onCrisis)],
    ['games that reach the final push', (s) => pct(s.finalPush), (b) => pct(ref.detail[b]?.finalPush)],
    ['best send per game, median', (s) => int(s.bestMedian), (b) => int(ref.detail[b]?.bestMedian)],
    ['games with a 1,000,000+ send', (s) => pct(s.million), (b) => pct(ref.detail[b]?.million)],
    ['games with a send that wins 5+ regions', (s) => pct(s.flood5), (b) => pct(ref.detail[b]?.flood5)],
    ['winning sends that take 1 region', (s) => pct(sizeShare(s, (k) => k === 1)), (b) => pct(refSizeShare(ref.detail[b]?.sizes, (k) => k === 1))],
    ['winning sends that take 2 regions', (s) => pct(sizeShare(s, (k) => k === 2)), (b) => pct(refSizeShare(ref.detail[b]?.sizes, (k) => k === 2))],
    ['winning sends that take 3+ regions', (s) => pct(sizeShare(s, (k) => k >= 3)), (b) => pct(refSizeShare(ref.detail[b]?.sizes, (k) => k >= 3))],
    ['held games where war reached 6+', (s) => pct(s.warPeak6InHeld), (b) => pct(ref.detail[b]?.warPeak6InHeld)],
    ['close losses (WAR holding 18+ gold)', (s) => pct(s.closeLoss), (b) => pct(ref.detail[b]?.closeLoss)],
    ['hopeless losses (WAR holding ≤ 8 gold)', (s) => pct(s.hopeless), (b) => pct(ref.detail[b]?.hopeless)],
  ];
  return table(
    ['', ...bots],
    rows.map(([label, ours, theirs]) => [label, ...bots.map((b) => pair(ours(stats[b]!), theirs(b)))]),
    ['l', ...bots.map((): Align => 'r')],
    format,
  );
}

/** Staff in the final line-ups of held games, as shares of held games. */
export function staffLine(s: BotStats): string {
  return s.staffHeld.map(([id, n]) => `${id} ${pct(n / Math.max(1, s.heldGames))}`).join(', ');
}

export function curveTable(points: readonly CurvePoint[], format: Format = 'text'): string {
  return table(
    ['Turn', 'Target', 'Games', 'Median score', 'Sends that win', 'Median gold', 'Median war'],
    points.map((p) => [String(p.turn), int(p.target), int(p.games), int(p.medianScore), pct(p.winShare), one(p.medianGold), one(p.medianRed)]),
    ['r', 'r', 'r', 'r', 'r', 'r', 'r'],
    format,
  );
}
