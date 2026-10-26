/**
 * BRINK: Red Lines — the rules engine. Pure TypeScript, no DOM, content passed in, deterministic from
 * the seed. See docs/redlines/ENGINE.md for the API, the state, the rulings and the tuning log.
 */
export type {
  Act,
  Ending,
  EndingKind,
  FallCause,
  Federation,
  GameState,
  Heading,
  Line,
  Phase,
  Phone,
  PhoneKind,
  PhoneOption,
  Piece,
  PieceKind,
  PromiseMark,
  RegionId,
  RegionRec,
  RegionState,
  Result,
  Step,
  Tally,
  WayOutOffer,
  WayOutTerm,
  WeekLog,
} from './types.ts';
export { STEP_WORDS } from './types.ts';
export type {
  ActKind,
  Adviser,
  AdviserId,
  HeadlineKind,
  HiddenKind,
  HoldCode,
  LineDef,
  LineKind,
  PhoneOptionDef,
  PhoneTemplate,
  RedlinesContent,
  RefusalCode,
  RefuseWhy,
  Strings,
  WhyKind,
} from './content.ts';
export { ACT_KINDS, ADVISER_IDS, FALL_CAUSES, HEADLINE_KINDS, HIDDEN_KINDS, HOLD_CODES, LINE_KINDS, PHONE_KINDS, REFUSAL_CODES, REFUSE_WHYS, WAY_OUT_TERMS, WHY_KINDS, checkContent } from './content.ts';

// The API (BUILD.md).
export { answerPhone, canAnswer, canPromise, endWeek, holdable, movePiece, movesFor, newGame, offerWayOut, promise, withdraw } from './run.ts';
export { closingLines, debrief, dialsLine, endingOf, firstFallen, lessonsOf, MAX_LESSONS } from './debrief.ts';
export { RULES, scoreOf, fallWeeksAt, pushesAt, spreadAt, isScared, clampStep, TESTING, PUSHING, MASSING, FIGHTING, ALL_OUT } from './rules.ts';
export { answerCost, backCost, stepAtWeekStart, trawlerPool } from './phone.ts';
export { couldHaveReached, holdInfo, isAnswered, isSpared, promiseAt, pieceAt, pieceOf, fightingRegions, pressedRegions, unansweredRegions, draft, emptyTally, tallyOf } from './board.ts';
export type { HoldInfo } from './board.ts';
export { acceptWayOut, candidates, clockRunDown, crossesLine, planHeadings, promiseMinded, targetWhy, weightOf } from './agent.ts';
export { isFeintTest, FLEET_START, BRIGADE_START, homeOf } from './resolve.ts';
export { fill, fightingPhrase, fightingSentence, numberWord, placesPhrase, stepWord } from './words.ts';
export {
  BRIGADE_MOVES,
  CAP_BLOC,
  CAP_CAPITAL,
  CAP_REGIONS,
  FLEET_MOVES,
  HOME_BLOC,
  HOME_CAPITAL,
  HOME_REGIONS,
  LAND,
  LANES,
  NEAR_CAP,
  NEIGHBOURS,
  REGION,
  REGION_IDS,
  WORLD_REGIONS,
  blocOf,
  blocRegions,
  brigadeMoves,
  distance,
  distanceFromCap,
  fleetMoves,
  isCap,
  isHome,
  isSea,
  kindMoves,
  mapOrder,
  pieceDistance,
  reachOf,
  regionName,
} from './world.ts';
export type { Bloc, WorldRegion } from './world.ts';
// The save.
export { SAVE_KEY, isGameState, loadGame, saveGame } from './save.ts';
