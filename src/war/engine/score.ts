/**
 * Scoring (SPEC section 6). SCORE = POINTS x MULTIPLIER, rounded down, built in this order, which
 * is also the animation order:
 *  1. each pin, west to east: +its number to POINTS, +1 to MULTIPLIER;
 *  2. each staff, seat 1 to 5 (a Deputy fires as the staff to its right); a per-region staff
 *     (Governor, Harbourmaster, Sovereign) fires once per matching pin, west to east;
 *  3. the crisis region pinned: x2 MULTIPLIER.
 * POINTS is a whole number; the MULTIPLIER is held in tenths (M10) and every step floors to a
 * tenth. scorePins() is the exact, traced scorer; Scorer is the fast one for enumerating sends
 * (bots, the shop's preview number). Both agree on every input (score.test.ts).
 */
import { REGION, type RegionId } from '../content/map';
import type { StaffId } from '../content/staff';
import { IDS, westToEast } from './board';
import { RULES } from './rules';
import type { Owner, StaffEvent, TraceEvent } from './types';

/** What each seat fires as: a Deputy fires as the staff to its right (nothing at the far right). */
export function effective(seats: readonly StaffId[]): Array<StaffId | null> {
  return seats.map((s, i) => {
    if (s !== 'DEPUTY') return s;
    const right = seats[i + 1];
    return right !== undefined && right !== 'DEPUTY' ? right : null;
  });
}

export function goldCount(owner: Readonly<Record<RegionId, Owner>>): number {
  let n = 0;
  for (const r of IDS) if (owner[r] === 'gold') n++;
  return n;
}

/** '1.5' for 15, '2' for 20, '1.0' for an Old Hand at 10. */
function factorLabel(tenths: number, keepPoint: boolean): string {
  const whole = Math.floor(tenths / 10);
  const frac = tenths % 10;
  return frac === 0 && !keepPoint ? `${whole}` : `${whole}.${frac}`;
}

export interface ScoreResult {
  score: bigint;
  points: bigint;
  m10: bigint;
  /** Present when asked for. */
  trace?: TraceEvent[];
}

/**
 * Score a set of pins with the seated staff (seat order). `owner` is the map when SEND is pressed
 * (the Governor's gold pins and the Surveyor's count), `oldHandM10` the Old Hand's multiplier.
 */
export function scorePins(
  pins: readonly RegionId[],
  seats: readonly StaffId[],
  owner: Readonly<Record<RegionId, Owner>>,
  crisis: RegionId,
  oldHandM10: number = RULES.oldHandStartM10,
  opts: { trace?: boolean } = {},
): ScoreResult {
  const trace: TraceEvent[] | null = opts.trace ? [] : null;
  const order = westToEast(pins);
  const held = goldCount(owner);
  const herald = seats.includes('HERALD');
  let pts = 0n;
  let m10 = 0n;
  for (const r of order) {
    const n = REGION[r].weight;
    pts += BigInt(n);
    m10 += 10n;
    trace?.push({ kind: 'pin', region: r, amount: n, label: `+${n}`, points: pts, m10 });
  }
  effective(seats).forEach((s, seat) => {
    if (s === null || s === 'HERALD') return;
    const viaDeputy = seats[seat] === 'DEPUTY';
    const once = (op: StaffEvent['op'], amount: number, label: string) =>
      trace?.push({ kind: 'staff', seat, staff: s, viaDeputy, op, amount, label, points: pts, m10 });
    switch (s) {
      case 'DUTY':
        m10 += 40n;
        once('+M', 40, '+4');
        break;
      case 'QM':
        pts += 20n;
        once('+P', 20, '+20');
        break;
      case 'SURVEYOR': {
        const add = 10 * Math.floor(held / 3);
        m10 += BigInt(add);
        once('+M', add, `+${add / 10}`);
        break;
      }
      case 'OLDHAND':
        m10 = (m10 * BigInt(oldHandM10)) / 10n;
        once('xM', oldHandM10, `×${factorLabel(oldHandM10, true)}`);
        break;
      case 'STRATEGIST':
        if (order.length >= 4) {
          m10 *= 3n;
          once('xM', 30, '×3');
        }
        break;
      case 'GOVERNOR':
      case 'HARBOUR':
      case 'SOVEREIGN': {
        const hits = order.filter((r) =>
          s === 'GOVERNOR' ? owner[r] === 'gold' : s === 'HARBOUR' ? herald || REGION[r].port : herald || REGION[r].capital,
        );
        for (const r of hits) {
          if (s === 'SOVEREIGN') m10 *= 2n;
          else m10 = (m10 * 15n) / 10n;
          const amount = s === 'SOVEREIGN' ? 20 : 15;
          trace?.push({
            kind: 'regionStaff',
            seat,
            staff: s,
            viaDeputy,
            region: r,
            op: 'xM',
            amount,
            label: `×${factorLabel(amount, false)}`,
            points: pts,
            m10,
          });
        }
        break;
      }
      default:
        throw new Error(`unknown staff ${String(s)}`);
    }
  });
  if (order.includes(crisis)) {
    m10 *= 2n;
    trace?.push({ kind: 'crisisX2', region: crisis, amount: 20, label: '×2', points: pts, m10 });
  }
  const score = (pts * m10) / 10n;
  trace?.push({ kind: 'slam', score, points: pts, m10 });
  return trace ? { score, points: pts, m10, trace } : { score, points: pts, m10 };
}

