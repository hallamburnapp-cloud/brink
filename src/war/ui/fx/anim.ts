/**
 * What the HUD shows while a sweep plays back. The director writes these; the components read
 * them in place of the run's own values. Everything resets to "follow the run" when it ends.
 */
import { signal } from '@preact/signals';

/** The two boxes during a sweep (null: show the live preview). */
export const boxes = signal<{ I: bigint; M10: bigint } | null>(null);

/** Bump counters: each increment replays the box's landing pulse. */
export const bumps = signal({ inf: 0, mom: 0, mult: 0 });

/** The pattern name stamping into the readout (n retriggers the stamp). */
export const stampedPattern = signal<{ name: string; level: number; n: number } | null>(null);

/** The base-value flip on the boxes (n retriggers it). */
export const baseFlip = signal(0);

/** Seat hops: seat index -> counter. */
export const hops = signal<Record<number, number>>({});

/** HEAT: the board burns white, the threads glow. */
export const heat = signal(false);

/** The slam: 'slide' while the boxes travel, 'hit' on contact. */
export const slam = signal<'idle' | 'slide' | 'hit'>('idle');

/** The SWEEP lever is held down. */
export const leverDown = signal(false);

/** The Big Board's tiles cascading to a new total after a slam. */
export interface BoardShow {
  mode: 'cascade';
  text: string;
  ms: number;
  n: number;
}

/** An override for the Big Board's leverage tiles (null: the crisis total). */
export const boardShow = signal<BoardShow | null>(null);

/** The progress rule and ring follow this total while a sweep is shown (null: the run's). */
export const totalShown = signal<bigint | null>(null);

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

/** Keep the lit regions lit after a miss, until the lights go out. */
export const keepLit = signal(false);

let boardN = 0;
export function nextBoardN(): number {
  return ++boardN;
}

/** Back to following the run. */
export function resetAnim(): void {
  boxes.value = null;
  stampedPattern.value = null;
  hops.value = {};
  heat.value = false;
  slam.value = 'idle';
  leverDown.value = false;
  boardShow.value = null;
  totalShown.value = null;
  fundsShown.value = null;
  holdCleared.value = false;
  brassHold.value = null;
  keepLit.value = false;
  revealOutcome.value = true;
}
