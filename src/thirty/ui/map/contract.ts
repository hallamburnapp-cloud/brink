/**
 * What the map draws and how the screens drive it (SPEC "The screen", 2). The map draws state it is
 * given and plays the recolouring it is told to play; it never runs rules. Coordinates are map
 * points: the map frame is 390 x 400.
 *
 * Four things only: each region in one of four heats, the home flag on the capital, today's ring,
 * and on a map day the glowing places with their labels. Nothing else is ever drawn.
 */

export type RegionId = string;
/** 0 CALM, 1 TENSE, 2 CRISIS, 3 WAR. */
export type Heat = 0 | 1 | 2 | 3;

export interface Target {
  id: RegionId;
  /** The one-line label on the glowing region. */
  label: string;
}

export interface MapView {
  heats: Record<RegionId, Heat>;
  /** Today's region, ringed; its name sits under the ring. */
  ring: RegionId | null;
  /** News under the ring's name ('NOW TENSE', 'CALMED BY THE HOTLINE'), if the card brought any. */
  ringNote?: string | null;
  /** The places the player may tap today (a map day), else empty. */
  targets: Target[];
  /** The capital that carries the small flag. */
  home: RegionId;
  /** A target under the finger: it brightens. */
  pressed: RegionId | null;
}

/** One heat change to animate, in the order the engine's trace lists them. */
export interface HeatStep {
  region: RegionId;
  from: Heat;
  to: Heat;
  /** For a heat that spread from a neighbour: the ink runs in from there. */
  source?: RegionId | null;
}

export interface MapController {
  /** Replace the drawn state. Cheap to call; heats that differ from what is shown cross-fade. */
  update(view: MapView): void;
  /**
   * Play the day's heat changes over `ms` in the order given: a cooling region takes its new colour
   * as a cool ripple from its centre; a heating one as a run of ink from its source (or from its
   * own centre). Resolves when the last change has settled. Reduced motion: at once.
   */
  recolour(steps: HeatStep[], ms?: number): Promise<void>;
  /** Region under a point in map points, preferring the targets; null for the sea. */
  hit(x: number, y: number): RegionId | null;
  /** A region's centre in map points. */
  centre(id: RegionId): { x: number; y: number };
  setReducedMotion(on: boolean): void;
  /** Resolves once the fonts are ready and the first full frame is drawn. */
  ready(): Promise<void>;
  destroy(): void;
}

export interface CreateMapOptions {
  reducedMotion: boolean;
}

export type CreateMap = (canvas: HTMLCanvasElement, opts: CreateMapOptions) => MapController;
