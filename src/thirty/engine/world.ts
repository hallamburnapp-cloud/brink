/**
 * The map as the rules see it: the 30 regions of src/war/content/map.json with their land joins
 * and sea lanes (through src/thirty/content/regions.ts), which regions are home and which are at
 * sea, and the deterministic picks the rules make among neighbours (so a preview can say exactly
 * which neighbour a show of force will heat).
 */
import { HOME_BLOC, HOME_CAPITAL, REGION_IDS, REGION_INFO, type RegionInfo } from '../content/regions.ts';
import type { Heat, RegionId } from '../content/types.ts';
import { WAR } from './rules.ts';

export { HOME_BLOC, HOME_CAPITAL, REGION_IDS, REGION_INFO };
export type { RegionInfo };

/** The Republic's six regions (Highmarch). "Home" for the Spin Doctor. */
export const HOME_REGIONS: readonly RegionId[] = REGION_IDS.filter((id) => REGION_INFO[id].bloc === HOME_BLOC);

export function isHome(region: RegionId): boolean {
  return REGION_INFO[region]?.bloc === HOME_BLOC;
}

/**
 * Ruling: a region is "at sea" when it has a sea lane (a port) or is a Scatter island. That is 19 of
 * the 30: every port (18) plus Lantern Key, the one island without a lane.
 */
export function isSea(region: RegionId): boolean {
  const r = REGION_INFO[region];
  return !!r && (r.port || r.island);
}

export const SEA_REGIONS: readonly RegionId[] = REGION_IDS.filter(isSea);

/** Land and sea-lane neighbours, west to east. */
export function neighboursOf(region: RegionId): readonly RegionId[] {
  return REGION_INFO[region]?.neighbours ?? [];
}

export function regionName(region: RegionId): string {
  return REGION_INFO[region]?.name ?? region;
}

/**
 * Regions sorted hottest first; ties keep map order (the order of map.json), so the same map always
 * gives the same answer. `prefer` breaks ties before map order (true first).
 */
export function hottestFirst(
  heats: Readonly<Record<RegionId, Heat>>,
  candidates: readonly RegionId[],
  prefer?: (r: RegionId) => boolean,
): RegionId[] {
  const index = new Map(REGION_IDS.map((id, i) => [id, i]));
  return [...candidates].sort((a, b) => {
    const dh = heats[b] - heats[a];
    if (dh) return dh;
    if (prefer) {
      const pa = prefer(a) ? 0 : 1;
      const pb = prefer(b) ? 0 : 1;
      if (pa !== pb) return pa - pb;
    }
    return (index.get(a) ?? 0) - (index.get(b) ?? 0);
  });
}

/** Regions sorted coolest first, ties in the order given (neighbours come west to east). */
export function coolestFirst(heats: Readonly<Record<RegionId, Heat>>, candidates: readonly RegionId[]): RegionId[] {
  return [...candidates].sort((a, b) => heats[a] - heats[b]);
}

/**
 * The neighbour a show of force heats when the card does not name one: the coolest neighbour not at
 * WAR (the least damage), ties west to east. Null when every neighbour is at WAR or protected.
 */
export function forceTarget(heats: Readonly<Record<RegionId, Heat>>, region: RegionId, allowed: (r: RegionId) => boolean): RegionId | null {
  const options = neighboursOf(region).filter((n) => heats[n] < WAR && allowed(n));
  return options.length ? coolestFirst(heats, options)[0] : null;
}

/** The hottest neighbours above CALM, hottest first, west to east among equals. */
export function hotNeighbours(heats: Readonly<Record<RegionId, Heat>>, region: RegionId): RegionId[] {
  return hottestFirst(heats, neighboursOf(region).filter((n) => heats[n] > 0));
}
