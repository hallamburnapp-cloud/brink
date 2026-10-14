/**
 * The map is the deck (spec section 2). At the start of each crisis the pile is every
 * non-retired region, shuffled with rng 'deal'; the flashpoint is its first region and the
 * first 8 light. Swept and swapped regions are spent; the hand refills to 8, and when the pile
 * runs short the spent regions are shuffled back in first.
 */
import { Rng } from '../../engine/rng';
import { REGION_IDS, type RegionId } from '../content/map';
import { CRISIS_KINDS, RULES } from './rules';
import type { Crisis, RunState } from './types';

export interface Deal {
  flashpoint: RegionId;
  lit: RegionId[];
  pile: RegionId[];
}

/**
 * Shuffle the live regions into a pile and light the first 8.
 * `scripted` puts these regions on top of the pile in this order (the first night);
 * the rest follow in rng order.
 */
export function dealRegions(retired: readonly RegionId[], rng: Rng, scripted: readonly RegionId[] = []): Deal {
  const out = new Set([...retired, ...scripted]);
  const rest = rng.shuffle(REGION_IDS.filter((r) => !out.has(r)));
  const pile = [...scripted.filter((r) => !retired.includes(r)), ...rest];
  return { flashpoint: pile[0], lit: pile.slice(0, RULES.lit), pile: pile.slice(RULES.lit) };
}

/** A fresh crisis for an Hour plan and a deal. */
export function makeCrisis(hour: number, index: 0 | 1 | 2, target: bigint, deal: Deal): Crisis {
  return {
    hour,
    index,
    kind: CRISIS_KINDS[index],
    target,
    total: 0n,
    sweepsLeft: RULES.sweeps,
    swapsLeft: RULES.swaps,
    flashpoint: deal.flashpoint,
    pile: deal.pile,
    lit: deal.lit,
    spent: [],
    pins: [],
    airlift: null,
    airliftPaper: null,
    sweeps: [],
    cleared: false,
  };
}

/** Light regions from the pile until 8 are lit (mutates a drafted state). */
export function refill(s: RunState): void {
  const c = s.crisis;
  const need = RULES.lit - c.lit.length;
  if (need <= 0) return;
  if (need > c.pile.length && c.spent.length > 0) {
    const rng = new Rng(s.rng.deal);
    c.pile.push(...rng.shuffle([...c.spent]));
    c.spent = [];
    s.rng.deal = rng.snapshot();
  }
  c.lit.push(...c.pile.splice(0, need));
}

/** Move regions from the hand (lit) to spent. */
export function spend(c: Crisis, regions: readonly RegionId[]): void {
  const gone = new Set(regions);
  c.lit = c.lit.filter((r) => !gone.has(r));
  c.spent.push(...regions);
}
