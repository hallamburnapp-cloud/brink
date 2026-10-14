/**
 * The starting map: 30 regions in 5 colours, 45 land joins (36 borders + 9 Scatter causeways)
 * and 9 sea lanes. Data comes from map.json (spec section 1); this module types it and derives
 * the lookups the engine and the renderer share. Nothing here changes during a run: DEFECT,
 * PROMOTE, LAY CABLE and RETIRE live in the run's World state.
 */
import type { Colour, RegionId } from '../ui/map/contract';
import mapData from './map.json' with { type: 'json' };

export type { Colour, RegionId };

export interface RegionDef {
  id: RegionId;
  name: string;
  /** Starting colour (DEFECT can change it during a run). */
  colour: Colour;
  weight: number;
  /** Pin centre in map points (frame 390 x 520). */
  x: number;
  y: number;
  /** Starting capital (PROMOTE and the Herald add more during a run). */
  capital: boolean;
  /** Has a sea lane (LAY CABLE adds more ports during a run). */
  port: boolean;
  /** The region at the other end of this region's sea lane, if any. */
  lane: RegionId | null;
  /** A Scatter island (drawn as a disc of ISLAND_RADIUS). */
  island: boolean;
  /** Land and lane neighbours on the starting map, sorted west to east. */
  neighbours: RegionId[];
}

export interface ColourDef {
  id: Colour;
  name: string;
  hex: string;
  glyph: 'triangle' | 'circle' | 'diamond' | 'square' | 'hexagon';
}

export type Point = readonly [number, number];
export type Join = readonly [RegionId, RegionId];

interface MapJson {
  frame: { w: number; h: number; portraitScreenOrigin: [number, number] };
  colours: Record<Colour, { name: string; hex: string; glyph: ColourDef['glyph'] }>;
  regions: Array<{
    id: string;
    name: string;
    colour: Colour;
    weight: number;
    x: number;
    y: number;
    capital: boolean;
    port: boolean;
  }>;
  landmassOutlines: Record<'CAP' | 'HMR' | 'SND' | 'FRS', Array<[number, number]>>;
  islands: { radius: number; regions: string[] };
  landJoins: Array<[string, string]>;
  seaLanes: Array<[string, string]>;
}

const data = mapData as unknown as MapJson;

export const MAP_FRAME = {
  w: data.frame.w,
  h: data.frame.h,
  /** Where the map frame sits on the 390 x 844 portrait screen. */
  origin: { x: data.frame.portraitScreenOrigin[0], y: data.frame.portraitScreenOrigin[1] },
} as const;

/** Colours in their canonical order (north, west, centre, east, south). */
export const COLOUR_ORDER: readonly Colour[] = ['CAP', 'HMR', 'SCT', 'SND', 'FRS'];

export const COLOURS: Readonly<Record<Colour, ColourDef>> = Object.fromEntries(
  COLOUR_ORDER.map((c) => [c, { id: c, ...data.colours[c] }]),
) as Record<Colour, ColourDef>;

export const ISLAND_RADIUS: number = data.islands.radius;
const ISLAND_SET = new Set(data.islands.regions);

/** All 45 land joins: 36 mainland borders, then the 9 Scatter causeways. */
export const LAND: readonly Join[] = data.landJoins.map(([a, b]) => [a, b] as const);
/** The 9 causeways between Scatter islands (a subset of LAND). */
export const CAUSEWAYS: readonly Join[] = LAND.filter(([a, b]) => ISLAND_SET.has(a) && ISLAND_SET.has(b));
/** The 36 mainland borders (LAND without the causeways). */
export const BORDERS: readonly Join[] = LAND.filter(([a, b]) => !(ISLAND_SET.has(a) && ISLAND_SET.has(b)));
/** The 9 sea lanes. Every region has at most one. */
export const LANES: readonly Join[] = data.seaLanes.map(([a, b]) => [a, b] as const);

const laneOf = new Map<RegionId, RegionId>();
for (const [a, b] of LANES) {
  laneOf.set(a, b);
  laneOf.set(b, a);
}

const neighbourMap = new Map<RegionId, Set<RegionId>>();
for (const [a, b] of [...LAND, ...LANES]) {
  if (!neighbourMap.has(a)) neighbourMap.set(a, new Set());
  if (!neighbourMap.has(b)) neighbourMap.set(b, new Set());
  neighbourMap.get(a)!.add(b);
  neighbourMap.get(b)!.add(a);
}

const byPos = (xy: Record<RegionId, { x: number; y: number }>) => (a: RegionId, b: RegionId) =>
  xy[a].x - xy[b].x || xy[a].y - xy[b].y;

const positions = Object.fromEntries(data.regions.map((r) => [r.id, { x: r.x, y: r.y }]));

/** The 30 regions in stable map.json order (colour by colour). */
export const REGIONS: readonly RegionDef[] = data.regions.map((r) => ({
  id: r.id,
  name: r.name,
  colour: r.colour,
  weight: r.weight,
  x: r.x,
  y: r.y,
  capital: r.capital,
  port: r.port,
  lane: laneOf.get(r.id) ?? null,
  island: ISLAND_SET.has(r.id),
  neighbours: [...(neighbourMap.get(r.id) ?? [])].sort(byPos(positions)),
}));

export const REGION: Readonly<Record<RegionId, RegionDef>> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

export const REGION_IDS: readonly RegionId[] = REGIONS.map((r) => r.id);

/** Starting ports (both ends of every sea lane): 18. */
export const PORTS: readonly RegionId[] = REGIONS.filter((r) => r.port).map((r) => r.id);
/** Starting capitals: 5, one per colour. */
export const CAPITALS: readonly RegionId[] = REGIONS.filter((r) => r.capital).map((r) => r.id);

/** Landmass polygons in map points. The Scatter has none: each island is a disc. */
export const OUTLINES: Readonly<Record<'CAP' | 'HMR' | 'SND' | 'FRS', readonly Point[]>> = {
  CAP: data.landmassOutlines.CAP.map(([x, y]) => [x, y] as const),
  HMR: data.landmassOutlines.HMR.map(([x, y]) => [x, y] as const),
  SND: data.landmassOutlines.SND.map(([x, y]) => [x, y] as const),
  FRS: data.landmassOutlines.FRS.map(([x, y]) => [x, y] as const),
};

/** Scatter islands: one disc of ISLAND_RADIUS around each pin. */
export const ISLANDS: ReadonlyArray<{ id: RegionId; x: number; y: number; r: number }> = data.islands.regions.map(
  (id) => ({ id, x: REGION[id].x, y: REGION[id].y, r: ISLAND_RADIUS }),
);

/** West-to-east order (x, then y), the order a sweep scores in. */
export function compareWestEast(a: RegionId, b: RegionId): number {
  const ra = REGION[a];
  const rb = REGION[b];
  return ra.x - rb.x || ra.y - rb.y;
}

/** A stable key for an unordered pair of regions, e.g. traffic on a join. */
export function joinKey(a: RegionId, b: RegionId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function splitJoinKey(key: string): [RegionId, RegionId] {
  const [a, b] = key.split('|');
  return [a, b];
}
