/**
 * BRINK: Red Lines — what the paper map draws and how the screens drive it.
 *
 * The map draws the view it is given; it never runs rules. The screens builder turns a `GameState`
 * into a `PaperView` (view.ts has the adapter) and calls `update(view)`; the map diffs the marks
 * against what is on the sheet and only touches what changed. Coordinates on the API are frame px:
 * the 390 x 844 phone frame the whole look is laid out in.
 *
 * The marks, in the art director's words (docs/redlines/looks/paper/frame.html):
 * - region states: pressed → red pencil hatching over the place; fighting → a red wash and the
 *   FIGHTING stamp, the printed name in red;
 * - promises: a black grease-pencil ring round the place with WE DEFEND in the hand; solid when the
 *   promise can be held, dashed (a bluff everyone can see) when it cannot;
 * - headings: a red pushpin on the place their forces are leaving and a pencil arrow to where they
 *   are heading;
 * - pieces: the fleet and the brigade as paper counters beside the place they are at;
 * - the tested place: a hard red pencil ring over it with TESTED underlined;
 * - the finger: a region pressed and held is lifted in graphite while the hold lasts.
 */

export type RegionId = string;
export type RegionState = 'calm' | 'pressed' | 'fighting';
export type PieceKind = 'fleet' | 'brigade';

export interface PromiseView {
  region: RegionId;
  /** Solid ring when the promise can be held; dashed when it cannot. */
  solid: boolean;
}

export interface HeadingView {
  /** The place their forces are leaving: the pushpin. */
  from: RegionId;
  /** Where they are heading: the arrow points there. */
  to: RegionId;
}

export interface PieceView {
  kind: PieceKind;
  at: RegionId;
}

export interface PaperView {
  /** Every region's state; a missing id is calm. */
  states: Record<RegionId, RegionState>;
  promises: PromiseView[];
  headings: HeadingView[];
  pieces: PieceView[];
  /** The place being tested this week (the phone's region), or null. */
  tested: RegionId | null;
  /** The region under a finger pressed and held (the promise gesture), or null. */
  pressed: RegionId | null;
  /** A counter the player has picked up to move (tap a counter, then a place), or null. */
  lifted?: PieceKind | null;
}

/** The words the map writes, from strings.yaml via the screens builder; the defaults are the mock's. */
export interface MapWords {
  /** The hand's word beside a promise ring. */
  defend: string;
  /** The hand's word under the tested place. */
  tested: string;
  /** The small rubber stamp over a place that is fighting. */
  fighting: string;
  /** The printed bloc titles. */
  blocs: { CAP: string; HMR: string; SCT: string; SND: string; FRS: string };
  /** The compass letter. */
  north: string;
  /** The small typed labels under the counters (empty strings hide them). */
  fleet: string;
  brigade: string;
}

export const MAP_WORDS: MapWords = {
  defend: 'WE DEFEND',
  tested: 'TESTED',
  fighting: 'FIGHTING',
  blocs: { CAP: 'THE CAP', HMR: 'HIGHMARCH', SCT: 'THE SCATTER', SND: 'THE SOUND', FRS: 'FARSOUTH' },
  north: 'N',
  fleet: 'FLEET',
  brigade: 'BRIGADE',
};

export interface PaperMapOptions {
  /** Start with every mark appearing at once (also read from prefers-reduced-motion). */
  reducedMotion?: boolean;
  /** Overrides for the words on the sheet. */
  words?: Partial<MapWords>;
  /** Draw the compass and the cup ring on the open desk below the map (the day frame). Default true. */
  desk?: boolean;
  /** The map's vertical offset in frame px (0 for the day frame; CALL_SHIFT for the call). Default 0. */
  shift?: number;
  /** The sheet's accessible name. */
  label?: string;
  /** Id prefix for the SVG defs, when two maps share a document. Default 'pp'. */
  idPrefix?: string;
}

export interface UpdateOptions {
  /** New marks animate in (a ring draws, a pin drops, the stamp slams); false puts them down at once. Default true. */
  animate?: boolean;
}

export interface PaperMap {
  /** Replace the drawn view. Diffs against the sheet; resolves when the new marks have settled (at once under reduced motion). */
  update(view: PaperView, opts?: UpdateOptions): Promise<void>;
  /** The region under a frame point (the finger), or null for the sea and the desk. */
  hit(fx: number, fy: number): RegionId | null;
  /** A region's centre in frame px (inside its plate, or the island's middle): where a real tap lands. */
  centre(id: RegionId): { x: number; y: number } | null;
  /** A region's plate bounds in frame px. */
  bounds(id: RegionId): { x0: number; y0: number; x1: number; y1: number } | null;
  /** Move the whole sheet up or down (frame px): CALL_SHIFT puts the Sound under the handset. */
  setShift(px: number): void;
  setReducedMotion(reduced: boolean): void;
  /** The sheet's SVG element (for the screens' pointer listeners). */
  readonly svg: SVGSVGElement;
  destroy(): void;
}

export const EMPTY_VIEW: PaperView = { states: {}, promises: [], headings: [], pieces: [], tested: null, pressed: null, lifted: null };
