/**
 * The map data the renderer draws: the war room's 30-region world (src/war/content/map.json, a
 * 390 x 520 frame) fitted to this game's 390 x 400 map. Only the points move (x and y are scaled
 * separately: the world is a little flatter, its islands a little smaller); the ids, names,
 * joins and lanes are unchanged, so the engine's regions are the renderer's.
 */
import mapJson from '../../../war/content/map.json' with { type: 'json' };
import type { RegionId } from './contract';

export type Pt = [number, number];
/** The five blocs (content identity; the map draws no bloc colour). */
export type Bloc = 'CAP' | 'HMR' | 'SCT' | 'SND' | 'FRS';
/** The four mainland landmasses (the Scatter is islands). */
export type Mass = 'CAP' | 'HMR' | 'SND' | 'FRS';

export interface MapRegion {
  id: RegionId;
  name: string;
  bloc: Bloc;
  x: number;
  y: number;
  island: boolean;
  capital: boolean;
  /** Position in REGIONS; the mask stores index + 1. */
  index: number;
}

interface MapJson {
  frame: { w: number; h: number };
  regions: Array<{ id: string; name: string; colour: Bloc; x: number; y: number; capital: boolean; port: boolean }>;
  landmassOutlines: Record<Mass, Array<[number, number]>>;
  islands: { radius: number; regions: string[] };
  landJoins: Array<[string, string]>;
  seaLanes: Array<[string, string]>;
}

const data = mapJson as unknown as MapJson;

export const MAP_W = 390;
export const MAP_H = 400;

/** The source frame to this one: x unchanged, y fitted to the new height. */
export const SCALE_X = MAP_W / data.frame.w;
export const SCALE_Y = MAP_H / data.frame.h;

const sx = (x: number) => Math.round(x * SCALE_X * 10) / 10;
const sy = (y: number) => Math.round(y * SCALE_Y * 10) / 10;

export const MASSES: readonly Mass[] = ['CAP', 'HMR', 'SND', 'FRS'];

/** Island discs, scaled a little less than the frame so they keep room for their ring and label. */
export const ISLAND_R: number = Math.round(data.islands.radius * Math.sqrt(SCALE_X * SCALE_Y) * 10) / 10;
const islandSet = new Set(data.islands.regions);

export const REGIONS: readonly MapRegion[] = data.regions.map((r, index) => ({
  id: r.id,
  name: r.name,
  bloc: r.colour,
  x: sx(r.x),
  y: sy(r.y),
  island: islandSet.has(r.id),
  capital: r.capital,
  index,
}));

export const REGION: Readonly<Record<RegionId, MapRegion>> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

export const OUTLINES: Readonly<Record<Mass, readonly Pt[]>> = Object.fromEntries(
  MASSES.map((m) => [m, data.landmassOutlines[m].map(([x, y]) => [sx(x), sy(y)] as Pt)]),
) as Record<Mass, Pt[]>;

export const LAND_JOINS: ReadonlyArray<readonly [RegionId, RegionId]> = data.landJoins.map(([a, b]) => [a, b] as const);
export const SEA_LANES: ReadonlyArray<readonly [RegionId, RegionId]> = data.seaLanes.map(([a, b]) => [a, b] as const);

export function isIsland(id: RegionId): boolean {
  return islandSet.has(id);
}
