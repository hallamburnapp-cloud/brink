/**
 * Plain-text tables for the simulator CLI and the report: calibration beside the reference,
 * the five gates, the choice spread and the full-run survival curve.
 */
import { PATTERN, PATTERN_IDS } from '../content/patterns';
import { STAFF_DEF, type StaffId } from '../content/staff';
import { CRISIS_NAME, clockOf, formatInt, hourLabel, hourTargets, type CrisisKind } from '../engine';
import { CALIBRATION, median, type RowTally } from './calibration';
import type { GateResult } from './gates';
import { LAST_HOUR, type RunBot, type RunOutcome } from './builder';
import { SPREAD_REF, type RefRate } from './reference';
import type { SpreadStats } from './spread';

type Align = 'l' | 'r';

/** A monospaced table: header row, a rule, then rows. */
export function table(head: string[], rows: string[][], align: Align[]): string {
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[]) =>
    cells.map((c, i) => (align[i] === 'r' ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join('  ').trimEnd();
  return [line(head), widths.map((w) => '-'.repeat(w)).join('  '), ...rows.map(line)].join('\n');
}

export const pct = (x: number, digits = 1): string => `${(100 * x).toFixed(digits)}%`;
const int = (n: number): string => formatInt(BigInt(Math.round(n)));

/**
 * Is the gap between two measured shares bigger than sampling noise? A two-proportion test
 * with the pooled share, at about 2 standard errors.
 */
export function beyondNoise(p1: number, n1: number, p2: number, n2: number): boolean {
  const pooled = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  return Math.abs(p1 - p2) > 2 * se;
}

const TWIST_LABEL: Record<string, string> = { GRIDLOCK: 'Gridlock', BLACKOUT: 'Blackout', FULL_TABLE: 'Full Table' };

/**
 * The calibration table. `rerun` adds a column for a larger re-run of the Python reference
 * (the spec's figures come from 200 crises a row, which is +/-7 points at 95%).
 */
export function calibrationTable(tallies: Readonly<Record<string, RowTally>>, rerun?: Readonly<Record<string, RefRate>>): string {
  const head = ['Staff', 'Twist', 'Target', 'Spec', 'Reference', ...(rerun ? ['Ref re-run'] : []), 'This sim', 'Median total', 'Gap'];
  const rows = CALIBRATION.filter((r) => tallies[r.id]).map((r) => {
    const t = tallies[r.id];
    const ours = t.cleared / t.n;
    const big = rerun?.[r.id] ?? r.ref;
    const gap = ours - big.pct / 100;
    const noisy = beyondNoise(ours, t.n, big.pct / 100, big.n);
    return [
      r.build,
      r.twist ? TWIST_LABEL[r.twist] : '-',
      int(r.target),
      `${r.spec}%`,
      `${r.ref.pct.toFixed(1)}% (${int(r.ref.n)})`,
      ...(rerun ? [rerun[r.id] ? `${rerun[r.id].pct.toFixed(1)}% (${int(rerun[r.id].n)})` : '-'] : []),
      `${pct(ours)} (${int(t.n)})`,
      int(median(t.totals)),
      `${gap >= 0 ? '+' : ''}${(100 * gap).toFixed(1)}${noisy ? ' !' : ''}`,
    ];
  });
  const align: Align[] = ['l', 'l', 'r', 'r', 'r', ...(rerun ? ['r' as Align] : []), 'r', 'r', 'r'];
  return table(head, rows, align);
}

export function gatesTable(gates: readonly GateResult[]): string {
  const rows: string[][] = [];
  for (const g of gates) {
    g.checks.forEach((c, k) => {
      const value = `${pct(c.value)}${k === 0 && g.note ? ` ${g.note}` : ''}`;
      const slack = c.tolerance > 0 ? ` (+/-${(100 * c.tolerance).toFixed(1)})` : '';
      rows.push([
        k === 0 ? String(g.index) : '',
        k === 0 ? g.title : `  ${c.label}`,
        `${c.op} ${pct(c.threshold, 0)}${slack}`,
        value,
        `[${pct(c.reference, 0)}]`,
        k === 0 ? (g.pass ? 'PASS' : 'FAIL') : c.pass ? '' : 'fail',
      ]);
    });
  }
  return table(['#', 'Gate', 'Needs', 'This sim', 'Ref', ''], rows, ['r', 'l', 'r', 'r', 'r', 'l']);
}

const q = (x: { p10: number; median: number; p90: number }, digits: number) =>
  `${x.median.toFixed(digits)} (p10 ${x.p10.toFixed(digits)}, p90 ${x.p90.toFixed(digits)})`;

export function spreadReport(s: SpreadStats): string {
  const r = SPREAD_REF;
  const lines = [
    table(
      ['Choice spread, 8 lit, no staff', `This sim (${int(s.deals)} deals)`, `Reference (${int(r.deals)})`],
      [
        ['Best play / median play', q(s.ratio, 1), q(r.ratio, 1)],
        ['Best play >= 3x median', pct(s.atLeast3x), pct(r.atLeast3x)],
        ['Best play / best other pattern', q(s.ratioNext, 2), q(r.ratioNext, 2)],
        ['Best play leverage', q(s.bestScore, 0), q(r.bestScore, 0)],
      ],
      ['l', 'r', 'r'],
    ),
    '',
    table(
      ['Pattern', 'Can be made', 'Ref', 'Is the best play', 'Ref'],
      PATTERN_IDS.map((p) => [
        PATTERN[p].name,
        pct(s.available[p]),
        pct(r.available[p]),
        pct(s.bestShare[p]),
        pct(r.bestShare[p]),
      ]),
      ['l', 'r', 'r', 'r', 'r'],
    ),
  ];
  return lines.join('\n');
}

const KINDS: readonly CrisisKind[] = ['FLARE_UP', 'STANDOFF', 'SUMMIT'];

/** Survival through the night: share of runs that cleared each of the 9 crises. */
export function runsReport(byBot: Partial<Record<RunBot, readonly RunOutcome[]>>): string {
  const bots = (Object.keys(byBot) as RunBot[]).filter((b) => byBot[b]?.length);
  const head = ['Crisis', 'Target', ...bots.map((b) => `${b === 'builder' ? 'Builder' : 'Greedy, no buying'} (${int(byBot[b]!.length)})`)];
  const rows: string[][] = [];
  for (let k = 0; k < 9; k++) {
    const hour = Math.floor(k / 3);
    const kind = KINDS[k % 3];
    rows.push([
      `${clockOf(hour)} ${CRISIS_NAME[kind]}`,
      int(Number(hourTargets(hour, null)[k % 3])),
      ...bots.map((b) => pct(byBot[b]!.filter((o) => o.cleared > k).length / byBot[b]!.length)),
    ]);
  }
  const out = [table(head, rows, ['l', 'r', ...bots.map(() => 'r' as Align)])];

  // After the slice: KEEP GOING, one row per Hour's Summit.
  const later: string[][] = [];
  for (let h = 3; h <= LAST_HOUR; h++) {
    later.push([
      `${hourLabel(h)} SUMMIT`,
      int(Number(hourTargets(h, null)[2])),
      ...bots.map((b) => pct(byBot[b]!.filter((o) => o.overtimeHours >= h - 2).length / byBot[b]!.length)),
    ]);
  }
  out.push('');
  out.push('After the slice, with KEEP GOING: share of runs that cleared each Hour');
  out.push(table(['Hour', 'Summit', ...head.slice(2)], later, ['l', 'r', ...bots.map(() => 'r' as Align)]));
  for (const b of bots) {
    const runs = byBot[b]!;
    const avg = (f: (o: RunOutcome) => number) => runs.reduce((a, o) => a + f(o), 0) / runs.length;
    out.push('');
    out.push(
      `${b === 'builder' ? 'Builder' : 'Greedy, no buying'}: held until 01:00 in ${pct(runs.filter((o) => o.held).length / runs.length)}; ` +
        `cleared ${avg((o) => o.cleared).toFixed(2)} of 9 crises on average; median best sweep ${int(median(runs.map((o) => o.bestLeverage)))}; ` +
        `Funds left ${avg((o) => o.funds).toFixed(1)}.`,
    );
    if (b === 'builder') {
      const counts = new Map<StaffId, number>();
      for (const o of runs) for (const id of o.bought) counts.set(id, (counts.get(id) ?? 0) + 1);
      const top = [...counts.entries()].sort((a, c) => c[1] - a[1]).slice(0, 8);
      out.push(`Staff hired most (per run): ${top.map(([id, n]) => `${STAFF_DEF[id].name} ${(n / runs.length).toFixed(2)}`).join(', ')}.`);
      out.push(`Staff hired per run: ${avg((o) => o.bought.length).toFixed(1)}; sold per run: ${avg((o) => o.sold.length).toFixed(1)}.`);
      // The design's rule of thumb: no staff in more than 35% of winning builds.
      const seated = new Map<StaffId, number>();
      for (const o of runs) for (const id of new Set(o.staff)) seated.set(id, (seated.get(id) ?? 0) + 1);
      const common = [...seated.entries()].sort((a, c) => c[1] - a[1]).slice(0, 8);
      out.push(`Seated at the end (share of runs): ${common.map(([id, n]) => `${STAFF_DEF[id].name} ${pct(n / runs.length)}`).join(', ')}.`);
    }
  }
  return out.join('\n');
}
