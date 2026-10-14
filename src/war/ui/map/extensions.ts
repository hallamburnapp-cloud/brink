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
   * LAY CABLE drag in progress: a provisional brass cable from a region's pin to the finger, in
   * map points. Leave null when not dragging.
   */
  cableDrag?: { from: RegionId; x: number; y: number } | null;
}

export type MapViewPlus = MapView & MapViewExtras;

export interface MapControllerPlus extends MapController {
  update(view: MapViewPlus): void;
  /**
   * Same as fx.pulseThread, plus the amount to pop on the thread (for example the Rail Clerk's
   * triple traffic). Without an amount the pop shows the thread's traffic from the view.
   */
  pulseThreadAmount(from: RegionId, to: RegionId, amount: number | null, ms?: number): void;
}
