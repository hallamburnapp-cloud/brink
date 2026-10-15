/**
 * The join graph, which never changes during a game: land borders, island causeways and sea
 * lanes all count as joins. Distances are counted in joins. Region order follows the reference
 * (`IDS`: ids sorted), so every tie-break matches rules.py.
 */
import { LAND, LANES, REGION, REGION_IDS, compareWestEast, joinKey, type RegionId } from '../content/map';

/** The 30 region ids, sorted (the reference's IDS order). */
export const IDS: readonly RegionId[] = [...REGION_IDS].sort();

/** Index of each region in IDS (bit position in a region mask). */
export const INDEX: Readonly<Record<RegionId, number>> = Object.fromEntries(IDS.map((id, i) => [id, i]));

const adjacency = new Map<RegionId, Set<RegionId>>(IDS.map((id) => [id, new Set<RegionId>()]));
for (const [a, b] of [...LAND, ...LANES]) {
  adjacency.get(a)!.add(b);
  adjacency.get(b)!.add(a);
}

/** Neighbours of every region over land, causeway or sea lane, sorted by id. */
export const ADJ: Readonly<Record<RegionId, readonly RegionId[]>> = Object.fromEntries(
  IDS.map((id) => [id, [...adjacency.get(id)!].sort()]),
);

/** Neighbour bit masks by region index (bit i is IDS[i]). */
export const ADJ_MASK: readonly number[] = IDS.map((id) => ADJ[id].reduce((m, n) => m | (1 << INDEX[n]), 0));

const LANE_KEYS = new Set(LANES.map(([a, b]) => joinKey(a, b)));

/** True when a and b share a land border, a causeway or a sea lane. */
export function isJoined(a: RegionId, b: RegionId): boolean {
  return adjacency.get(a)?.has(b) ?? false;
}

/** True when a and b are joined by a sea lane (threads draw dashed). */
export function isLane(a: RegionId, b: RegionId): boolean {
  return LANE_KEYS.has(joinKey(a, b));
}

function bfs(src: RegionId): { dist: Record<RegionId, number>; parent: Record<RegionId, RegionId | null> } {
  const dist: Record<RegionId, number> = { [src]: 0 };
  const parent: Record<RegionId, RegionId | null> = { [src]: null };
  const queue = [src];
  for (let i = 0; i < queue.length; i++) {
    const r = queue[i];
    for (const n of ADJ[r]) {
      if (n in dist) continue;
      dist[n] = dist[r] + 1;
      parent[n] = r;
      queue.push(n);
    }
  }
  return { dist, parent };
}

const TREES = Object.fromEntries(IDS.map((id) => [id, bfs(id)]));

/** Joins between any two regions. */
export function distance(a: RegionId, b: RegionId): number {
  return TREES[a].dist[b];
}

/**
 * The shortest chain of joins from `from` to `to`, both ends included (the gold pulse a win
 * travels along). Ties go to the neighbour first in id order, so the chain is always the same.
 */
export function pathBetween(from: RegionId, to: RegionId): RegionId[] {
  const parent = TREES[to].parent;
  const path = [from];
  let r = from;
  while (r !== to) {
    r = parent[r]!;
    path.push(r);
  }
  return path;
}

/** A sorted copy: west to east (x, then y), the scoring order. */
export function westToEast(ids: Iterable<RegionId>): RegionId[] {
  return [...ids].sort(compareWestEast);
}

/** Squared distance between two pin centres (map points). */
export function pinDistance2(a: RegionId, b: RegionId): number {
  const dx = REGION[a].x - REGION[b].x;
  const dy = REGION[a].y - REGION[b].y;
  return dx * dx + dy * dy;
}

/** Region ids in a mask, in IDS order. */
export function maskIds(mask: number): RegionId[] {
  const out: RegionId[] = [];
  for (let i = 0; i < IDS.length; i++) if (mask & (1 << i)) out.push(IDS[i]);
  return out;
}

export function idsMask(ids: Iterable<RegionId>): number {
  let m = 0;
  for (const r of ids) m |= 1 << INDEX[r];
  return m;
}
