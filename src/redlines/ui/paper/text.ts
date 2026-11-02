/**
 * How much paper a line of text covers, from the faces' real glyphs (metrics.ts, measured in a browser):
 * the ink's box for a string set at a point, with its letter-spacing, its anchor and the slight tilt the
 * hand gives it. The marks keep their words and counters off each other and off the printed names with
 * these boxes. Pure, so it has tests.
 */
import { GLYPHS, type Face, type Glyph } from './metrics';
import type { Box } from './place';

export interface TextSpec {
  face: Face;
  /** px */
  size: number;
  /** CSS letter-spacing, in em. */
  spacing: number;
  /** text-transform: uppercase. */
  upper?: boolean;
}

/** The faces as paper.css sets them on the sheet. */
export const TEXT = {
  /** WE DEFEND (.pp-hw). */
  hand: { face: 'hand', size: 12.5, spacing: 0.02 },
  /** TESTED (.pp-hw.pp-hwred). */
  handRed: { face: 'hand', size: 13.5, spacing: 0.02 },
  /** A counter's label (.pp-ct). */
  counter: { face: 'type', size: 5.4, spacing: 0.12 },
  /** FIGHTING on the small stamp (.pp-stamp-sm), before the stamp's own scale. */
  stamp: { face: 'type', size: 8.6, spacing: 0.14 },
  /** The printed names (.pp-nm; .pp-isle, .pp-sm, .pp-cap). */
  name: { face: 'print', size: 8.4, spacing: 0.13, upper: true },
  isle: { face: 'print', size: 7.1, spacing: 0.09, upper: true },
  small: { face: 'print', size: 7.4, spacing: 0.08, upper: true },
  capital: { face: 'printBold', size: 8.9, spacing: 0.13, upper: true },
  /** The bloc titles (.pp-blocs text; .pp-bloc-sm). */
  bloc: { face: 'print', size: 9.4, spacing: 0.34 },
  blocSmall: { face: 'print', size: 7.6, spacing: 0.26 },
} as const satisfies Record<string, TextSpec>;

const FALLBACK: Glyph = [0.55, 0, 0.55, 0.7, 0.05];

function glyph(face: Face, ch: string): Glyph {
  return GLYPHS[face][ch] ?? GLYPHS[face][ch.toUpperCase()] ?? FALLBACK;
}

/** The pen's advance over the whole string (letter-spacing after every character, as the browser sets it). */
export function advance(spec: TextSpec, text: string): number {
  const s = spec.upper ? text.toUpperCase() : text;
  let w = 0;
  for (const ch of s) w += glyph(spec.face, ch)[0] * spec.size + spec.spacing * spec.size;
  return w;
}

/**
 * The ink's box of `text` set at (x, y) (the baseline), anchored 'middle' or 'start', turned `rot` degrees
 * about (x, y), grown by `margin` on every side.
 */
export function inkBox(spec: TextSpec, text: string, x: number, y: number, anchor: 'middle' | 'start' | 'end' = 'middle', rot = 0, margin = 0): Box {
  const s = spec.upper ? text.toUpperCase() : text;
  const size = spec.size;
  const total = advance(spec, text);
  let pen = anchor === 'middle' ? -total / 2 : anchor === 'end' ? -total : 0;
  let x0 = Infinity;
  let x1 = -Infinity;
  let up = 0;
  let down = 0;
  for (const ch of s) {
    const [adv, left, right, asc, desc] = glyph(spec.face, ch);
    if (ch !== ' ') {
      x0 = Math.min(x0, pen - left * size);
      x1 = Math.max(x1, pen + right * size);
      up = Math.max(up, asc * size);
      down = Math.max(down, desc * size);
    }
    pen += adv * size + spec.spacing * size;
  }
  if (!Number.isFinite(x0)) return { x0: x, y0: y, x1: x, y1: y };
  return turnBox({ x0: x0 - margin, y0: -up - margin, x1: x1 + margin, y1: down + margin }, x, y, rot);
}

/** A box given relative to a point, turned `rot` degrees about it and set there: the turned box's bounds. */
export function turnBox(b: Box, x: number, y: number, rot = 0): Box {
  if (!rot) return { x0: x + b.x0, y0: y + b.y0, x1: x + b.x1, y1: y + b.y1 };
  const a = (rot * Math.PI) / 180;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [px, py] of [
    [b.x0, b.y0],
    [b.x1, b.y0],
    [b.x0, b.y1],
    [b.x1, b.y1],
  ]) {
    const rx = px * c - py * sn;
    const ry = px * sn + py * c;
    x0 = Math.min(x0, rx);
    x1 = Math.max(x1, rx);
    y0 = Math.min(y0, ry);
    y1 = Math.max(y1, ry);
  }
  return { x0: x + x0, y0: y + y0, x1: x + x1, y1: y + y1 };
}

/**
 * A tilted line of text as a few boxes, one per slice of its width, each the bounds of its own turned
 * slice: a long word tilted a few degrees is not charged for the empty corners of one big box.
 */
export function inkSlices(spec: TextSpec, text: string, x: number, y: number, rot = 0, margin = 0, slices = 3, anchor: 'middle' | 'start' | 'end' = 'middle'): Box[] {
  const local = inkBox(spec, text, 0, 0, anchor, 0, margin);
  return sliceTurned(local, x, y, rot, slices);
}

/** A local box (about the point) cut into `n` vertical slices, each turned `rot` degrees and set at (x, y). */
export function sliceTurned(local: Box, x: number, y: number, rot: number, n: number): Box[] {
  if (!rot || n <= 1) return [turnBox(local, x, y, rot)];
  const w = (local.x1 - local.x0) / n;
  return Array.from({ length: n }, (_, i) => turnBox({ x0: local.x0 + i * w, y0: local.y0, x1: local.x0 + (i + 1) * w, y1: local.y1 }, x, y, rot));
}
