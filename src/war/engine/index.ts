/**
 * The war-room rules engine: pure, deterministic, no DOM. See README.md in this folder.
 * Import from here (and from '../content/*' for static data).
 */

// State and records
export type {
  AgainReason,
  Armed,
  BestSweep,
  ClearRecord,
  Colour,
  Crisis,
  CrisisKind,
  Folder,
  FolderKind,
  FolderStatus,
  HourPlan,
  Offer,
  OrderId,
  Paper,
  PatternId,
  Phase,
  RegionId,
  Result,
  RunLogEntry,
  RunMode,
  RunState,
  SeatedStaff,
  Shop,
  StaffId,
  StampKind,
  SweepRecord,
  SweepSummary,
  TraceEvent,
  TraceOp,
  TracePhase,
  Twist,
  TwistKind,
  World,
} from './types';

// Starting a run
export { FIRST_NIGHT_PILE, FIRST_NIGHT_SEED, newRun, newSandbox, startingWorld } from './run';

// Actions (each returns Result: { ok, state, reason? })
export {
  armOrder,
  buyFolder,
  buyOffer,
  clearPins,
  confirmArmed,
  disarm,
  keepGoing,
  moveSeat,
  nextCrisis,
  pickFromFolder,
  pin,
  reroll,
  sellPaper,
  sellStaff,
  skipFolder,
  swap,
  sweep,
  tapArmed,
  togglePin,
  unpin,
  useOrder,
} from './run';

// Checks (a reason string, or null when allowed)
export {
  canConfirmArmed,
  folderProblem,
  offerProblem,
  paperProblem,
  pickProblem,
  swapProblem,
  sweepProblem,
} from './run';

// Reading the board
export { boardOf, scorePins, twistInForce } from './run';
export {
  actsOn,
  armedView,
  boardLabels,
  endLabels,
  isCapital,
  isPort,
  litHasJoin,
  mapFlags,
  nextCrisisInfo,
  patternExample,
  patternTable,
  pinChips,
  preview,
  progress,
  regionViews,
  ringFactor,
  seatViews,
  shopView,
  threadViews,
  trayViews,
} from './view';
export type {
  ArmedView,
  BoardLabels,
  CardView,
  FolderView,
  NextCrisisInfo,
  OfferView,
  PaperView,
  PatternRow,
  PinChip,
  Preview,
  SeatView,
  ShopView,
} from './view';

// Lower level: scoring, patterns, the join graph, hours, Orders
export { scoreSelection } from './score';
export type { ScoreInput, ScoreOptions, ScoreResult } from './score';
export { baseProduct, components, detectPattern, listCandidates, startingLevels } from './patterns';
export type { Candidate, Detection, PatternBoard } from './patterns';
export { buildBoard, resolveStaff } from './board';
export type { ActingStaff, Board } from './board';
export { CRISIS_NAME, TWIST_NAME, clockOf, hourLabel, hourTargets, isOvertime, twistRule } from './hours';
export { armedPrompt, statusOf, targetProblem, targetsProblem, validTargets } from './orders';
export { playbookPool } from './shop';
export { HOUR_TARGETS, RULES } from './rules';

// Display and determinism
export { formatFunds, formatInt, formatM10, formatM10Short, formatShort } from './format';
export { canonical, hashState, hashText, hashTrace } from './hash';
