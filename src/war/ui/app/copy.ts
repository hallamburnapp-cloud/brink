/**
 * The words the game teaches with, as the spec prints them (docs/war/v2/SPEC.md sections 2 and 3).
 * Kept apart so a test can hold them to the spec word for word.
 */

/** The three intro screens (section 3). */
export const INTRO_COPY = {
  1: 'Win the world. Lantern Key is yours: gold. War has already taken 3 regions: red. Turn all 30 gold before war holds 10.',
  2: 'Each turn a crisis flares beside your gold. Pin lit regions that touch. Add their numbers, times how many. Pin the crisis to double it.',
  3: 'Beat the target: the crisis turns gold for good. Miss: war takes it. War also spreads by itself. Staff multiply your score.',
} as const;

/** The rules as the player reads them: How to play (section 2). */
export const RULES_COPY: readonly string[] = [
  'Turn all 30 regions gold before war holds 10.',
  'Each turn a crisis flares beside your gold, with a target. Nearby regions light up.',
  'Pin up to 5 lit regions that touch. Pin the crisis itself to double your score.',
  'Score: add their numbers, times how many you pinned. Staff then boost it, left to right.',
  'Once a turn you may swap unpinned lit regions.',
  'Beat the target: the crisis turns gold for good. Beat it by more, win more regions.',
  'Miss: war takes it. Every 3rd turn, war also spreads by itself.',
  'Each region won pays 1 coin. Every 2 turns, hire staff.',
  'No grey left? Crises flare on red: win each to unite the world. Miss one: ceasefire.',
];
