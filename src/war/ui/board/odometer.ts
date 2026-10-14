/**
 * The Big Board's tick-up as an odometer: the crisis total rolls from the old value to the new one
 * in a few steps on an ease-out curve. Every step shows a value between the two, each larger than
 * the last, so the board never shows a number the sweep did not reach.
 */
import { formatShort } from '../../engine';

export interface RollStep {
  /** ms after the roll starts. */
  at: number;
  value: bigint;
  /** What the board shows (formatShort, 7 glyphs). */
  text: string;
}

/** One leaf flip lasts a little less than a step, so each flip lands before the next begins. */
export const ROLL_STEP_MS = 70;

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * The steps of a roll from `from` to `to` over `ms`; the last step is `to`, at `ms`. The first
 * step is at 0: the board starts moving the moment the product lands on it.
 */
export function rollSteps(from: bigint, to: bigint, ms: number): RollStep[] {
  const last = { at: Math.max(0, Math.round(ms)), value: to, text: formatShort(to, 7) };
  if (to <= from || ms <= 0) return [last];
  const n = Math.max(2, Math.floor(ms / ROLL_STEP_MS));
  const span = to - from;
  const out: RollStep[] = [];
  let shown = formatShort(from, 7);
  for (let i = 1; i < n; i++) {
    const e = easeOut(i / n);
    const value = from + (span * BigInt(Math.round(e * 1_000_000))) / 1_000_000n;
    const text = formatShort(value, 7);
    // A step that would not change the board is skipped; so is one that rounds up to the final text.
    if (text === shown || text === last.text) continue;
    out.push({ at: Math.round((ms * (i - 1)) / (n - 1)), value, text });
    shown = text;
  }
  out.push(last);
  return out;
}

/**
 * Where a number's tiles sit on the scale: its unit letter and how many decimals it shows ('0' for
 * 1,350; 'B2' for 5.80B; 'B1' for 10.6B). Tiles are keyed from the right, so while this stays the
 * same each tile keeps its place value and a right-to-left cascade can only show less than the new
 * value. When it changes (9.71B to 10.2B), a tile that flipped late would put an old digit in a new
 * place ('90.8B'): the row is set afresh instead.
 */
export function layoutOf(text: string): string {
  const m = /(?:\.(\d+))?([KMBT]?)$/.exec(text.trim());
  return `${m?.[2] ?? ''}${m?.[1]?.length ?? 0}`;
}
