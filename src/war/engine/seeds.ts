/**
 * The two scripted seeds (SPEC section 13).
 * FIRST-WORLD: the first game on a device and PRACTICE. War's start, turns 1-2 and the first shop
 * are fixed; from turn 3 the streams seeded 'FIRST-WORLD' deal.
 * CROWN: loads Example 3 (the break) at turn 14, then plays on with streams seeded 'CROWN'.
 */
import type { RegionId } from '../content/map';
import type { StaffId } from '../content/staff';

export interface ScriptedTurn {
  crisis: RegionId;
  /** Lit in this order (red regions and the crisis are skipped; the list tops up from the pile). */
  lit: readonly RegionId[];
  /** The swap pile, in order. */
  pile: readonly RegionId[];
}

export const FIRST_WORLD_SEED = 'FIRST-WORLD';

export const FIRST_WORLD = {
  seed: FIRST_WORLD_SEED,
  war: ['DNM', 'ORN', 'FLE'] as readonly RegionId[],
  turns: {
    1: {
      crisis: 'SHL',
      lit: ['LNK', 'PBB', 'TRN', 'GUL', 'DRF', 'LTL', 'MRM', 'MRD', 'KLP', 'TLM'],
      pile: ['BRN', 'ICW', 'RMH', 'SLW', 'GLM', 'HRT', 'KLM', 'BRK'],
    },
    2: {
      crisis: 'TRN',
      lit: ['LNK', 'SHL', 'PBB', 'GUL', 'MRD', 'RMH', 'EDV', 'ASK', 'DRF', 'GLM'],
      pile: ['MRM', 'QLN', 'VSY', 'BRN', 'ICW', 'SLW', 'LTL', 'HRT'],
    },
  } as Readonly<Record<number, ScriptedTurn>>,
  /** Fixed shop offers by the turn the shop follows. */
  shop: { 2: ['DUTY', 'QM', 'HARBOUR'] } as Readonly<Record<number, readonly StaffId[]>>,
  /** SWAP is switched off on these turns. */
  swapLockedTurns: [1] as readonly number[],
} as const;

export const CROWN_SEED = 'CROWN';

export const CROWN = {
  seed: CROWN_SEED,
  turn: 14,
  gold: [
    'BRK', 'DRF', 'FLE', 'FRM', 'GLM', 'GUL', 'HRT', 'KLM', 'KLP', 'LNK', 'MRD',
    'MRM', 'ORN', 'PBB', 'RMH', 'SHL', 'SLW', 'TLM', 'TRN', 'WMS', 'WNM',
  ] as readonly RegionId[],
  red: ['ASK', 'BRN', 'EDV', 'NWK', 'VSY'] as readonly RegionId[],
  seats: ['DUTY', 'DEPUTY', 'SOVEREIGN', 'HARBOUR', 'HERALD'] as readonly StaffId[],
  coins: 6,
  crisis: 'LTL',
  lit: ['LNK', 'DNM', 'MRM', 'GUL', 'PBB', 'TLM', 'FLE', 'ORN', 'DRF', 'WMS'] as readonly RegionId[],
  pile: ['SHL', 'KLP', 'KLM', 'BRK', 'TRN', 'GLM'] as readonly RegionId[],
  /** The send the demo is built for (5,598,720, WIN 7), in an order that can be tapped (each touches an earlier pin). */
  pins: ['LTL', 'TLM', 'ORN', 'FLE', 'MRM'] as readonly RegionId[],
} as const;
