/** Canvas primitives shared by the map layers: fonts, haloed text, rounded rects, easing. */

export type Ctx = CanvasRenderingContext2D;

/** A context plus its backing scale (device pixels per map point). */
export interface Gfx {
  ctx: Ctx;
  k: number;
}

export const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';
export const FONT_LABEL = '"Barlow Condensed", "Arial Narrow", sans-serif';

/** The faces the map draws with; loaded before the first full draw. */
export const MAP_FONTS = [`600 11px ${FONT_LABEL}`, `700 11px ${FONT_LABEL}`];

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

export function textWidth(ctx: Ctx, str: string, font: string, tracking = 0): number {
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(str).width + tracking * Math.max(0, str.length - 1);
  ctx.restore();
  return w;
}

/** A rounded rectangle path (no ctx.roundRect: older Safari lacks it). */
export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** cubic-bezier(.22,1,.36,1) approximated: fast out, soft landing. */
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - clamp01(t), 3.2);
}

export function easeInOut(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
