/**
 * The words the game teaches with (docs/war/v2/SPEC.md sections 2 and 3). Kept apart so a test can
 * hold them to the coach strip's room: every intro beat sets in at most two lines at 16 pt.
 */

/**
 * The three intro screens (section 3), each a few short beats that follow the animation: a beat
 * says what the map is doing as it does it, never four rules at once.
 */
export const INTRO_COPY: Readonly<Record<1 | 2 | 3, readonly string[]>> = {
  1: [
    'Win the world: turn all 30 regions gold before war holds 10.',
    'Gold is yours. Red is war: it holds 3 already. Grey is free.',
  ],
  2: [
    'Each turn a crisis flares by your gold: the white ring. Beat its target.',
    'Pin lit regions that touch each other (dashed lanes count). Up to 5.',
    'Add their numbers, times how many you pinned. The crisis doubles it.',
    '33 × 8 = 264. That beats 64 by plenty: 2 regions.',
  ],
  3: [
    'Beat it: the crisis turns gold for good. Beat it by more: your pins too.',
    'Miss: war takes it. Every 3rd turn war also spreads, into the red tag.',
    'Staff boost your score. Hire them every 2 turns.',
  ],
};

/** The rules as the player reads them: How to play (section 2). */
export const RULES_COPY: readonly string[] = [
  'Turn all 30 regions gold before war holds 10.',
  'Each turn a crisis flares beside your gold, with a target. Nearby regions light up.',
  'Pin up to 5 lit regions that touch each other (dashed sea lanes count). Pin the crisis itself to double your score.',
  'Score: add their numbers, times how many you pinned. Staff then boost it, left to right.',
  'Once a turn you may swap unpinned lit regions.',
  'Beat the target: the crisis turns gold for good. Beat it by more, win more regions: your pins first.',
  'Miss: war takes it. Every 3rd turn, war also spreads by itself, into the red tag.',
  'Each region won pays 1 coin. Every 2 turns, hire staff.',
  'No grey left? Crises flare on red: win each to unite the world. Miss one: ceasefire.',
];

/** Under the rules: what the marks on the map mean. */
export const MARKS_COPY = '★ capital · ⚓ port: some staff score them.';
