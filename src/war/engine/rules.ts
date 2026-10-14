/** The slice's fixed numbers (spec sections 2, 7 and 8). */
import type { CrisisKind, TwistKind } from './types';

export const RULES = {
  startFunds: 5,
  seats: 5,
  traySlots: 2,
  sweeps: 4,
  swaps: 3,
  lit: 8,
  maxPins: 5,
  /** FULL TABLE: every sweep must use exactly this many pins. */
  fullTable: 5,
  /** Reward for clearing a Flare-up, Standoff, Summit. */
  rewards: [3, 4, 5] as const,
  interestPer: 5,
  interestCap: 4,
  treasurerFunds: 4,
  brassInfluence: 5,
  rerollBase: 4,
  /** RETIRE never takes the map below this many regions. */
  minLiveRegions: 12,
  /** The Hour whose Summit ends the slice (00:00). */
  sliceEndHour: 2,
} as const;

/** Fixed targets for 22:00, 23:00, 00:00 and 01:00; after that each Hour is x2.2. */
export const HOUR_TARGETS: ReadonlyArray<readonly [number, number, number]> = [
  [300, 450, 600],
  [900, 1350, 1800],
  [2500, 3750, 5000],
  [6000, 9000, 12000],
];
export const HOUR_GROWTH = { num: 22n, den: 10n } as const;

/** Summit twists of the first three Hours; later Summits draw one at random. */
export const FIXED_TWISTS: readonly TwistKind[] = ['GRIDLOCK', 'BLACKOUT', 'FULL_TABLE'];
export const TWIST_POOL: readonly TwistKind[] = ['GRIDLOCK', 'BLACKOUT', 'FULL_TABLE'];

export const CRISIS_KINDS: readonly CrisisKind[] = ['FLARE_UP', 'STANDOFF', 'SUMMIT'];

/** Briefing weights. */
export const OFFER_WEIGHTS = { staff: 70, order: 15, playbook: 15 } as const;
export const RARITY_WEIGHTS = { common: 70, uncommon: 25, rare: 5 } as const;

/** Overwhelm: +1, +2, +3 Funds when the crisis total reaches 2x, 4x, 8x the target. */
export const OVERWHELM_STEPS: ReadonlyArray<readonly [bigint, number]> = [
  [8n, 3],
  [4n, 2],
  [2n, 1],
];
