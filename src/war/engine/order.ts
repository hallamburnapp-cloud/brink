/**
 * Seat order (reference rules.py: order_key, seat_orders, reduce_feats, order_state, best_seating,
 * push_winnable, push_pool). Seats can be dragged during a turn, so what a deal can score depends on
 * every seating of the line-up, not only the one it sits in. These answer, exactly and fast:
 *  - what the game says of a deal before any pin (dealState: 'live', 'reorder' for REORDER STAFF TO
 *    WIN, 'dead' for NO SEND CAN WIN), under every distinct seating (at most 120 for five seats);
 *  - the seating that scores most on a deal (what a bot drags its staff into on REORDER STAFF TO WIN);
 *  - which red regions the final push may draw its crisis from (the ones some fresh deal can win).
 */
import type { RegionId } from '../content/map';
import type { StaffId } from '../content/staff';
import { dealPool } from './deck';
import { Scorer, effective, goldCount, type Features } from './score';
import { dealFeatures } from './shop';
import type { Owner } from './types';

/** What the game says of a deal before any pin. */
export type DealState = 'live' | 'reorder' | 'dead';

/** + multiplier staff: whole tenths added, nothing floored between neighbours, so their order among themselves never matters. */
const ADDS_M: ReadonlySet<StaffId> = new Set(['DUTY', 'SURVEYOR']);

/**
 * Two seatings with the same key give every send the same score: they fire the same staff in the same
 * order up to what commutes (the Quartermaster's +20 points, an idle Deputy and the Herald, and
 * neighbouring + multiplier staff).
 */
export function orderKey(seats: readonly StaffId[]): string {
  const out: string[] = [];
  let run: string[] = [];
  let qm = 0;
  for (const s of effective(seats)) {
    if (s === 'QM') qm++;
    if (s === null || s === 'HERALD' || s === 'QM') continue;
    if (ADDS_M.has(s)) run.push(s);
    else {
      out.push(...run.sort(), s);
      run = [];
    }
  }
  out.push(...run.sort());
  return `${qm}|${out.join(',')}`;
}

/** Index permutations of 0..n-1 in lexicographic order (Python's itertools.permutations(range(n))). */
function* permutations(n: number): Generator<number[]> {
  const used = new Array<boolean>(n).fill(false);
  const cur: number[] = [];
  function* rec(): Generator<number[]> {
    if (cur.length === n) {
      yield [...cur];
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      cur.push(i);
      yield* rec();
      cur.pop();
      used[i] = false;
    }
  }
  yield* rec();
}

const ordersCache = new Map<string, StaffId[][]>();

/**
 * Every seating of these staff that can score differently, the seated order first, then in the order
 * the permutations of the seat indices meet them (as the reference does). At most 120 for five seats.
 */
export function seatOrders(seats: readonly StaffId[]): StaffId[][] {
  const memoKey = seats.join(',');
  const hit = ordersCache.get(memoKey);
  if (hit) return hit;
  const seen = new Set<string>();
  const out: StaffId[][] = [];
  for (const p of permutations(seats.length)) {
    const o = p.map((i) => seats[i]);
    const k = orderKey(o);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(o);
  }
  if (ordersCache.size > 256) ordersCache.clear();
  ordersCache.set(memoKey, out);
  return out;
}

const dominates = (a: Features, b: Features) =>
  a.points >= b.points && a.pins >= b.pins && a.capitals >= b.capitals && a.ports >= b.ports && a.gold >= b.gold && (a.crisis || !b.crisis);

/**
 * The feature sets that can be a deal's best send under some line-up. A score never falls when any
 * feature grows (every step of the multiplier is monotone and points multiply at the end), so a set
 * another one matches or beats in every feature is dropped.
 */
export function reduceFeatures(fs: readonly Features[]): Features[] {
  const top = new Map<string, Features>();
  for (const f of fs) {
    const k = `${f.pins}/${f.capitals}/${f.ports}/${f.gold}/${f.crisis ? 1 : 0}`;
    const t = top.get(k);
    if (!t || t.points < f.points) top.set(k, f);
  }
  const out: Features[] = [];
  // Highest first (points, then pins ...): anything that dominates a set comes before it.
  const sorted = [...top.values()].sort(
    (a, b) =>
      b.points - a.points || b.pins - a.pins || b.capitals - a.capitals || b.ports - a.ports || b.gold - a.gold || Number(b.crisis) - Number(a.crisis),
  );
  for (const f of sorted) if (!out.some((g) => dominates(g, f))) out.push(f);
  return out;
}

/**
 * 'live': some send of these feature sets reaches T with the seats as they sit; 'reorder': none does
 * as seated, but one does under another seating; 'dead': none does under any seating.
 */
export function orderState(fs: readonly Features[], seats: readonly StaffId[], gold: number, oldHandM10: number, T: bigint): DealState {
  const orders = seatOrders(seats);
  for (let i = 0; i < orders.length; i++) {
    const scorer = new Scorer(orders[i], gold, oldHandM10);
    if (fs.some((f) => scorer.score(f) >= T)) return i === 0 ? 'live' : 'reorder';
  }
  return 'dead';
}

/** The seating whose best send scores most (ties to the first in seatOrders), and that score. */
export function bestSeating(fs: readonly Features[], seats: readonly StaffId[], gold: number, oldHandM10: number): { seats: StaffId[]; score: bigint } {
  let best: { seats: StaffId[]; score: bigint } | null = null;
  for (const o of seatOrders(seats)) {
    const scorer = new Scorer(o, gold, oldHandM10);
    let v = 0n;
    for (const f of fs) {
      const x = scorer.score(f);
      if (x > v) v = x;
    }
    if (!best || v > best.score) best = { seats: o, score: v };
  }
  return best!;
}

/**
 * The final push: some legal send on a fresh deal for crisis `c` could reach `T` with the best seating
 * of the line-up. A fresh deal lights 10 of the pile (the regions that are not red, within 3 joins of
 * c), and any touching group of up to 5 of the pile and c can be among them, so every such group counts.
 */
export function pushWinnable(
  owner: Readonly<Record<RegionId, Owner>>,
  c: RegionId,
  seats: readonly StaffId[],
  oldHandM10: number,
  T: bigint,
): boolean {
  const fs = reduceFeatures(dealFeatures(dealPool(owner, c), c, owner));
  return orderState(fs, seats, goldCount(owner), oldHandM10, T) !== 'dead';
}

/**
 * Where the final push's crisis is drawn from (decision A2): the red regions touching gold that the
 * line-up can win on some fresh deal, with its best seating, when there are any, so the push's
 * misses are spent on real chances; otherwise all of them. `red` is crisisPool's push pool.
 */
export function pushPool(
  owner: Readonly<Record<RegionId, Owner>>,
  red: readonly RegionId[],
  seats: readonly StaffId[],
  oldHandM10: number,
  T: bigint,
): { pool: RegionId[]; draw: 'winnable' | 'any' } {
  const ok = red.filter((c) => pushWinnable(owner, c, seats, oldHandM10, T));
  return ok.length ? { pool: ok, draw: 'winnable' } : { pool: [...red], draw: 'any' };
}
