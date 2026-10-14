/**
 * Threads, cables and ferry arcs (STYLE 5.8). Every join is a quadratic curve: straight for land
 * borders and sea lanes, gently bowed along a laid cable, and arced for a Ferry Master join.
 */
import type { RegionId } from '../contract';
import { REGION } from '../data';
import { FONT_MONO, glowStroke, text, type Gfx } from '../draw';
import { BRASS, css, HEAT, LINEN, mix, PEWTER, THREAD, THREAD_HOT_GLOW } from '../palette';
import type { JoinKind } from '../scene';

export interface Curve {
  ax: number;
  ay: number;
  cx: number;
  cy: number;
  bx: number;
  by: number;
}

const BOW: Record<JoinKind, number> = { land: 0, lane: 0, cable: 0.14, ferry: 0.1 };

/**
 * The curve of a join, oriented from `from` to `to`. The bow side is fixed per pair (it does not
 * depend on direction), so a pulse runs along the same curve the thread is drawn on. `sag` adds a
 * sideways offset in points (a join snapping taut).
 */
export function joinCurve(from: RegionId, to: RegionId, kind: JoinKind, sag = 0): Curve {
  const [p, q] = from < to ? [REGION[from], REGION[to]] : [REGION[to], REGION[from]];
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular, pointing away from the map's centre so arcs bow out over the sea.
  let nx = -dy / len;
  let ny = dx / len;
  const mx = (p.x + q.x) / 2;
  const my = (p.y + q.y) / 2;
  if (nx * (mx - 195) + ny * (my - 262) < 0) {
    nx = -nx;
    ny = -ny;
  }
  const bow = BOW[kind] * len + sag;
  // A quadratic's apex sits halfway to its control point.
  const c = { x: mx + nx * bow * 2, y: my + ny * bow * 2 };
  const a = REGION[from];
  const b = REGION[to];
  return { ax: a.x, ay: a.y, cx: c.x, cy: c.y, bx: b.x, by: b.y };
}

export function pointOn(c: Curve, t: number): [number, number] {
  const u = 1 - t;
  return [u * u * c.ax + 2 * u * t * c.cx + t * t * c.bx, u * u * c.ay + 2 * u * t * c.cy + t * t * c.by];
}

/** The part of a curve between t0 and t1, as its own quadratic (de Casteljau). */
export function subCurve(c: Curve, t0: number, t1: number): Curve {
  const [ax, ay] = pointOn(c, t0);
  const [bx, by] = pointOn(c, t1);
  // Control point: the tangent lines at t0 and t1 meet here.
  const d0x = 2 * ((1 - t0) * (c.cx - c.ax) + t0 * (c.bx - c.cx));
  const d0y = 2 * ((1 - t0) * (c.cy - c.ay) + t0 * (c.by - c.cy));
  const s = (t1 - t0) / 2;
  return { ax, ay, cx: ax + d0x * s, cy: ay + d0y * s, bx, by };
}

export function strokeCurve(g: Gfx, c: Curve, dx = 0, dy = 0): void {
  const { ctx } = g;
  ctx.beginPath();
  ctx.moveTo(c.ax + dx, c.ay + dy);
  ctx.quadraticCurveTo(c.cx + dx, c.cy + dy, c.bx + dx, c.by + dy);
  ctx.stroke();
}

export interface ThreadStyle {
  width: number;
  alpha: number;
  traffic: number;
  /** HEAT 0..1: a red-hot cord with a white filament. */
  hot?: number;
  /** A loose end: thin pewter. */
  grey?: boolean;
  /** Show the traffic number at 10 or more. */
  showCount?: boolean;
}

