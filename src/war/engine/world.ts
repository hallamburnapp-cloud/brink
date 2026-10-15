/**
 * Who owns the map, and where wins and war go (SPEC sections 1 and 5; reference rules.py
 * win_order, war_spread_target, crisis_pool, _place_war). Every function is pure.
 */
import { Rng } from '../../engine/rng';
import { REGION, type RegionId } from '../content/map';
import { ADJ, IDS, distance, pinDistance2, westToEast } from './board';
import { RULES } from './rules';
import type { Owner } from './types';

export type OwnerMap = Record<RegionId, Owner>;

export function countOwner(owner: Readonly<OwnerMap>, kind: Owner): number {
  let n = 0;
  for (const r of IDS) if (owner[r] === kind) n++;
  return n;
}

export function regionsOf(owner: Readonly<OwnerMap>, kind: Owner): RegionId[] {
  return IDS.filter((r) => owner[r] === kind);
}

/** Every region grey except home, which is gold. */
export function freshOwners(): OwnerMap {
  const owner: OwnerMap = Object.fromEntries(IDS.map((r) => [r, 'grey' as Owner]));
  owner[RULES.home] = 'gold';
  return owner;
}

const OWNER_CHAR: Record<Owner, string> = { grey: '.', gold: 'G', red: 'R' };
const CHAR_OWNER: Record<string, Owner> = { '.': 'grey', G: 'gold', R: 'red' };

/** The 30-character form the reference fixtures use: one of '.', 'G', 'R' per region in IDS order. */
export function encodeOwners(owner: Readonly<OwnerMap>): string {
  return IDS.map((r) => OWNER_CHAR[owner[r]]).join('');
}

export function decodeOwners(text: string): OwnerMap | null {
  if (text.length !== IDS.length) return null;
  const owner: OwnerMap = {};
  for (let i = 0; i < IDS.length; i++) {
    const o = CHAR_OWNER[text[i]];
    if (!o) return null;
    owner[IDS[i]] = o;
  }
  return owner;
}

/**
 * War's starting regions: the first anywhere at least 3 joins from home, each next one a grey
 * neighbour of war at least 3 joins from home (all drawn by the 'war' stream).
 */
export function placeWar(owner: OwnerMap, rng: Rng): void {
  const far = (r: RegionId) => distance(RULES.home, r) >= RULES.warMinDist;
  owner[rng.pick(IDS.filter((r) => far(r) && owner[r] === 'grey'))] = 'red';
  while (countOwner(owner, 'red') < RULES.startWar) {
    const next = new Set<RegionId>();
    for (const r of IDS) {
      if (owner[r] !== 'red') continue;
      for (const n of ADJ[r]) if (owner[n] === 'grey' && far(n)) next.add(n);
    }
    const choices = next.size ? [...next].sort() : IDS.filter((r) => far(r) && owner[r] === 'grey');
    owner[rng.pick(choices)] = 'red';
  }
}

/**
 * Where this turn's crisis may flare: grey regions touching gold; if none, any grey region; if no
 * grey is left, red regions touching gold (the final push).
 */
export function crisisPool(owner: Readonly<OwnerMap>): { pool: RegionId[]; finalPush: boolean } {
  const grey = regionsOf(owner, 'grey');
  if (grey.length) {
    const front = grey.filter((r) => ADJ[r].some((n) => owner[n] === 'gold'));
    return { pool: front.length ? front : grey, finalPush: false };
  }
  const red = regionsOf(owner, 'red').filter((r) => ADJ[r].some((n) => owner[n] === 'gold'));
  return { pool: red, finalPush: true };
}

/**
 * The k regions a winning send turns gold: the crisis first, then the nearest regions that are not
 * gold (fewest joins from the crisis); at equal distance war's before grey, then the higher number,
 * then west, then north.
 */
export function winOrder(crisis: RegionId, owner: Readonly<OwnerMap>, k: number): RegionId[] {
  if (k <= 0) return [];
  const cand = IDS.filter((r) => r !== crisis && owner[r] !== 'gold');
  cand.sort(
    (a, b) =>
      distance(crisis, a) - distance(crisis, b) ||
      (owner[a] === 'red' ? 0 : 1) - (owner[b] === 'red' ? 0 : 1) ||
      REGION[b].weight - REGION[a].weight ||
      REGION[a].x - REGION[b].x ||
      REGION[a].y - REGION[b].y,
  );
  return [crisis, ...cand.slice(0, k - 1)];
}

/**
 * Where war spreads by itself: the grey region touching war that is nearest your gold (fewest
 * joins to any gold region), then the higher number, then west, then north. null when war holds
 * nothing or no grey region touches it.
 */
export function warSpreadTarget(owner: Readonly<OwnerMap>): RegionId | null {
  const cand = IDS.filter((r) => owner[r] === 'grey' && ADJ[r].some((n) => owner[n] === 'red'));
  if (!cand.length) return null;
  const gold = regionsOf(owner, 'gold');
  const toGold = (r: RegionId) => (gold.length ? Math.min(...gold.map((g) => distance(r, g))) : 0);
  cand.sort(
    (a, b) =>
      toGold(a) - toGold(b) ||
      REGION[b].weight - REGION[a].weight ||
      REGION[a].x - REGION[b].x ||
      REGION[a].y - REGION[b].y,
  );
  return cand[0];
}

/**
 * The war region red ink runs from into `target`: the touching war region whose pin is nearest
 * (ties west to east); null when none touches it (the ink blooms from the target's centre).
 */
export function warSource(owner: Readonly<OwnerMap>, target: RegionId): RegionId | null {
  const touching = westToEast(ADJ[target].filter((n) => owner[n] === 'red'));
  if (!touching.length) return null;
  return touching.reduce((best, r) => (pinDistance2(r, target) < pinDistance2(best, target) ? r : best));
}
