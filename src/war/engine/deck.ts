/**
 * The deal (SPEC section 5, steps 2 and 4). The pile is every region that is not red and not the
 * crisis, within 3 joins of the crisis, shuffled by the 'deal' stream; the first 10 light. If none
 * of the 10 touches the crisis, the first pile region that does swaps places with the 10th.
 */
import type { Rng } from '../../engine/rng';
import type { RegionId } from '../content/map';
import { ADJ, IDS, distance } from './board';
import { RULES } from './rules';
import type { OwnerMap } from './world';

export interface Dealt {
  lit: RegionId[];
  pile: RegionId[];
}

/** The regions a deal draws from, in IDS order (before the shuffle). */
export function dealPool(owner: Readonly<OwnerMap>, crisis: RegionId): RegionId[] {
  return IDS.filter((r) => r !== crisis && owner[r] !== 'red' && distance(crisis, r) <= RULES.near);
}

export function deal(owner: Readonly<OwnerMap>, crisis: RegionId, rng: Rng): Dealt {
  const pile = rng.shuffle(dealPool(owner, crisis));
  const n = RULES.lit;
  const touches = (r: RegionId) => ADJ[crisis].includes(r);
  if (!pile.slice(0, n).some(touches)) {
    for (let j = n; j < pile.length; j++) {
      if (touches(pile[j])) {
        [pile[n - 1], pile[j]] = [pile[j], pile[n - 1]];
        break;
      }
    }
  }
  return { lit: pile.slice(0, n), pile: pile.slice(n) };
}

/**
 * A scripted deal (FIRST-WORLD): red regions and the crisis are skipped and the list tops up from
 * the scripted pile.
 */
export function scriptedDeal(owner: Readonly<OwnerMap>, crisis: RegionId, lit: readonly RegionId[], pile: readonly RegionId[]): Dealt {
  const ok = [...lit, ...pile].filter((r) => owner[r] !== 'red' && r !== crisis);
  return { lit: ok.slice(0, RULES.lit), pile: ok.slice(RULES.lit) };
}

/**
 * SWAP: every lit region that is not pinned goes dark and to the bottom of the pile; as many light
 * from the top. Pins stay. If the pile was short, regions that just went dark come back.
 */
export function swapLit(lit: readonly RegionId[], pile: readonly RegionId[], pins: readonly RegionId[]): Dealt {
  const keep = lit.filter((r) => pins.includes(r));
  const out = lit.filter((r) => !pins.includes(r));
  const all = [...pile, ...out];
  return { lit: [...keep, ...all.slice(0, out.length)], pile: all.slice(out.length) };
}
