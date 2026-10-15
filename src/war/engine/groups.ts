/**
 * Legal pin sets (SPEC section 5, step 3): 1 to 5 lit regions, the crisis included, that form one
 * touching group over land borders, causeways and sea lanes. Also the UI's tap and lift rules.
 * A port of rules.py: touching, legal, groups, can_add, lift.
 */
import type { RegionId } from '../content/map';
import { ADJ, ADJ_MASK, IDS, INDEX, maskIds } from './board';
import { RULES } from './rules';

/** What can be pinned this turn: the lit regions and the crisis region. */
export function pinnable(lit: readonly RegionId[], crisis: RegionId): RegionId[] {
  return [...lit, crisis];
}

/** True when the regions form one touching group (an empty list does not). */
export function touching(regions: readonly RegionId[]): boolean {
  const nodes = new Set(regions);
  if (nodes.size === 0) return false;
  const start = regions[0];
  const reach = new Set([start]);
  const todo = [start];
  while (todo.length) {
    const r = todo.pop()!;
    for (const n of ADJ[r]) {
      if (nodes.has(n) && !reach.has(n)) {
        reach.add(n);
        todo.push(n);
      }
    }
  }
  return reach.size === nodes.size;
}

/** 1 to 5 distinct pinnable regions that touch each other. */
export function legal(pins: readonly RegionId[], lit: readonly RegionId[], crisis: RegionId): boolean {
  if (pins.length < 1 || pins.length > RULES.maxPins || new Set(pins).size !== pins.length) return false;
  const pool = new Set(pinnable(lit, crisis));
  return pins.every((r) => pool.has(r)) && touching(pins);
}

/**
 * Every legal pin set as a region bit mask (bit i is IDS[i]), sizes 1 to `maxPins`, in no
 * particular order. The fast path for enumerating sends.
 */
export function groupMasks(lit: readonly RegionId[], crisis: RegionId, maxPins: number = RULES.maxPins): number[] {
  let pool = 0;
  for (const r of pinnable(lit, crisis)) pool |= 1 << INDEX[r];
  const seen = new Set<number>();
  let frontier: number[] = [];
  for (let i = 0; i < IDS.length; i++) {
    if (pool & (1 << i)) {
      seen.add(1 << i);
      frontier.push(1 << i);
    }
  }
  for (let size = 2; size <= maxPins; size++) {
    const next: number[] = [];
    for (const g of frontier) {
      let reach = 0;
      for (let i = 0; i < IDS.length; i++) if (g & (1 << i)) reach |= ADJ_MASK[i];
      reach &= pool & ~g;
      for (let i = 0; i < IDS.length; i++) {
        if (!(reach & (1 << i))) continue;
        const h = g | (1 << i);
        if (!seen.has(h)) {
          seen.add(h);
          next.push(h);
        }
      }
    }
    frontier = next;
  }
  return [...seen];
}

function compareTuples(a: readonly string[], b: readonly string[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return a.length - b.length;
}

/** Every legal pin set, each sorted by id, the list sorted (as the reference's groups()). */
export function groups(lit: readonly RegionId[], crisis: RegionId, maxPins: number = RULES.maxPins): RegionId[][] {
  return groupMasks(lit, crisis, maxPins).map(maskIds).sort(compareTuples);
}

/**
 * The tap rule: a pinnable region can be pinned if it is not pinned yet, fewer than 5 are pinned,
 * and nothing is pinned or it touches a pin.
 */
export function canAdd(pins: readonly RegionId[], r: RegionId, lit: readonly RegionId[], crisis: RegionId): boolean {
  return (
    (r === crisis || lit.includes(r)) &&
    !pins.includes(r) &&
    pins.length < RULES.maxPins &&
    (pins.length === 0 || ADJ[r].some((n) => pins.includes(n)))
  );
}

/**
 * The lift rule: `pins` in tap order; lifting r also lifts every pin no longer touching the group
 * that holds the earliest remaining pin. Returns the pins left, in tap order.
 */
export function lift(pins: readonly RegionId[], r: RegionId): RegionId[] {
  const left = pins.filter((p) => p !== r);
  if (left.length === 0) return [];
  const keep = new Set([left[0]]);
  const todo = [left[0]];
  while (todo.length) {
    const x = todo.pop()!;
    for (const n of ADJ[x]) {
      if (left.includes(n) && !keep.has(n)) {
        keep.add(n);
        todo.push(n);
      }
    }
  }
  return left.filter((p) => keep.has(p));
}
