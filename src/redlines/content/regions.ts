/**
 * The 30 regions as the content pipeline knows them: ids, names, blocs and neighbours, read from
 * the shared map (src/war/content/map.json through src/war/content/map.ts, reused unchanged, the
 * same data src/thirty/ui/map/data.ts gives the engine). The validator checks the lines' regions
 * against this; the engine and the screens may read the bloc names from here too. Red Lines calls
 * the SND bloc "the Sound" (the paper look's THE SOUND), not the war room's "Sundry".
 */
import { REGIONS } from '../../war/content/map.ts';
import type { Bloc, RegionId } from './types.ts';

export interface RegionInfo {
  id: RegionId;
  name: string;
  bloc: Bloc;
  /** The bloc's name as a sentence says it ("the Sound", "Highmarch"). */
  blocName: string;
  capital: boolean;
  /** Has a sea lane. */
  port: boolean;
  /** A Scatter island. */
  island: boolean;
  /** The far end of this region's sea lane, if any. */
  lane: RegionId | null;
  /** Land and sea-lane neighbours. */
  neighbours: RegionId[];
}

/** The Federation's bloc and capital; the Republic's bloc and capital. */
export const CAP_BLOC: Bloc = 'CAP';
export const FED_CAPITAL: RegionId = 'WMS';
export const HOME_BLOC: Bloc = 'HMR';
export const HOME_CAPITAL: RegionId = 'EDV';

/** Bloc names in a sentence, and as the map prints them. */
export const BLOC_NAMES: Readonly<Record<Bloc, string>> = { CAP: 'the Cap', HMR: 'Highmarch', SCT: 'the Scatter', SND: 'the Sound', FRS: 'Farsouth' };
export const BLOC_TITLES: Readonly<Record<Bloc, string>> = { CAP: 'THE CAP', HMR: 'HIGHMARCH', SCT: 'THE SCATTER', SND: 'THE SOUND', FRS: 'FARSOUTH' };
export const BLOCS: readonly Bloc[] = ['CAP', 'HMR', 'SCT', 'SND', 'FRS'];

export const REGION_INFOS: readonly RegionInfo[] = REGIONS.map((r) => ({
  id: r.id,
  name: r.name,
  bloc: r.colour as Bloc,
  blocName: BLOC_NAMES[r.colour as Bloc],
  capital: r.capital,
  port: r.port,
  island: r.island,
  lane: r.lane,
  neighbours: [...r.neighbours],
}));

export const REGION_INFO: Readonly<Record<RegionId, RegionInfo>> = Object.fromEntries(REGION_INFOS.map((r) => [r.id, r]));
export const REGION_IDS: readonly RegionId[] = REGION_INFOS.map((r) => r.id);

export function isRegionId(id: string): boolean {
  return id in REGION_INFO;
}

/** The region's name, or the id when it is not one (so a message never crashes on bad data). */
export function regionName(id: RegionId): string {
  return REGION_INFO[id]?.name ?? id;
}

export function blocOf(id: RegionId): Bloc | null {
  return REGION_INFO[id]?.bloc ?? null;
}

/** The regions of one bloc, in map order. */
export function regionsOf(bloc: Bloc): RegionId[] {
  return REGION_INFOS.filter((r) => r.bloc === bloc).map((r) => r.id);
}
