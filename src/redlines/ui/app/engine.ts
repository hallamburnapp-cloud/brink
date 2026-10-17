/**
 * The one seam between the screens and the rules. Everything the UI knows about the game comes
 * through here: the engine (src/redlines/engine) and the compiled pack (src/redlines/content).
 * Nothing else under src/redlines/ui/app or src/redlines/ui/screens imports either of them; the
 * tests replace this module with a fake engine (vi.mock) and the paper map never reads it at all.
 */
export {
  answerCost,
  answerPhone,
  backCost,
  blocOf,
  canAnswer,
  canPromise,
  debrief,
  endWeek,
  holdable,
  isCap,
  loadGame,
  movePiece,
  movesFor,
  newGame,
  offerWayOut,
  pieceAt,
  pieceOf,
  promise,
  promiseAt,
  REGION_IDS,
  regionName,
  RULES,
  SAVE_KEY,
  saveGame,
  scoreOf,
  STEP_WORDS,
  withdraw,
} from '../../engine';
export type {
  Act,
  Ending,
  EndingKind,
  GameState,
  Heading,
  HeadlineKind,
  HoldCode,
  HoldInfo,
  Phase,
  Phone,
  PhoneKind,
  PhoneOption,
  Piece,
  PieceKind,
  PromiseMark,
  RefusalCode,
  RegionId,
  RegionState,
  Result,
  Step,
  Strings,
  WayOutTerm,
  WeekLog,
} from '../../engine';

export { BLOC_TITLES, content, contentIssues, onRedlinesContentChange } from '../../content';
export type { Adviser, AdviserId, ContentIssue, PackStrings, RedlinesPack, ScreenStrings } from '../../content';
