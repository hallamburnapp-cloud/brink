/**
 * Every tunable of WIN THE WORLD (SPEC section 5; reference rules.py `P`). Staff prices and rules
 * live in content/staff.ts.
 */
export const RULES = {
  /** Lantern Key starts gold: GOLD 1/30 from the first second. */
  home: 'LNK',
  /** War starts with 3 joined regions, each at least 3 joins from home. */
  startWar: 3,
  warMinDist: 3,
  startCoins: 4,
  /** Every region won pays 1 coin; nothing else pays. */
  coinPerRegion: 1,
  /** War holds 10: WAR. */
  loseAt: 10,
  /** Regions lit each turn (the crisis region is lit as well) ... */
  lit: 10,
  /** ... dealt from the regions that are not red within 3 joins of the crisis. */
  near: 3,
  /** The crisis region counts as a pin when pinned. */
  maxPins: 5,
  /** One swap a turn; pins stay. */
  swaps: 1,
  /** target(t) = 64 x 1.5^(t-1), rounded to 2 significant figures. */
  target0: 64n,
  targetRatio: { num: 3n, den: 2n },
  /** Beat the target: 1 region; 4x: 2; 16x: 3; then one more for every further doubling. */
  ladder: [4n, 16n] as readonly bigint[],
  ladderThen: 2n,
  /** After every 3rd turn, war spreads into one grey region by itself. */
  warEvery: 3,
  /** The shop opens after turn 2, then after every 2nd turn (4, 6, 8 ...). */
  shopFirst: 2,
  shopEvery: 2,
  offers: 3,
  seats: 5,
  /** Reroll costs 2, then 3, 4 ... within the same visit. */
  reroll: 2,
  /** The Old Hand starts at x1.0 and grows by 0.2 at the end of every turn it is seated (tenths). */
  oldHandStartM10: 10,
  oldHandStepM10: 2,
  regions: 30,
} as const;
