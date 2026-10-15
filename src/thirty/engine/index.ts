/**
 * BRINK: THIRTY DAYS — the rules engine. Pure TypeScript, no DOM, content passed in. See
 * docs/thirty-days/ENGINE.md for the API, the state shape, the trace and the rulings.
 */
export type {
  AlarmState,
  DayTrace,
  DealtCard,
  Deck,
  Ending,
  EndingKind,
  GameState,
  HeatChange,
  HeatWhy,
  Phase,
  Pick,
  Preview,
  QueuedFollow,
  Result,
  Streams,
  TraceStep,
} from './types.ts';

// Actions.
export { choose, danger, draft, endingAfter, newGame, pick, startingHeats, tapRegion } from './run.ts';
// Before the choice.
export { preview, previewAct, todayCard, todayOptions } from './preview.ts';
export { actOf, effectiveOdds, holds, missedBy, resolve } from './resolve.ts';
export type { Act, Resolution } from './resolve.ts';
export { composeHint, fit, hintLine, isPlain } from './hint.ts';
export type { HintInput } from './hint.ts';
// The deck and the team.
export { availablePieces, dealCard, drawOffer, fits, hasRedLineCard, hottestRegion, queueFollows, selectCard, starvingRegions } from './deck.ts';
export { KNOWN_ALARMS, isAlarmCard, isTalks, optionsOf, riskyOdds } from './cards.ts';
// The end of the day.
export { pressure } from './pressure.ts';
export { Working } from './working.ts';
// Numbers and the map.
export { CALM, CRISIS, HEATS, HEAT_NAME, RULES, TENSE, WAR, clampHeat, dangerOf, isOfferDay, mapDanger, weekOf } from './rules.ts';
export {
  HOME_BLOC,
  HOME_CAPITAL,
  HOME_REGIONS,
  REGION_IDS,
  REGION_INFO,
  SEA_REGIONS,
  coolestFirst,
  forceTarget,
  hotNeighbours,
  hottestFirst,
  isHome,
  isSea,
  neighboursOf,
  regionName,
} from './world.ts';
// The save.
export { SAVE_KEY, loadGame, saveGame } from './save.ts';
