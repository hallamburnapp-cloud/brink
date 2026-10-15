/**
 * Map colours (SPEC "The screen", 2). Colour means heat and nothing else: CALM is a muted blue-grey,
 * TENSE amber, CRISIS orange (it pulses slowly), WAR red with hatching. The four also differ in
 * texture and brightness so they read in greyscale and for colour-blind players: TENSE is the
 * brightest, then CRISIS, then CALM, and WAR is the only hatched one. palette.test.ts holds that.
 */
import type { Heat } from './contract';

export type RGB = readonly [number, number, number];

export function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function css(c: RGB, a = 1): string {
  const r = c[0] | 0;
  const g = c[1] | 0;
  const b = c[2] | 0;
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${Math.max(0, a).toFixed(4)})`;
}

/** `top` at opacity t over `under`. */
export function mix(top: RGB, under: RGB, t: number): RGB {
  return [top[0] * t + under[0] * (1 - t), top[1] * t + under[1] * (1 - t), top[2] * t + under[2] * (1 - t)];
}

function toLinear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance (WCAG), 0 for black to 1 for white. */
export function luminance(c: RGB): number {
  return 0.2126 * toLinear(c[0]) + 0.7152 * toLinear(c[1]) + 0.0722 * toLinear(c[2]);
}

// ---------------------------------------------------------------- the table and the sea

/** The sea is the table itself (the map has no edge); a pool of light under it gives the land something to sit on. */
export const TABLE = hex('#0B1220');
export const SEA = TABLE;
export const WHITE: RGB = [255, 255, 255];
export const INK = hex('#060A12');
/** Coast and lane hairlines. */
export const HAIRLINE = hex('#9DB8D9');

// ---------------------------------------------------------------- the four heats

export const CALM = hex('#4B5E73');
export const TENSE = hex('#D8A440');
export const CRISIS = hex('#E2702F');
export const WAR = hex('#C1352A');
export const WAR_HATCH = hex('#6E1A14');
/** A cooling region's ripple crest, and the gauge's cool end. */
export const COOL = hex('#7FB6E6');
/** A heating region's ink front. */
export const HOT = hex('#FF7A5C');

export const HATCH_STEP = 6;
export const HATCH_WIDTH = 2;

export const HEAT_FILL: Readonly<Record<Heat, RGB>> = { 0: CALM, 1: TENSE, 2: CRISIS, 3: WAR };

/** A plate's fill and hatching (WAR only) at a heat. */
export function heatTone(h: Heat): { fill: RGB; hatch: RGB | null } {
  return { fill: HEAT_FILL[h], hatch: h === 3 ? WAR_HATCH : null };
}

/** Where the ring, the labels and the flag draw their white. */
export const RING_WHITE = hex('#F4F1E8');
export const LABEL_BG = hex('#0A1322');
