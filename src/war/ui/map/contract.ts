/**
 * The contract between the map renderer (src/war/ui/map/) and the rest of the war-room UI.
 * The map draws state it is given and plays effects it is told to play; it never runs rules
 * or computes scores. Coordinates are map CSS px: the map frame is 390 x 520 (spec section 1).
 */

export type RegionId = string;
export type Colour = 'CAP' | 'HMR' | 'SCT' | 'SND' | 'FRS';

export type RegionStatus = 'lit' | 'dark' | 'spent' | 'retired';
export type Stamp = 'FORTIFY' | 'RELAY' | 'ECHO' | null;

export interface RegionView {
  id: RegionId;
  /** Current colour (DEFECT can change it). */
  colour: Colour;
  status: RegionStatus;
  /** In the current selection (pinned this sweep). */
  pinned: boolean;
  /** Pinned through an armed AIRLIFT (it is not lit). */
  airlift: boolean;
  /** Includes PROMOTE and, while the Herald is seated, every region. */
  capital: boolean;
  /** Includes both ends of every cable. */
  port: boolean;
  stamp: Stamp;
  /** Brass pins earned (each is +5 Influence when it scores). */
  brass: number;
  /** Influence glow, 0..0.4 (+0.03 per scoring, capped). */
  glow: number;
}

/** A red thread between two joined regions that have scored together. */
export interface ThreadView {
  a: RegionId;
  b: RegionId;
  traffic: number;
}

export interface MapView {
  regions: Record<RegionId, RegionView>;
  threads: ThreadView[];
  /** Brass cables laid with LAY CABLE. */
  cables: Array<[RegionId, RegionId]>;
  /** Joins between the currently pinned regions, so the player sees pins join up. */
  joinedPins: Array<[RegionId, RegionId]>;
  flashpoint: RegionId | null;
  /** Flashpoint ring radius factor: max(0, 1 - total / target). */
  ring: number;
  /** Summit GRIDLOCK in force: sea lanes and cables are drawn crossed out. */
  gridlock: boolean;
  /** Ferry Master seated (and no Gridlock): dotted arcs between ports. */
  ferry: boolean;
  /** Summit BLACKOUT in force: this colour is darkened. */
  blackout: Colour | null;
  /** An Order is armed: highlight the regions it may target; 'drag' for LAY CABLE. */
  armed: null | { kind: 'tap' | 'drag'; valid: RegionId[]; chosen: RegionId[] };
  /** Long-press preview of where an offer acts, or any other temporary emphasis. */
  highlight: RegionId[] | null;
  /** First-night finger pulse. */
  finger: RegionId | null;
}

export interface MapFx {
  /** Fade everything except these regions to 30% (null restores). 150 ms by default. */
  dimExcept(ids: RegionId[] | null, ms?: number): void;
  /** Scan line (2 pt white, 40% glow) jumps to this map x; null hides it. */
  scanTo(x: number | null): void;
  /** Scan line snaps back over 80 ms for an AGAIN. */
  scanAgain(x: number): void;
  /** Region flashes white for 80 ms, then holds its colour at 70%. */
  flash(id: RegionId): void;
  /** A thread pulse from one pin to another over `ms` (100 by default). */
  pulseThread(from: RegionId, to: RegionId, ms?: number): void;
  /** Stamp pulse on a region (FORTIFY / RELAY / ECHO). */
  stampPulse(id: RegionId): void;
  /** Blue standby pulse on an unpinned lit region. */
  standbyPulse(id: RegionId): void;
  /** Heat: threads glow white until turned off. */
  heat(on: boolean): void;
  /** Full-map flash in a colour (slam at r >= 10). */
  mapFlash(hex: string, ms?: number): void;
  /** Clear: white ring from the flashpoint, 0 to 640 pt over `ms` (600); regions it crosses blink. */
  shockwave(from: RegionId, ms?: number): Promise<void>;
  /** Brass pin drops onto a region (250 ms fall, 60 ms bounce). */
  dropBrass(id: RegionId): Promise<void>;
  /** Miss: lights go out region by region in random order over `ms` (2000). */
  lightsOut(ms?: number): Promise<void>;
  /** DEFECT: ink spreads from the source to the targets over `ms` (600). */
  inkSpread(source: RegionId, targets: RegionId[], ms?: number): Promise<void>;
  /** Cancel every running effect and return to the plain state. */
  reset(): void;
}

export interface MapController {
  /** Replace the drawn state. Cheap to call; the renderer diffs or redraws as it likes. */
  update(view: MapView): void;
  /** Region under a point in map CSS px, with island and sea-snap rules (spec section 1, HIT TESTING). */
  hit(x: number, y: number): RegionId | null;
  /** Pin centre in map CSS px. */
  pinPos(id: RegionId): { x: number; y: number };
  fx: MapFx;
  /** Global effect speed (1, 2 or 4): every fx duration is divided by it. */
  setSpeed(speed: number): void;
  setReducedMotion(on: boolean): void;
  destroy(): void;
}

export interface CreateMapOptions {
  reducedMotion: boolean;
  speed?: number;
}

export type CreateMap = (canvas: HTMLCanvasElement, opts: CreateMapOptions) => MapController;
