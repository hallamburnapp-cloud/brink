/**
 * The sounds, through src/audio (unchanged): a soft tick per day, a low tone when danger first passes
 * 60 and 80, a chord on STAND-DOWN, a single low note on WAR. Nothing else.
 */
import { audio } from '../../../audio';
import type { Ending } from './engine';

export const DANGER_TONES: readonly number[] = [60, 80];

/** The thresholds DANGER crosses upwards between two readings (the day's low tones). */
export function tonesCrossed(before: number, after: number): number[] {
  return DANGER_TONES.filter((t) => before < t && after >= t);
}

export function tickDay(): void {
  audio.play('tick', { intensity: 0.15 });
}

export function lowTone(): void {
  audio.play('thump', { intensity: 0.35 });
}

export function rollSweep(): void {
  audio.play('roll', { intensity: 0.3 });
}

export function endingSound(e: Ending): void {
  if (e.kind === 'WAR') audio.play('flashpoint_hit', { intensity: 0.5 });
  else if (e.kind === 'STAND-DOWN') audio.play('roll_success', { intensity: 0.6 });
  else audio.play('ending', { intensity: 0.4 });
}
