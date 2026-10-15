/**
 * The WIN THE WORLD rules engine: pure, deterministic, no DOM. See README.md in this folder.
 * Import from here (and from '../content/*' for static data).
 */

// State and records
export type {
  BestSend,
  Colour,
  CrisisEvent,
  Deal,
  Ending,
  GameState,
  Mode,
  Owner,
  Phase,
  PinEvent,
  RegionId,
  RegionStaffEvent,
  Result,
  Seat,
  SendRecord,
  Shop,
  SlamEvent,
  StaffEvent,
  StaffId,
  StaffOp,
  TraceEvent,
  TurnLog,
  WarTake,
  WonRegion,
} from './types';

// Starting a game
export { newGame } from './run';
export type { NewGameOptions } from './run';
export { CROWN, CROWN_SEED, FIRST_WORLD, FIRST_WORLD_SEED } from './seeds';

// Actions (each returns Result: { ok, state, reason? })
export { buy, clearPins, moveSeat, nextTurn, pin, reroll, sell, send, setOwners, swap, togglePin, unpin } from './run';

// Checks (a reason string, or null when allowed)
export { buyProblem, sendProblem, swapProblem } from './run';

// Views for the screens (memoised per state)
export {
  actsOn,
  controlsView,
  endView,
  goalView,
  mapView,
  menuView,
  preview,
  readoutView,
  receipt,
  regionViews,
  seatViews,
  sendLabel,
  shopView,
} from './view';
export type {
  ControlsView,
  EndView,
  GoalView,
  LivePreview,
  MenuView,
  OfferView,
  PreviewLine,
  ReadoutView,
  SeatView,
  SendLabel,
  ShopView,
} from './view';

// The shop
export { bestOnOpening, bestScore, dealFeatures, drawOffers, nextShopAfter, previewNumber, price, sellValue, shopDue } from './shop';
export type { PreviewNumber } from './shop';

// Rules underneath: the graph, legal groups, scoring, the ladder, ownership, the deal
export { ADJ, IDS, distance, isJoined, isLane, pathBetween, westToEast } from './board';
export { canAdd, groupMasks, groups, legal, lift, pinnable, touching } from './groups';
export { Scorer, effective, featuresOf, goldCount, maskFeatures, scorePins } from './score';
export type { Features, ScoreResult } from './score';
export { marks, nextMark, regionsWon, target } from './ladder';
export {
  countOwner,
  crisisPool,
  decodeOwners,
  encodeOwners,
  freshOwners,
  regionsOf,
  warSource,
  warSpreadTarget,
  winOrder,
} from './world';
export type { OwnerMap } from './world';
export { deal, dealPool, scriptedDeal, swapLit } from './deck';
export { RULES } from './rules';

// Saving, display and determinism
export { SAVE_KEY, loadGame, saveGame } from './save';
export { formatFunds, formatInt, formatM10, formatM10Short, formatShort } from './format';
export { canonical, hashState, hashText, hashTrace } from './hash';

// Test and bot helpers
export { medianScore, must, ownersFrom, pinAll, position, sendOptions, tapOrder } from './testkit';
export type { SendOption } from './testkit';