/** One thread: cast shadow, glowing red body, twist highlight or HEAT core and filament. */
export function drawThread(g: Gfx, c: Curve, s: ThreadStyle): void {
  const { ctx } = g;
  const a = s.alpha;
  const w = s.width;
  const hot = s.hot ?? 0;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(0,0,0,${0.5 * a})`;
  ctx.lineWidth = w + 0.6;
  strokeCurve(g, c, 1.4 / 3, 2.2 / 3);
  if (s.grey) {
    ctx.strokeStyle = css(PEWTER.base, 0.7 * a);
    ctx.lineWidth = w;
    strokeCurve(g, c);
    ctx.restore();
    return;
  }
  const glowA = Math.max(s.traffic >= 6 ? 0.7 : 0.3 * a, hot);
  const glowCol = hot > 0 ? mix(THREAD_HOT_GLOW, THREAD, hot) : THREAD;
  glowStroke(ctx, () => strokeCurve(g, c), (k) => css(glowCol, glowA * k * 1.6), w, (5 + 5 * hot) / 3);
  ctx.strokeStyle = css(THREAD, a);
  ctx.lineWidth = w;
  strokeCurve(g, c);
  if (hot > 0) {
    ctx.strokeStyle = `rgba(255,170,120,${0.9 * hot})`;
    ctx.lineWidth = w * 0.62;
    strokeCurve(g, c);
    ctx.strokeStyle = css(HEAT, 0.95 * hot);
    ctx.lineWidth = Math.max(0.6, w * 0.26);
    strokeCurve(g, c);
  }
  if (hot < 1) {
    ctx.strokeStyle = `rgba(255,190,170,${0.4 * a * (1 - hot)})`;
    ctx.lineWidth = Math.max(0.5, w * 0.28);
    strokeCurve(g, c, -0.3, -w * 0.22);
  }
  if (s.traffic >= 10 && s.showCount !== false) {
    const [mx, my] = pointOn(c, 0.5);
    text(ctx, String(s.traffic), mx, my - 7, {
      font: `800 8px ${FONT_MONO}`,
      color: css(LINEN, a),
      halo: ['rgba(5,8,12,0.9)', 2.5],
    });
  }
  ctx.restore();
}

/**
 * A worn thread: traffic from earlier sweeps, between regions not pinned now. Dried ink, thin and
 * flat (no glow), so it never reads as a live join; it still wears thicker with traffic, and from
 * 2 its traffic is written at its middle (what a join along it will add).
 */
export function drawWornThread(g: Gfx, c: Curve, traffic: number, width: number, alpha: number): void {
  const { ctx } = g;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = css(mix(THREAD, PEWTER.lo, 0.45), 0.55 * alpha);
  ctx.lineWidth = Math.max(0.9, 0.55 * width);
  strokeCurve(g, c);
  if (traffic >= 2) {
    const [mx, my] = pointOn(c, 0.5);
    text(ctx, String(traffic), mx, my, {
      font: `800 7.5px ${FONT_MONO}`,
      color: css(mix(LINEN, THREAD, 0.25), 0.85 * alpha),
      halo: ['rgba(5,8,12,0.92)', 2.6],
    });
  }
  ctx.restore();
}

/** A laid cable (Order LAY CABLE): a glowing brass line with a terminal ring at each end. */
export function drawCable(g: Gfx, c: Curve, alpha: number): void {
  const { ctx } = g;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 3.4;
  strokeCurve(g, c, 0.6, 1);
  glowStroke(ctx, () => strokeCurve(g, c), (k) => `rgba(227,192,120,${0.9 * k})`, 3, 2.4);
  ctx.strokeStyle = css(BRASS.deep);
  ctx.lineWidth = 3;
  strokeCurve(g, c);
  ctx.strokeStyle = css(BRASS.b);
  ctx.lineWidth = 1.9;
  strokeCurve(g, c);
  ctx.strokeStyle = 'rgba(247,224,163,0.85)';
  ctx.lineWidth = 0.6;
  strokeCurve(g, c, -0.25, -0.45);
  for (const [x, y] of [
    [c.ax, c.ay],
    [c.bx, c.by],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 3.6, 0, Math.PI * 2);
    ctx.strokeStyle = css(BRASS.deep);
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = css(BRASS.a);
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  ctx.restore();
}

/** A pulse (spec 9, +60 ms): a 3 pt heat comet, 35% of the thread long, with a glowing head. */
export function drawPulse(g: Gfx, c: Curve, t: number): void {
  const { ctx } = g;
  const tail = Math.max(0, t - 0.35);
  if (t <= 0) return;
  const seg = subCurve(c, tail, t);
  const grad = ctx.createLinearGradient(seg.ax, seg.ay, seg.bx, seg.by);
  grad.addColorStop(0, 'rgba(255,246,224,0)');
  grad.addColorStop(1, 'rgba(255,246,224,0.95)');
  ctx.save();
  ctx.strokeStyle = grad;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  strokeCurve(g, seg);
  const [hx, hy] = pointOn(c, t);
  const glow = ctx.createRadialGradient(hx, hy, 1, hx, hy, 7);
  glow.addColorStop(0, 'rgba(255,246,224,0.85)');
  glow.addColorStop(1, 'rgba(255,246,224,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(hx, hy, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFAF0';
  ctx.beginPath();
  ctx.arc(hx, hy, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