// ---------------------------------------------------------------- the fast scorer

/** Everything a score depends on, given the line-up. */
export interface Features {
  points: number;
  pins: number;
  capitals: number;
  ports: number;
  gold: number;
  crisis: boolean;
}

export function featuresOf(pins: readonly RegionId[], owner: Readonly<Record<RegionId, Owner>>, crisis: RegionId): Features {
  const f: Features = { points: 0, pins: pins.length, capitals: 0, ports: 0, gold: 0, crisis: false };
  for (const r of pins) {
    const d = REGION[r];
    f.points += d.weight;
    if (d.capital) f.capitals++;
    if (d.port) f.ports++;
    if (owner[r] === 'gold') f.gold++;
    if (r === crisis) f.crisis = true;
  }
  return f;
}

const WEIGHT_BY_INDEX = IDS.map((id) => REGION[id].weight);
const CAPITAL_MASK = IDS.reduce((m, id, i) => (REGION[id].capital ? m | (1 << i) : m), 0);
const PORT_MASK = IDS.reduce((m, id, i) => (REGION[id].port ? m | (1 << i) : m), 0);

function popcount(x: number): number {
  let n = 0;
  for (let v = x >>> 0; v; v &= v - 1) n++;
  return n;
}

/** Features of a region mask (bit i is IDS[i]); `goldMask` and `crisisMask` describe the map. */
export function maskFeatures(mask: number, goldMask: number, crisisMask: number): Features {
  let points = 0;
  for (let i = 0; i < WEIGHT_BY_INDEX.length; i++) if (mask & (1 << i)) points += WEIGHT_BY_INDEX[i];
  return {
    points,
    pins: popcount(mask),
    capitals: popcount(mask & CAPITAL_MASK),
    ports: popcount(mask & PORT_MASK),
    gold: popcount(mask & goldMask),
    crisis: (mask & crisisMask) !== 0,
  };
}

/** (x * factor) / 10 floored, in safe integers; null when it would leave the exact range. */
function mulFloor10(x: number, factor: number): number | null {
  const y = x * factor;
  if (!Number.isSafeInteger(y)) return null;
  return (y - (y % 10)) / 10;
}

