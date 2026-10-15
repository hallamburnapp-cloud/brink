/**
 * The 30 regions as the content pipeline knows them: ids, names, blocs and neighbours, read from
 * the war room's map data (src/war/content/map.json, reused unchanged). The validator checks
 * region ids and neighbour claims against this; the engine may read it too.
 */
import { COLOURS, REGIONS } from '../../war/content/map.ts';
import type { Bloc, RegionId } from './types.ts';

export interface RegionInfo {
  id: RegionId;
  name: string;
  bloc: Bloc;
  /** The bloc's name as cards say it ("the Cap", "Highmarch"). */
  blocName: string;
  capital: boolean;
  /** Has a sea lane: force here is "at sea" for the Loyal Admiral. */
  port: boolean;
  /** A Scatter island. */
  island: boolean;
  /** Land and sea-lane neighbours. */
  neighbours: RegionId[];
}

/** The Republic's bloc and its capital: the flag mark on the map, the Chief of Staff's home. */
export const HOME_BLOC: Bloc = 'HMR';
export const HOME_CAPITAL: RegionId = 'EDV';

export const REGION_INFOS: readonly RegionInfo[] = REGIONS.map((r) => ({
  id: r.id,
  name: r.name,
  bloc: r.colour,
  blocName: COLOURS[r.colour].name,
  capital: r.capital,
  port: r.port,
  island: r.island,
  neighbours: [...r.neighbours],
}));

export const REGION_INFO: Readonly<Record<RegionId, RegionInfo>> = Object.fromEntries(REGION_INFOS.map((r) => [r.id, r]));

export const REGION_IDS: readonly RegionId[] = REGION_INFOS.map((r) => r.id);

export function isRegionId(id: string): boolean {
  return id in REGION_INFO;
}

export function areNeighbours(a: RegionId, b: RegionId): boolean {
  return REGION_INFO[a]?.neighbours.includes(b) ?? false;
}
