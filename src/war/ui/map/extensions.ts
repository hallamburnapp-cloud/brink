/**
 * Optional extras on top of contract.ts. Everything here is optional: a plain MapView and the plain
 * MapFx calls work unchanged. Pass these when you have them (the engine's Preview has the first
 * three) and the map draws more of the design's feedback.
 */
import type { MapController, MapView, RegionId } from './contract';

export interface MapViewExtras {
  /**
   * 1-based sweep order of the scoring pins while choosing (Preview.sweepOrder). The map shows
   * the order badges on the pins (STYLE 5.7). During a sweep the map derives the order itself
   * from dimExcept(ids), west to east.
   */
  sweepOrder?: Record<RegionId, number> | null;
  /** Pinned but not scoring (Preview.loose): drawn as grey pins (DESIGN, "Loose pins grey out"). */
  loose?: RegionId[] | null;
  /** SURROUND's ringed region (Preview.ringed): ringed in light. */
  ringed?: RegionId | null;
  /**
   * Lit regions a further pin would join to the pins already down: their heads carry a breathing
   * ring, so the player sees what joins (DESIGN 0:06, 'start to breathe').
   */
  joinable?: RegionId[] | null;
  /** The lit region under a mouse pointer: it breathes like a joinable one (desktop hover). */
  hover?: RegionId | null;
  /**
   * While choosing: what each scoring pin will add (from the engine's silent scorer), drawn as its
   * chip: cyan Influence, then amber Momentum ('+5', 'x1.5'); `passes` > 1 tags its name 'x2'.
   */
  pinChips?: Record<RegionId, PinChipView> | null;
  /**
   * LAY CABLE drag in progress: a provisional brass cable from a region's pin to the finger, in
   * map points. Leave null when not dragging.
   */
  cableDrag?: { from: RegionId; x: number; y: number } | null;
  /**
   * The crisis is won but the clear has not played yet: the flashpoint ring stays red (its arc
   * spent) instead of cooling, until collapseRing() closes it.
   */
  ringHold?: boolean;
}

/** One pin's chip as drawn: '+20', and '+5 x1.5' (or null when it leaves Momentum alone). */
export interface PinChipView {
  inf: string;
  mom: string | null;
  passes: number;
}

export type MapViewPlus = MapView & MapViewExtras;

export interface MapControllerPlus extends MapController {
  update(view: MapViewPlus): void;
  /**
   * Same as fx.pulseThread, plus the amount to pop on the thread (for example the Rail Clerk's
   * triple traffic). Without an amount the pop shows the thread's traffic from the view.
   */
  pulseThreadAmount(from: RegionId, to: RegionId, amount: number | null, ms?: number): void;
  /**
   * Light these regions one by one, `gapMs` apart (a deal or a refill), starting `delayMs` from now.
   * Call it before the update() that shows them lit: each stays dark until its turn, then warms up
   * over 150 ms. Calling it again for a region re-times its turn.
   */
  lightUp(ids: RegionId[], gapMs: number, delayMs?: number): void;
  /** The clear: the flashpoint ring closes in to the cooled ring and turns blue over `ms` (300). */
  collapseRing(ms?: number): void;
  /** A slam of 10x the target: light blooms out from a region across the table (600 ms). */
  bloom(from: RegionId, hex: string, ms?: number): void;
  /** Resolves once fonts are ready and the first full frame is drawn. */
  ready(): Promise<void>;
}