function fastScore(f: Features, eff: ReadonlyArray<StaffId | null>, herald: boolean, held: number, old: number): number | null {
  let pts = f.points;
  const n = f.pins;
  const caps = herald ? n : f.capitals;
  const ports = herald ? n : f.ports;
  let m10: number | null = 10 * n;
  for (const s of eff) {
    if (m10 === null) return null;
    switch (s) {
      case 'DUTY':
        m10 += 40;
        break;
      case 'QM':
        pts += 20;
        break;
      case 'SURVEYOR':
        m10 += 10 * Math.floor(held / 3);
        break;
      case 'OLDHAND':
        m10 = mulFloor10(m10, old);
        break;
      case 'STRATEGIST':
        if (n >= 4) m10 = mulFloor10(m10, 30);
        break;
      case 'GOVERNOR':
        for (let i = 0; i < f.gold && m10 !== null; i++) m10 = mulFloor10(m10, 15);
        break;
      case 'HARBOUR':
        for (let i = 0; i < ports && m10 !== null; i++) m10 = mulFloor10(m10, 15);
        break;
      case 'SOVEREIGN':
        for (let i = 0; i < caps && m10 !== null; i++) m10 = mulFloor10(m10, 20);
        break;
      default:
        break; // null (an idle Deputy) and the Herald do nothing
    }
  }
  if (m10 === null) return null;
  if (f.crisis) m10 *= 2;
  return mulFloor10(m10, pts);
}

/** The same arithmetic in BigInt, for the rare line-up that leaves the safe-integer range. */
function bigScore(f: Features, eff: ReadonlyArray<StaffId | null>, herald: boolean, held: number, old: number): bigint {
  let pts = BigInt(f.points);
  const n = f.pins;
  const caps = herald ? n : f.capitals;
  const ports = herald ? n : f.ports;
  let m10 = BigInt(10 * n);
  const times = (k: number, num: bigint) => {
    for (let i = 0; i < k; i++) m10 = (m10 * num) / 10n;
  };
  for (const s of eff) {
    if (s === 'DUTY') m10 += 40n;
    else if (s === 'QM') pts += 20n;
    else if (s === 'SURVEYOR') m10 += BigInt(10 * Math.floor(held / 3));
    else if (s === 'OLDHAND') m10 = (m10 * BigInt(old)) / 10n;
    else if (s === 'STRATEGIST') times(n >= 4 ? 1 : 0, 30n);
    else if (s === 'GOVERNOR') times(f.gold, 15n);
    else if (s === 'HARBOUR') times(ports, 15n);
    else if (s === 'SOVEREIGN') times(caps, 20n);
  }
  if (f.crisis) m10 *= 2n;
  return (pts * m10) / 10n;
}

function featureKey(f: Features): number {
  return f.points + 64 * (f.pins + 8 * (f.capitals + 8 * (f.ports + 8 * (f.gold + 8 * (f.crisis ? 1 : 0)))));
}

/**
 * Scores feature sets for one line-up on one map, cached by features (equal to scorePins on the
 * same pins). `gold` is the number of gold regions held (the Surveyor's count).
 */
export class Scorer {
  private readonly eff: ReadonlyArray<StaffId | null>;
  private readonly herald: boolean;
  private readonly cache = new Map<number, bigint>();

  constructor(
    seats: readonly StaffId[],
    private readonly gold: number,
    private readonly oldHandM10: number = RULES.oldHandStartM10,
  ) {
    this.eff = effective(seats);
    this.herald = seats.includes('HERALD');
  }

  score(f: Features): bigint {
    const packable = f.points < 64 && f.pins < 8;
    const key = packable ? featureKey(f) : -1;
    if (packable) {
      const hit = this.cache.get(key);
      if (hit !== undefined) return hit;
    }
    const fast = fastScore(f, this.eff, this.herald, this.gold, this.oldHandM10);
    const v = fast === null ? bigScore(f, this.eff, this.herald, this.gold, this.oldHandM10) : BigInt(fast);
    if (packable) this.cache.set(key, v);
    return v;
  }
}
