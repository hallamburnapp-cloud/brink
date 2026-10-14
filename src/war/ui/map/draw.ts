/**
 * Canvas primitives shared by the map layers: glyphs the fonts lack (STYLE 4: draw them, never
 * type them), haloed text and shadows that scale with the backing store.
 */
import type { Glyph } from './data';

export type Ctx = CanvasRenderingContext2D;

/**
 * A context plus its backing scale (device pixels per map point). Canvas shadows ignore the
 * transform, so every blur and offset goes through `k`.
 */
export interface Gfx {
  ctx: Ctx;
  k: number;
}

export const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';
export const FONT_LABEL = '"Barlow Condensed", "Arial Narrow", sans-serif';

/** The faces the map draws with; loaded before the first full draw. */
export const MAP_FONTS = [
  `600 9px ${FONT_LABEL}`,
  `700 9px ${FONT_LABEL}`,
  `700 9px ${FONT_MONO}`,
  `800 9px ${FONT_MONO}`,
];

export function withShadow(g: Gfx, color: string, blurPt: number, dxPt: number, dyPt: number, draw: () => void): void {
  const { ctx, k } = g;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blurPt * k;
  ctx.shadowOffsetX = dxPt * k;
  ctx.shadowOffsetY = dyPt * k;
  draw();
  ctx.restore();
}

/**
 * A glow under a stroke without shadowBlur (which is slow per frame on phones): three wide,
 * faint passes of the same path. `stroke` must build the path and call ctx.stroke().
 */
export function glowStroke(ctx: Ctx, stroke: () => void, color: string | ((a: number) => string), width: number, blurPt: number): void {
  const col = typeof color === 'string' ? () => color : color;
  ctx.save();
  for (const [w, a] of GLOW_PASSES) {
    ctx.lineWidth = width + blurPt * w;
    ctx.strokeStyle = col(a);
    stroke();
  }
  ctx.restore();
}

const GLOW_PASSES: ReadonlyArray<readonly [number, number]> = [
  [2.6, 0.1],
  [1.6, 0.17],
  [0.75, 0.3],
];

export interface TextStyle {
  font: string;
  color: string;
  align?: CanvasTextAlign;
  /** Dark halo: colour and stroke width in points. */
  halo?: [string, number];
  /** Letter spacing in points. */
  tracking?: number;
  baseline?: CanvasTextBaseline;
}

export function text(ctx: Ctx, str: string, x: number, y: number, s: TextStyle): void {
  ctx.save();
  ctx.font = s.font;
  ctx.textAlign = s.align ?? 'center';
  ctx.textBaseline = s.baseline ?? 'middle';
  if (s.tracking && 'letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${s.tracking}px`;
  if (s.halo) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = s.halo[0];
    ctx.lineWidth = s.halo[1];
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = s.color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

export function textWidth(ctx: Ctx, str: string, font: string): number {
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

/** The bloc glyph (spec 1: triangle, circle, diamond, square, hexagon), s points across. */
export function glyphPath(ctx: Ctx, kind: Glyph, x: number, y: number, s: number): void {
  const h = s / 2;
  ctx.beginPath();
  switch (kind) {
    case 'triangle':
      ctx.moveTo(x, y - h * 1.1);
      ctx.lineTo(x + h * 1.05, y + h * 0.75);
      ctx.lineTo(x - h * 1.05, y + h * 0.75);
      ctx.closePath();
      break;
    case 'circle':
      ctx.arc(x, y, h * 0.92, 0, Math.PI * 2);
      break;
    case 'diamond':
      ctx.moveTo(x, y - h * 1.15);
      ctx.lineTo(x + h * 0.95, y);
      ctx.lineTo(x, y + h * 1.15);
      ctx.lineTo(x - h * 0.95, y);
      ctx.closePath();
      break;
    case 'square':
      ctx.rect(x - h * 0.82, y - h * 0.82, h * 1.64, h * 1.64);
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        const px = x + Math.cos(a) * h * 1.02;
        const py = y + Math.sin(a) * h * 1.02;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      break;
  }
}

export function starPath(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

/** A stroked anchor, s points tall (the font subsets have no anchor glyph). */
export function anchor(ctx: Ctx, x: number, y: number, s: number, color: string, lw: number): void {
  const k = s / 7;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw / k;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -2.6, 0.95, 0, Math.PI * 2);
  ctx.moveTo(0, -1.6);
  ctx.lineTo(0, 3.3);
  ctx.moveTo(-1.7, -0.6);
  ctx.lineTo(1.7, -0.6);
  ctx.moveTo(-2.9, 1.2);
  ctx.quadraticCurveTo(-2.4, 3.4, 0, 3.4);
  ctx.quadraticCurveTo(2.4, 3.4, 2.9, 1.2);
  ctx.stroke();
  ctx.restore();
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** cubic-bezier(.22,1,.36,1), the --ease-out token, approximated. */
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - clamp01(t), 3.2);
}

export function easeIn(t: number): number {
  const c = clamp01(t);
  return c * c * c;
}

export function easeInOut(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

/** The --ease-back token: overshoots a little, then settles. */
export function easeBack(t: number): number {
  const c = clamp01(t);
  const s = 1.70158 * 1.2;
  return 1 + (s + 1) * Math.pow(c - 1, 3) + s * Math.pow(c - 1, 2);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
