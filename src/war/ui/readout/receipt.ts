/**
 * The LAST SWEEP receipt: where a sweep's points came from, read straight off the engine's trace
 * and summed into a few typed lines (the pattern's base, the regions, each AGAIN, threads, stamps,
 * then each staff in seat order) ending on 'I x M = leverage'. Nothing here scores: every number
 * is an amount or a running value the trace already carries.
 */
import { REGION } from '../../content/map';
import { PATTERN } from '../../content/patterns';
import { STAFF_DEF } from '../../content/staff';
import { formatInt, formatM10, formatShort, type SweepRecord, type TraceEvent } from '../../engine';

export type Tone = 'inf' | 'mom' | 'plain';

export interface ReceiptLine {
  label: string;
  value: string;
  tone: Tone;
}

export interface Receipt {
  title: string;
  lines: ReceiptLine[];
  /** 'I x M = leverage'. */
  total: string;
}

/** One staff member's contribution, kept in the order its seat first fired. */
interface StaffSum {
  name: string;
  inf: bigint;
  mom: bigint;
  /** Each multiplier factor, in order. */
  mults: string[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function receiptOf(rec: SweepRecord): Receipt {
  const lines: ReceiptLine[] = [];
  let regions = 0n;
  let pins = 0;
  let dark = 0;
  let threads = 0n;
  const agains = new Map<string, { n: number; inf: bigint }>();
  const stamps = new Map<string, { inf: bigint; mults: string[] }>();
  const staff = new Map<string, StaffSum>();
  let again: TraceEvent | null = null;

  const staffOf = (e: TraceEvent): StaffSum => {
    const key = `${e.seat}:${e.staffId}`;
    let s = staff.get(key);
    if (!s) {
      const name = STAFF_DEF[e.staffId!].name;
      s = { name: e.viaDeputy ? `Deputy (${name})` : name, inf: 0n, mom: 0n, mults: [] };
      staff.set(key, s);
    }
    return s;
  };
  const add = (into: { inf: bigint; mom?: bigint; mults: string[] }, e: TraceEvent) => {
    if (e.op === '+I') into.inf += BigInt(e.amount);
    else if (e.op === '+M' && into.mom !== undefined) into.mom += BigInt(e.amount);
    else if (e.op === 'xM') into.mults.push(e.amount);
  };

  for (const e of rec.trace) {
    switch (e.phase) {
      case 'again':
        again = e;
        break;
      case 'pin':
        if (e.dark) dark++;
        else if (again) {
          const name = REGION[e.region!].name;
          const a = agains.get(name) ?? { n: 0, inf: 0n };
          agains.set(name, { n: a.n + 1, inf: a.inf + BigInt(e.amount) });
        } else {
          pins++;
          regions += BigInt(e.amount);
        }
        again = null;
        break;
      case 'thread':
        threads += BigInt(e.amount);
        break;
      case 'stamp': {
        const kind = e.stamp ?? 'STAMP';
        const st = stamps.get(kind) ?? { inf: 0n, mults: [] };
        add(st, e);
        stamps.set(kind, st);
        break;
      }
      case 'staff':
      case 'standby':
      case 'desk':
        add(staffOf(e), e);
        break;
    }
  }

  const def = PATTERN[rec.pattern];
  lines.push({ label: `${def.name} Lv ${rec.level}`, value: `${formatInt(rec.baseInfluence)} × ${formatM10(rec.baseM10)}`, tone: 'plain' });
  if (pins) lines.push({ label: `Regions · ${plural(pins, 'pin')}`, value: `+${formatInt(regions)}`, tone: 'inf' });
  if (dark) lines.push({ label: `Blacked out · ${plural(dark, 'pin')}`, value: '+0', tone: 'plain' });
  for (const [name, a] of agains) lines.push({ label: `AGAIN ${name}${a.n > 1 ? ` ×${a.n}` : ''}`, value: `+${formatInt(a.inf)}`, tone: 'inf' });
  if (threads > 0n) lines.push({ label: 'Threads', value: `+${formatInt(threads)}`, tone: 'inf' });
  for (const [kind, st] of stamps) {
    const name = kind.charAt(0) + kind.slice(1).toLowerCase();
    if (st.inf > 0n) lines.push({ label: name, value: `+${formatInt(st.inf)}`, tone: 'inf' });
    if (st.mults.length) lines.push({ label: timesLabel(name, st.mults.length), value: `×${st.mults[0]}`, tone: 'mom' });
  }
  for (const s of staff.values()) {
    if (s.inf > 0n) lines.push({ label: s.name, value: `+${formatInt(s.inf)}`, tone: 'inf' });
    if (s.mom > 0n) lines.push({ label: s.name, value: `+${formatInt(s.mom)}`, tone: 'mom' });
    // Multipliers of one size read as one line; mixed ones each get their own.
    const sizes = [...new Set(s.mults)];
    for (const f of sizes) lines.push({ label: timesLabel(s.name, s.mults.filter((m) => m === f).length), value: `×${f}`, tone: 'mom' });
  }
  return {
    title: `LAST SWEEP · ${def.name}`,
    lines,
    total: `${formatShort(rec.influence, 9)} × ${formatM10(rec.m10)} = ${formatShort(rec.leverage, 12)}`,
  };
}

function timesLabel(name: string, n: number): string {
  return n > 1 ? `${name} · ${n} times` : name;
}
