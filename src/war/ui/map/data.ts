/**
 * The map data the renderer draws, read straight from map.json so the map does not depend on the
 * engine's content module. Nothing here changes during a run; per-run changes (colours, capitals,
 * ports, stamps) arrive through MapView.
 */
import mapJson from '../../content/map.json' with { type: 'json' };
import type { Colour, RegionId } from './contract';

export type Pt = [number, number];
export type Glyph = 'triangle' | 'circle' | 'diamond' | 'square' | 'hexagon';
/** The four mainland landmasses (the Scatter is islands). */
export type Mass = 'CAP' | 'HMR' | 'SND' | 'FRS';

export interface MapRegion {
  id: RegionId;
  name: string;
  /** Starting colour, which is also the landmass it sits on. */
  colour: Colour;
  weight: number;
  x: number;
  y: number;
  island: boolean;
  /** Starting flags (PROMOTE, the Herald and LAY CABLE change them during a run, via MapView). */
  capital: boolean;
  port: boolean;
  /** Position in REGIONS; the mask stores index + 1. */
  index: number;
}

interface MapJson {
  frame: { w: number; h: number };
  colours: Record<Colour, { name: string; hex: string; glyph: Glyph }>;
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
  landmassOutlines: Record<Mass, Array<[number, number]>>;
  islands: { radius: number; regions: string[] };
  landJoins: Array<[string, string]>;
  seaLanes: Array<[string, string]>;
}

const data = mapJson as unknown as MapJson;

export const MAP_W: number = data.frame.w;
export const MAP_H: number = data.frame.h;

export const COLOURS: readonly Colour[] = ['CAP', 'HMR', 'SCT', 'SND', 'FRS'];
export const MASSES: readonly Mass[] = ['CAP', 'HMR', 'SND', 'FRS'];

export const COLOUR_HEX: Readonly<Record<Colour, string>> = Object.fromEntries(
  COLOURS.map((c) => [c, data.colours[c].hex]),
) as Record<Colour, string>;

export const GLYPH: Readonly<Record<Colour, Glyph>> = Object.fromEntries(
  COLOURS.map((c) => [c, data.colours[c].glyph]),
) as Record<Colour, Glyph>;

export const ISLAND_R: number = data.islands.radius;
const islandSet = new Set(data.islands.regions);

export const REGIONS: readonly MapRegion[] = data.regions.map((r, index) => ({
  id: r.id,
  name: r.name,
  colour: r.colour,
  weight: r.weight,
  x: r.x,
  y: r.y,
  island: islandSet.has(r.id),
  capital: r.capital,
  port: r.port,
  index,
}));

export const REGION: Readonly<Record<RegionId, MapRegion>> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

export const OUTLINES: Readonly<Record<Mass, readonly Pt[]>> = Object.fromEntries(
  MASSES.map((m) => [m, data.landmassOutlines[m].map(([x, y]) => [x, y] as Pt)]),
) as Record<Mass, Pt[]>;

export const LAND_JOINS: ReadonlyArray<readonly [RegionId, RegionId]> = data.landJoins.map(([a, b]) => [a, b] as const);
export const SEA_LANES: ReadonlyArray<readonly [RegionId, RegionId]> = data.seaLanes.map(([a, b]) => [a, b] as const);

export function isIsland(id: RegionId): boolean {
  return islandSet.has(id);
}

/** Unordered pair key, used for joins and threads. */
export function pairKey(a: RegionId, b: RegionId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
