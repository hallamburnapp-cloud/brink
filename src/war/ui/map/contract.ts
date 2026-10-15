/**
 * The contract between the map renderer (src/war/ui/map/) and the rest of the war-room UI, for
 * WIN THE WORLD (docs/war/v2/SPEC.md, sections 8 and 14). The map draws state it is given and plays
 * effects it is told to play; it never runs rules or computes scores. Coordinates are map CSS px:
 * the map frame is 390 x 520.
 */

export type RegionId = string;
/** The five blocs. A region's bloc colour only tints it while it is grey. */
export type Colour = 'CAP' | 'HMR' | 'SCT' | 'SND' | 'FRS';
/** Ownership, the only thing colour means on the map: grey is free, gold is yours, red is war's. */
export type Owner = 'grey' | 'gold' | 'red';

export interface RegionView {
  id: RegionId;
  /** The region's bloc (drives the grey tint and the glyph). */
  colour: Colour;
  owner: Owner;
  /** Lit this turn (can be pinned, or is the crisis). Dark regions draw at 30%. */
  lit: boolean;
  /** Pinned in the current selection. */
  pinned: boolean;
  /** Lit, not pinned, and a pin here would be legal now (touches a pin, or nothing is pinned yet, and fewer than 5 pins). */
  addable: boolean;
  /** Lit and addable while at least one pin is down and it would join the group: its head breathes. */
  joinable: boolean;
  capital: boolean;
  port: boolean;
  /**
   * The outcome preview of the current pins: 'win' outlines the region dashed gold with its order
   * number (1 = the crisis); 'war' hatches it red (the crisis on a MISS preview).
   */
  preview: { kind: 'win' | 'war'; order: number } | null;
  /** Won as a crisis at some point: a small brass pin as decoration. */
  brass: boolean;
}

export interface CrisisView {
  id: RegionId;
  /** The target as the badge prints it, already formatted ('1,100'). */
  target: string;
  /** The crisis is pinned, so its ×2 chip lights. */
  doubled: boolean;
}

export interface MapView {
  regions: Record<RegionId, RegionView>;
  /** Joins between the pins, drawn as white threads (dashed over sea lanes). */
  joinedPins: Array<[RegionId, RegionId]>;
  /** The crisis ring and its target badge; null between turns and on end screens. */
  crisis: CrisisView | null;
  /** Where war spreads next by itself, and in how many turns (3, 2, 1 = 'THIS TURN'); null when it cannot. */
  warNext: { id: RegionId; turns: number } | null;
  /** The war has stopped (CEASEFIRE): red stops pulsing and fades to 60%. */
  ceased: boolean;
  /** Temporary emphasis (long-press on a shop card, the intro): these regions light, the rest dim. */
  highlight: RegionId[] | null;
  /** A teaching finger pulses on this region. */
  finger: RegionId | null;
  /** The lit region under a mouse pointer (desktop hover): it breathes like a joinable one. */
  hover: RegionId | null;
  /** 1-based pin order badges while choosing (west to east, the scoring order). */
  pinOrder: Record<RegionId, number> | null;
}

export type InkColour = 'gold' | 'red';

export interface MapFx {
  /** Fade everything except these regions to 30% (null restores). 150 ms by default. */
  dimExcept(ids: RegionId[] | null, ms?: number): void;
  /** Scan line (2 pt white, 40% glow) jumps to this map x; null hides it. */
  scanTo(x: number | null): void;
  /** Region flashes white for 80 ms, then holds. */
  flash(id: RegionId): void;
  /** A white pulse along the thread from one pin to another. */
  pulseThread(from: RegionId, to: RegionId, ms?: number): void;
  /** The crisis ring stamps its ×2 (300 ms). */
  ringStamp(): void;
  /** The ring collapses into the crisis region (300 ms). */
  ringCollapse(ms?: number): Promise<void>;
  /** A white ring from a region, 0 to 640 pt over `ms` (600); regions it crosses blink. */
  shockwave(from: RegionId, ms?: number): Promise<void>;
  /** A pulse of colour travels along a chain of joined regions (150 ms a step), e.g. from the crisis to a region it wins. */
  travel(path: RegionId[], colour: InkColour, msPerStep?: number): Promise<void>;
  /** Ink floods the targets from the source over `ms` (600): gold for a win, red for war. */
  inkSpread(source: RegionId, targets: RegionId[], colour: InkColour, ms?: number): Promise<void>;
  /** Light blooms out from a region across the table (a slam of 10x the target or more). */
  bloom(from: RegionId, hex: string, ms?: number): void;
  /** A wave of colour rolls out from a region over the whole map and fades back (the intro's goal wave, the WORLD UNITED wave). */
  wave(from: RegionId, colour: InkColour, ms?: number): Promise<void>;
  /** A brass pin drops onto a region (250 ms fall, 60 ms bounce). */
  dropBrass(id: RegionId): Promise<void>;
  /** WAR: grey regions go dark one by one over `ms` (2000); gold stays lit, red pulses once. */
  lightsOut(ms?: number): Promise<void>;
  /** Cancel every running effect and return to the plain state. */
  reset(): void;
}

export interface MapController {
  /** Replace the drawn state. Cheap to call; the renderer diffs or redraws as it likes. */
  update(view: MapView): void;
  /** Region under a point in map CSS px (islands use a 44 pt hit circle; a sea tap snaps to the nearest lit pin within 30 pt). */
  hit(x: number, y: number): RegionId | null;
  /** Pin centre in map CSS px. */
  pinPos(id: RegionId): { x: number; y: number };
  fx: MapFx;
  /** Light these regions one by one, `gapMs` apart, starting `delayMs` from now (a deal). Call before the update() that shows them lit. */
  lightUp(ids: RegionId[], gapMs: number, delayMs?: number): void;
  /** Global effect speed (1, 2 or 4): every fx duration is divided by it. */
  setSpeed(speed: number): void;
  setReducedMotion(on: boolean): void;
  /** Resolves once fonts are ready and the first full frame is drawn. */
  ready(): Promise<void>;
  destroy(): void;
}

export interface CreateMapOptions {
  reducedMotion: boolean;
  speed?: number;
}

export type CreateMap = (canvas: HTMLCanvasElement, opts: CreateMapOptions) => MapController;
