/**
 * The day's recolouring, drawn every frame over the baked land: a cooling region takes its new
 * colour as a ripple from its centre under a cool crest; a heating one as a run of red ink from the
 * neighbour it came from. And the slow pulse of every CRISIS region. No shadowBlur per frame.
 */
import type { Heat, RegionId } from '../contract';
import { REGION } from '../data';
import { easeInOut, type Gfx } from '../draw';
import { getGeometry } from '../geometry';
import { COOL, css, HOT, INK, mix, WHITE } from '../palette';
import { getPaths } from '../paths';
import { mulberry32 } from '../rand';
import { progress, type Transition } from '../fx';
import { paintPlate } from './land';

const farCache = new Map<string, number>();
const edgeCache = new Map<string, number>();

/** The farthest point of a plate from (x, y): where a front from there has covered it. */
export function farthestCorner(x: number, y: number, id: RegionId): number {
  const key = `${id}|${x.toFixed(1)},${y.toFixed(1)}`;
  let d = farCache.get(key);
  if (d === undefined) {
    const s = getGeometry().shapes[id];
    if (s.kind === 'disc') d = Math.hypot(s.x - x, s.y - y) + s.r;
    else {
      d = 0;
      for (const p of s.pts) d = Math.max(d, Math.hypot(p[0] - x, p[1] - y));
    }
    farCache.set(key, d);
  }
  return d;
}

/** The nearest point of a plate's edge to (x, y): where a front from there first touches it. */
export function nearestEdge(x: number, y: number, id: RegionId): number {
  const key = `${id}|${x.toFixed(1)},${y.toFixed(1)}`;
  let d = edgeCache.get(key);
  if (d === undefined) {
    const s = getGeometry().shapes[id];
    if (s.kind === 'disc') d = Math.max(0, Math.hypot(s.x - x, s.y - y) - s.r);
    else {
      d = Infinity;
      const pts = s.pts;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const vx = b[0] - a[0];
        const vy = b[1] - a[1];
        const l2 = vx * vx + vy * vy || 1;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / l2));
        d = Math.min(d, Math.hypot(a[0] + vx * t - x, a[1] + vy * t - y));
      }
    }
    edgeCache.set(key, d);
  }
  return d;
}

/** Where a change's front starts: a heat spreading in comes from its source; everything else from the region's own centre. */
function origin(t: Transition): { x: number; y: number; self: boolean } {
  const def = REGION[t.region];
  const src = t.to > t.from && t.source ? REGION[t.source] : null;
  if (src && src.id !== def.id) return { x: src.x, y: src.y, self: false };
  return { x: def.x, y: def.y, self: true };
}

/** A wobbling ink front (seeded per change so it holds its shape as it grows). */
function inkBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number): void {
  const rnd = mulberry32(Math.floor(seed) | 0);
  const n = 28;
  const amp = Array.from({ length: 4 }, () => rnd() * 0.07);
  const ph = Array.from({ length: 4 }, () => rnd() * Math.PI * 2);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    let k = 1;
    for (let o = 0; o < 4; o++) k += amp[o] * Math.sin(a * (o + 2) + ph[o]);
    const px = x + Math.cos(a) * r * k;
    const py = y + Math.sin(a) * r * k;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

/** Every running change: the new colour inside its front, and the front itself. */
export function paintTransitions(g: Gfx, transitions: readonly Transition[], now: number): void {
  const { ctx } = g;
  for (const t of transitions) {
    if (!t.begun) continue;
    const p = easeInOut(progress(t, now));
    if (p <= 0) continue;
    const def = REGION[t.region];
    if (!def) continue;
    const o = origin(t);
    const cooling = t.to < t.from;
    const far = farthestCorner(o.x, o.y, t.region);
    const near = o.self ? 0 : Math.max(0, nearestEdge(o.x, o.y, t.region) - 2);
    const radius = near + p * (far - near);
    const seed = t.start + def.index * 7;
    ctx.save();
    if (cooling) {
      ctx.beginPath();
      ctx.arc(o.x, o.y, radius, 0, Math.PI * 2);
    } else inkBlob(ctx, o.x, o.y, radius, seed);
    ctx.clip();
    paintPlate(g, t.region, t.to);
    ctx.restore();
    if (p >= 1) continue;
    // The front: a cool crest for a ripple, a dark wet edge for ink.
    ctx.save();
    ctx.clip(getPaths().region[t.region]);
    if (cooling) {
      ctx.beginPath();
      ctx.arc(o.x, o.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = css(mix(WHITE, COOL, 0.5), 0.7 * (1 - p * 0.6));
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = css(COOL, 0.95 * (1 - p * 0.4));
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      inkBlob(ctx, o.x, o.y, radius, seed);
      ctx.strokeStyle = css(mix(INK, HOT, 0.6), 0.8 * (1 - p * 0.6));
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
    ctx.restore();
  }
}

const PULSE_MS = 2600;

/** CRISIS breathes: a slow, slight brightening of the plate. */
export function paintCrisisPulse(g: Gfx, heats: Readonly<Record<RegionId, Heat>>, now: number, reduced: boolean): void {
  if (reduced) return;
  const { ctx } = g;
  for (const id in heats) {
    if (heats[id] !== 2) continue;
    const def = REGION[id];
    if (!def) continue;
    const b = 0.5 + 0.5 * Math.sin((now / PULSE_MS) * Math.PI * 2 + def.index * 0.9);
    ctx.save();
    ctx.fillStyle = `rgba(255,214,160,${0.16 * b})`;
    ctx.fill(getPaths().region[id]);
    ctx.restore();
  }
}
