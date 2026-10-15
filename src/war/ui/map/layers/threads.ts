/**
 * Threads between pins (SPEC 8: white #F4F1E8 at 90%, dashed over sea lanes; red is war only) and
 * the pulses that run along joins: the white scoring pulse and the gold or red comet of `travel`,
 * which lights the joins it has crossed.
 */
import type { InkColour, RegionId } from '../contract';
import { REGION } from '../data';
import type { Gfx } from '../draw';
import { css, GOLD, GOLD_RIM, RING_WHITE, WAR_TEXT, type RGB } from '../palette';
import type { JoinKind } from '../scene';

export interface Curve {
  ax: number;
  ay: number;
  cx: number;
  cy: number;
  bx: number;
  by: number;
}

/**
 * The curve of a join from `from` to `to`: a straight line (the control point at its middle),
 * pushed sideways by `sag` points while a new thread snaps taut. The sag side is fixed per pair, so
 * a pulse runs along the same curve the thread is drawn on.
 */
export function joinCurve(from: RegionId, to: RegionId, sag = 0): Curve {
  const [p, q] = from < to ? [REGION[from], REGION[to]] : [REGION[to], REGION[from]];
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const a = REGION[from];
  const b = REGION[to];
  // A quadratic's apex sits halfway to its control point.
  return { ax: a.x, ay: a.y, cx: (p.x + q.x) / 2 + (-dy / len) * sag * 2, cy: (p.y + q.y) / 2 + (dx / len) * sag * 2, bx: b.x, by: b.y };
}

function pointOn(c: Curve, t: number): [number, number] {
  const u = 1 - t;
  return [u * u * c.ax + 2 * u * t * c.cx + t * t * c.bx, u * u * c.ay + 2 * u * t * c.cy + t * t * c.by];
}

/** The part of a curve between t0 and t1, as its own quadratic (de Casteljau). */
function subCurve(c: Curve, t0: number, t1: number): Curve {
  const [ax, ay] = pointOn(c, t0);
  const [bx, by] = pointOn(c, t1);
  // Control point: the tangent lines at t0 and t1 meet here.
  const d0x = 2 * ((1 - t0) * (c.cx - c.ax) + t0 * (c.bx - c.cx));
  const d0y = 2 * ((1 - t0) * (c.cy - c.ay) + t0 * (c.by - c.cy));
  const s = (t1 - t0) / 2;
  return { ax, ay, cx: ax + d0x * s, cy: ay + d0y * s, bx, by };
}

function strokeCurve(g: Gfx, c: Curve, dx = 0, dy = 0): void {
  const { ctx } = g;
  ctx.beginPath();
  ctx.moveTo(c.ax + dx, c.ay + dy);
  ctx.quadraticCurveTo(c.cx + dx, c.cy + dy, c.bx + dx, c.by + dy);
  ctx.stroke();
}

/** Thread width (SPEC 8 keeps the slice's 2 pt minimum for live joins). */
const THREAD_W = 2.4;

/**
 * One thread between two pins: a cast shadow, a dark keyline so it reads on gold, and the white
 * cord. Over a sea lane it is dashed, like the lane under it.
 */
export function drawThread(g: Gfx, c: Curve, kind: JoinKind, alpha: number): void {
  const { ctx } = g;
  ctx.save();
  ctx.lineCap = 'round';
  if (kind === 'lane') ctx.setLineDash([6, 4.5]);
  ctx.strokeStyle = `rgba(0,0,0,${0.45 * alpha})`;
  ctx.lineWidth = THREAD_W + 0.6;
  strokeCurve(g, c, 0.6, 1);
  ctx.strokeStyle = `rgba(8,12,18,${0.7 * alpha})`;
  ctx.lineWidth = THREAD_W + 1.6;
  strokeCurve(g, c);
  ctx.strokeStyle = css(RING_WHITE, 0.9 * alpha);
  ctx.lineWidth = THREAD_W;
  strokeCurve(g, c);
  ctx.restore();
}

/**
 * The part of a join from its start to `t`, lit as a thread of `rgb` (4 pt, over a dark keyline,
 * with a white core): the path ownership has travelled along.
 */
export function strokeJoin(g: Gfx, c: Curve, t: number, rgb: RGB, alpha: number): void {
  if (t <= 0 || alpha <= 0) return;
  const { ctx } = g;
  const seg = subCurve(c, 0, Math.min(1, t));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(8,12,18,${0.55 * alpha})`;
  ctx.lineWidth = 6;
  strokeCurve(g, seg);
  ctx.strokeStyle = css(rgb, alpha);
  ctx.lineWidth = 4;
  strokeCurve(g, seg);
  ctx.strokeStyle = `rgba(255,252,240,${0.85 * alpha})`;
  ctx.lineWidth = 1.2;
  strokeCurve(g, seg);
  ctx.restore();
}

/**
 * The path a win's gold travelled, lit so it never reads as a white pin thread: saturated gold over
 * a dark keyline, a soft gold glow, and a light dash running along it towards the region won.
 */
export function strokeTravel(g: Gfx, c: Curve, t: number, alpha: number, now: number): void {
  if (t <= 0 || alpha <= 0) return;
  const { ctx, k } = g;
  const seg = subCurve(c, 0, Math.min(1, t));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(8,12,18,${0.55 * alpha})`;
  ctx.lineWidth = 6.5;
  strokeCurve(g, seg);
  ctx.shadowColor = css(GOLD, 0.85 * alpha);
  ctx.shadowBlur = 7 * k;
  ctx.strokeStyle = css(GOLD, alpha);
  ctx.lineWidth = 4.2;
  strokeCurve(g, seg);
  ctx.shadowBlur = 0;
  ctx.setLineDash([5, 7]);
  ctx.lineDashOffset = -now / 40;
  ctx.strokeStyle = `rgba(255,248,225,${0.9 * alpha})`;
  ctx.lineWidth = 1.4;
  strokeCurve(g, seg);
  ctx.restore();
}

const COMET: Record<InkColour | 'white', RGB> = { white: [255, 250, 240], gold: GOLD_RIM, red: WAR_TEXT };

/**
 * A comet running along a join (`t` 0..1): 35% of the join long, with a glowing head. White for a
 * scoring pulse between pins, gold or red when ownership travels from region to region.
 */
export function drawComet(g: Gfx, c: Curve, t: number, colour: InkColour | 'white' = 'white', width = 3): void {
  if (t <= 0) return;
  const { ctx } = g;
  const rgb = COMET[colour];
  const seg = subCurve(c, Math.max(0, t - 0.35), Math.min(1, t));
  const grad = ctx.createLinearGradient(seg.ax, seg.ay, seg.bx, seg.by);
  grad.addColorStop(0, css(rgb, 0));
  grad.addColorStop(1, css(rgb, 0.95));
  ctx.save();
  ctx.strokeStyle = grad;
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  strokeCurve(g, seg);
  const [hx, hy] = pointOn(c, Math.min(1, t));
  // The head: a bigger glow on a travelling pulse of ownership than on a scoring pulse.
  const reach = width >= 4 ? 12 : 8;
  const glow = ctx.createRadialGradient(hx, hy, 1, hx, hy, reach);
  glow.addColorStop(0, css(rgb, 0.9));
  glow.addColorStop(1, css(rgb, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(hx, hy, reach, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFAF0';
  ctx.beginPath();
  ctx.arc(hx, hy, width * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
