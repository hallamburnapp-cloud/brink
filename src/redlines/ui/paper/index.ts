/**
 * BRINK: Red Lines — the paper situation room: the map and the parts on the desk.
 *
 *   import { createPaperMap, PaperMapView, viewFromState, PaperRoom, Grain, Lamp, Calendar, IndexCard, ... } from '@/redlines/ui/paper';
 *   import '@/redlines/ui/paper/paper.css';         // and public/redlines/fonts/fonts.css in the page head
 *
 * contract.ts is the whole map API; parts.tsx the components; view.ts the GameState adapter.
 */
export { createPaperMap } from './map';
export { PaperMapView, type PaperMapProps, type PaperMapRef } from './PaperMap';
export { viewFromState, testedOf, sameView, type ViewExtras } from './view';
export { EMPTY_VIEW, MAP_WORDS } from './contract';
export type { HeadingView, MapWords, PaperMap, PaperMapOptions, PaperView, PieceKind, PieceView, PromiseView, RegionId, RegionState, UpdateOptions } from './contract';
export { CALL_SHIFT, FRAME, centreOf, hitFrame, toFrame, toMap, getGeometry, type FrameTransform } from './geometry';
export { SETTLE_MS } from './marks';
export {
  Calendar,
  CallerCard,
  DebriefPage,
  Dim,
  FlipClock,
  Grain,
  Handset,
  IndexCard,
  IntelSlip,
  Lamp,
  NeatLine,
  Note,
  Paperclip,
  PaperRoom,
  PencilUnderline,
  SheetTitle,
  Stamp,
  Tape,
  TornSlip,
  TreatyBar,
  TypedCard,
  TypedForm,
  WarBoxes,
  type CalendarProps,
  type CallerCardProps,
  type DebriefPageProps,
  type IndexCardProps,
  type TapeLine,
  type TypedCardProps,
  type TypedFormProps,
} from './parts';
