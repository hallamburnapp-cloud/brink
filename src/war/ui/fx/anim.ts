/**
 * What the HUD shows while a sweep plays back. The director writes these; the components read
 * them in place of the run's own values. Everything resets to "follow the run" when it ends.
 */
import { batch, signal } from '@preact/signals';
import type { RegionId } from '../../engine';

/** The two boxes during a sweep (null: show the live preview). */
export const boxes = signal<{ I: bigint; M10: bigint } | null>(null);

/**
 * Landing pulses: each increment replays a box's pulse. `mult` is a multiplier landing on
 * Momentum (heavier: a wobble and a kick), `base` the pattern stamp locking the base values in.
 */
export const bumps = signal({ inf: 0, mom: 0, mult: 0, base: 0 });

/** How hard the latest multiplier lands (x1.5 smaller than x2, x3 bigger), 0.8..1.2. */
export const multWeight = signal(1);

/** The pattern name stamping into the readout (n retriggers the stamp). */
export const stampedPattern = signal<{ name: string; level: number; n: number } | null>(null);

/** Seat hops: seat index -> counter. */
export const hops = signal<Record<number, number>>({});

/** HEAT: the board burns white, the threads glow. */
export const heat = signal(false);

/** The held breath before the slam: both boxes pulse once in time (n retriggers it). */
export const breath = signal(0);

/** The slam: 'slide' while the boxes travel, 'hit' on contact. */
export const slam = signal<'idle' | 'slide' | 'hit'>('idle');

/** The SWEEP lever is held down. */
export const leverDown = signal(false);

/** The Big Board's crisis total rolling up like an odometer after a slam. */
export interface BoardRoll {
  from: bigint;
  to: bigint;
  ms: number;
  n: number;
}
export const boardRoll = signal<BoardRoll | null>(null);

/** The progress rule and ring follow this total while a sweep is shown (null: the run's). */
export const totalShown = signal<bigint | null>(null);

/** A slam of 10x the target or more: the product stamped big over the map (n retriggers it). */
export const showcase = signal<{ text: string; sub: string; n: number } | null>(null);

/** Funds counted up coin by coin after a clear (null: the run's). */
export const fundsShown = signal<number | null>(null);

/** CLEARED is stamped on the board (n retriggers the stamp animation). */
export const clearedStamp = signal(0);

/** The Briefing tray / end card may show (false while the clear or miss sequence plays). */
export const revealOutcome = signal(true);

/** Hold CLEARED back until its moment in the clear sequence. */
export const holdCleared = signal(false);

/** One brass pin fewer is drawn here until it drops. */
export const brassHold = signal<string | null>(null);

/**
 * After a clear or a miss, the table keeps the sweep on show until the outcome has played: the
 * scored pins and their threads stay in, and on a miss the lit regions stay lit (no refill).
 */
export interface TableKeep {
  lit: RegionId[];
  pins: RegionId[];
  joins: Array<[RegionId, RegionId]>;
}
export const tableKeep = signal<TableKeep | null>(null);

/** The flashpoint ring stays red (not yet cooled) until the clear collapses it. */
export const ringHold = signal(false);

let n = 0;
/** A fresh counter value for retriggering signals. */
export function nextN(): number {
  return ++n;
}

/** Back to following the run. */
export function resetAnim(): void {
  batch(() => {
    boxes.value = null;
    stampedPattern.value = null;
    hops.value = {};
    heat.value = false;
    slam.value = 'idle';
    leverDown.value = false;
    boardRoll.value = null;
    totalShown.value = null;
    showcase.value = null;
    fundsShown.value = null;
    holdCleared.value = false;
    brassHold.value = null;
    tableKeep.value = null;
    ringHold.value = false;
    revealOutcome.value = true;
  });
}
