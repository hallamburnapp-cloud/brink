/**
 * The one seam between the screens and the rules. Everything the UI knows about the game comes
 * through here: the engine (src/thirty/engine) and the compiled pack (src/thirty/content). The
 * integrator joins the two sides at this file; nothing under src/thirty/ui imports them directly.
 */
export {
  choose,
  danger,
  dangerOf,
  fit,
  HOME_CAPITAL,
  HOME_REGIONS,
  isOfferDay,
  loadGame,
  mapDanger,
  newGame,
  nightDelta,
  nightLine,
  nightSteps,
  pick,
  preview,
  REGION_IDS,
  regionName,
  RULES,
  SAVE_KEY,
  saveGame,
  tapRegion,
  todayCard,
  todayOptions,
} from '../../engine';
export type { DayTrace, DealtCard, Ending, GameState, HeatChange, Preview, Result, TraceStep } from '../../engine';

export { content, contentIssues, onThirtyContentChange } from '../../content';
export type { Adviser, Card, ChoiceCard, ChoiceTag, Heat, MapCard, MapTarget, Piece, PieceId, RegionId, ThirtyContent } from '../../content';
