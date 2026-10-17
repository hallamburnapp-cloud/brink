/**
 * The map as the rules see it: the 30 regions of src/thirty/ui/map/data.ts (ids, names, blocs, land
 * joins, sea lanes), the Cap and Highmarch, and the graphs the two pieces move on. Nothing here
 * changes during a game.
 */
import { LAND_JOINS, REGIONS, SEA_LANES, type Bloc } from '../../thirty/ui/map/data.ts';
import type { Piece, PieceKind, RegionId } from './types.ts';

export type { Bloc };

export interface WorldRegion {
  id: RegionId;
  name: string;
  bloc: Bloc;
  island: boolean;
  capital: boolean;
  /** Has a sea lane. */
  port: boolean;
}

const laneSet = new Set(SEA_LANES.flat());

export const WORLD_REGIONS: readonly WorldRegion[] = REGIONS.map((r) => ({
  id: r.id,
  name: r.name,
  bloc: r.bloc,
  island: r.island,
  capital: r.capital,
  port: laneSet.has(r.id),
}));
export const REGION: Readonly<Record<RegionId, WorldRegion>> = Object.fromEntries(WORLD_REGIONS.map((r) => [r.id, r]));
export const REGION_IDS: readonly RegionId[] = WORLD_REGIONS.map((r) => r.id);

/** The Federation's bloc and the Republic's. */
export const CAP_BLOC: Bloc = 'CAP';
export const HOME_BLOC: Bloc = 'HMR';
export const CAP_REGIONS: readonly RegionId[] = WORLD_REGIONS.filter((r) => r.bloc === CAP_BLOC).map((r) => r.id);
export const HOME_REGIONS: readonly RegionId[] = WORLD_REGIONS.filter((r) => r.bloc === HOME_BLOC).map((r) => r.id);
/** The two capitals that carry the invented flags. */
export const HOME_CAPITAL: RegionId = 'EDV';
export const CAP_CAPITAL: RegionId = 'WMS';

function table(pairs: ReadonlyArray<readonly [RegionId, RegionId]>): Record<RegionId, RegionId[]> {
  const out: Record<RegionId, RegionId[]> = Object.fromEntries(REGION_IDS.map((id) => [id, []]));
  for (const [a, b] of pairs) {
    out[a].push(b);
    out[b].push(a);
  }
  return out;
}

/** Land joins (the Scatter's causeways are land joins too). */
export const LAND: Readonly<Record<RegionId, readonly RegionId[]>> = table(LAND_JOINS);
/** Sea lanes. */
export const LANES: Readonly<Record<RegionId, readonly RegionId[]>> = table(SEA_LANES);

export function isCap(id: RegionId): boolean {
  return REGION[id]?.bloc === CAP_BLOC;
}
export function isHome(id: RegionId): boolean {
  return REGION[id]?.bloc === HOME_BLOC;
}
/** A port or an island: the fleet can be here. */
export function isSea(id: RegionId): boolean {
  const r = REGION[id];
  return !!r && (r.port || r.island);
}
export function regionName(id: RegionId): string {
  return REGION[id]?.name ?? id;
}
export function blocOf(id: RegionId): Bloc {
  return REGION[id].bloc;
}

/** Land and lane neighbours together (the Federation's reach, the way-out and bot distances). */
export const NEIGHBOURS: Readonly<Record<RegionId, readonly RegionId[]>> = Object.fromEntries(
  REGION_IDS.map((id) => [id, [...new Set([...LAND[id], ...LANES[id]])]]),
);

/**
 * Where the fleet can go from a sea region in one move: along a sea lane, or along the coast to a
 * neighbouring sea region (a port or an island joined by land).
 */
export const FLEET_MOVES: Readonly<Record<RegionId, readonly RegionId[]>> = Object.fromEntries(
  REGION_IDS.map((id) => [id, isSea(id) ? [...new Set([...LANES[id], ...LAND[id].filter(isSea)])] : []]),
);

/** The brigade's own moves: land joins. Carried by the fleet it may also cross a lane (see brigadeMoves). */
export const BRIGADE_MOVES: Readonly<Record<RegionId, readonly RegionId[]>> = LAND;

/**
 * Where the brigade can go this week: its land joins, plus across a sea lane when the fleet is at
 * either end of that lane (the fleet carries it). Never into the Cap.
 */
export function brigadeMoves(from: RegionId, fleetAt: RegionId | null): RegionId[] {
  const out = new Set<RegionId>(LAND[from]);
  if (fleetAt) for (const to of LANES[from]) if (fleetAt === from || fleetAt === to) out.add(to);
  return [...out].filter((r) => !isCap(r));
}
export function fleetMoves(from: RegionId): RegionId[] {
  return FLEET_MOVES[from].filter((r) => !isCap(r));
}

/** The regions a piece can reach to hold a promise: where it stands and one move away. */
export function reachOf(piece: Piece): RegionId[] {
  const near = piece.kind === 'fleet' ? FLEET_MOVES[piece.at] : LAND[piece.at];
  return [piece.at, ...near];
}
export function kindMoves(kind: PieceKind, from: RegionId, fleetAt: RegionId | null): RegionId[] {
  return kind === 'fleet' ? fleetMoves(from) : brigadeMoves(from, fleetAt);
}

/** Regions outside the Cap that touch it by land or by a lane: force here is force on their doorstep. */
export const NEAR_CAP: readonly RegionId[] = REGION_IDS.filter((id) => !isCap(id) && NEIGHBOURS[id].some(isCap));

/** Graph distance over land joins and lanes (the Federation's reach, the bots' sense of "far"). */
const DIST: Record<RegionId, Record<RegionId, number>> = {};
for (const start of REGION_IDS) {
  const d: Record<RegionId, number> = { [start]: 0 };
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of NEIGHBOURS[cur]) {
      if (d[n] === undefined) {
        d[n] = d[cur] + 1;
        queue.push(n);
      }
    }
  }
  DIST[start] = d;
}
export function distance(a: RegionId, b: RegionId): number {
  return DIST[a]?.[b] ?? Infinity;
}
/** Steps from the nearest Cap region. */
export function distanceFromCap(id: RegionId): number {
  return Math.min(...CAP_REGIONS.map((c) => distance(c, id)));
}
/** Regions in the given bloc. */
export function blocRegions(bloc: Bloc): RegionId[] {
  return WORLD_REGIONS.filter((r) => r.bloc === bloc).map((r) => r.id);
}
/** Stable map order for ties. */
export function mapOrder(ids: readonly RegionId[]): RegionId[] {
  const index = new Map(REGION_IDS.map((id, i) => [id, i]));
  return [...ids].sort((a, b) => (index.get(a) ?? 0) - (index.get(b) ?? 0));
}
