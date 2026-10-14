/**
 * Live overlays, drawn every frame around the markers: Order targeting and highlights, lights out,
 * ink spreads, flashes and blinks, standby pulses, live threads with HEAT and pulses, the
 * flashpoint ring, the scan line, stamp pulses, the shockwave, pops and the map flash.
 * Nothing here uses shadowBlur per frame: glows are layered strokes or cached sprites.
 */
import type { RegionId } from '../contract';
import { MAP_H as H, MAP_W as W, REGION } from '../data';
import { clamp01, easeBack, easeInOut, easeOut, FONT_MONO, glowStroke, lerp, text, withShadow, type Gfx } from '../draw';
import { progress, type FxState } from '../fx';
import { getGeometry } from '../geometry';
import { ALARM, BLOC, BRASS, css, INK, LINEN, mix, plateCore, plateFill, STANDBY, WHITE, type RGB } from '../palette';
import { getPaths } from '../paths';
import { mulberry32 } from '../rand';
import type { Scene } from '../scene';
import { paintPlate } from './land';
import { blurredShape, makeLayer, type Layer } from './static';
import { drawPulse, drawThread, joinCurve } from './threads';

/** The cooled ring's radius (STYLE 5.9): a record of where the night was won. */
export const RING_COOLED = 13;
/** Reticle ticks run from r + 3 to r + 8. */
const TICK_IN = 3;
const TICK_OUT = 8;

const ringRadii = new Map<RegionId, number>();

/**
 * The flashpoint ring's radius for a region: it marks that one region, so it hugs its pin. Islands
 * ring their 24 pt disc; on the mainland it reaches half way to the nearest other pin (22 to 32 pt),
 * and it always stays inside the plate, clear of the bearing strip.
 */
export function ringRadius(id: RegionId): number {
  let r = ringRadii.get(id);
  if (r === undefined) {
    const def = REGION[id];
    let nearest = Infinity;
    for (const o of Object.values(REGION)) if (o.id !== id) nearest = Math.min(nearest, Math.hypot(o.x - def.x, o.y - def.y));
    r = def.island ? 27 : Math.min(32, Math.max(22, nearest / 2));
    r = Math.min(r, def.x - 4, W - def.x - 4, def.y - 8, H - def.y - 4);
    ringRadii.set(id, r);
  }
  return r;
}

function regionFill(g: Gfx, id: RegionId, color: string): void {
  g.ctx.fillStyle = color;
  g.ctx.fill(getPaths().region[id]);
}

/** Stroke a region's outline inside the region only (so neighbours are untouched). */
function innerGlow(g: Gfx, id: RegionId, color: (a: number) => string, width: number, blur: number): void {
  const { ctx } = g;
  const path = getPaths().region[id];
  ctx.save();
  ctx.clip(path);
  ctx.lineJoin = 'round';
  glowStroke(ctx, () => ctx.stroke(path), (k) => color(k * 1.4), width, blur);
  ctx.strokeStyle = color(1);
  ctx.lineWidth = width;
  ctx.stroke(path);
  ctx.restore();
}

// ---------------------------------------------------------------- sprites

const spriteCache = new Map<string, Layer & { x: number; y: number; w: number; h: number }>();

/** The flash bloom around a region (a 14 pt blur of its shape), baked once per region. */
function bloomSprite(id: RegionId, k: number) {
  const key = `bloom:${id}@${k}`;
  let s = spriteCache.get(key);
  if (!s) {
    const b = getGeometry().bounds[id];
    const m = 30;
    const x = Math.floor(b.x0 - m);
    const y = Math.floor(b.y0 - m);
    const w = Math.ceil(b.x1 - b.x0 + 2 * m);
    const h = Math.ceil(b.y1 - b.y0 + 2 * m);
    // A blur needs little resolution: 1.5 px per point keeps 30 cached blooms small.
    const l = makeLayer(Math.min(k, 1.5), w, h);
    l.ctx.translate(-x, -y);
    blurredShape(l, 'rgba(255,246,224,0.55)', 14, getPaths().region[id]);
    s = Object.assign(l, { x, y, w, h });
    spriteCache.set(key, s);
  }
  return s;
}

/** The scan line with its glow, as a tall sprite (2 pt white, 40% glow). */
function scanSprite(k: number) {
  const key = `scan@${k}`;
  let s = spriteCache.get(key);
  if (!s) {
    const w = 16;
    const l = makeLayer(k, w, H);
    withShadow(l, 'rgba(255,255,255,0.4)', 10 / 3, 0, 0, () => {
      l.ctx.fillStyle = 'rgba(255,255,255,0.95)';
      l.ctx.fillRect(w / 2 - 1, 10, 2, H - 10);
    });
    s = Object.assign(l, { x: -w / 2, y: 0, w, h: H });
    spriteCache.set(key, s);
  }
  return s;
}

// ---------------------------------------------------------------- under the threads

/**
 * An armed Order, a long-press highlight or a spotlight: the rest of the table recedes a little,
 * and each valid target breathes (a soft light on its plate and a turning ring round its pin, plus
 * a linen edge when there are only a few) rather than every border lighting up. Chosen targets
 * take brass.
 */
export function paintTargets(g: Gfx, s: Scene, fadeIn: number): void {
  const valid = s.armed ? new Set(s.armed.valid) : s.highlight;
  if (!valid) return;
  const { ctx } = g;
  const chosen = new Set(s.armed?.chosen ?? []);
  const breath = s.reduced ? 0.6 : 0.5 + 0.5 * Math.sin((s.now / 1200) * Math.PI * 2);
  for (const r of s.list) {
    if (valid.has(r.id) || chosen.has(r.id) || r.status === 'retired') continue;
    regionFill(g, r.id, css(INK, 0.15 * fadeIn));
  }
  // An edge marks a few targets well; on many it would turn the borders into a wireframe.
  const edges = valid.size <= 8;
  for (const id of valid) {
    if (chosen.has(id)) continue;
    regionFill(g, id, css(LINEN, (0.04 + 0.05 * breath) * fadeIn));
    if (edges) innerGlow(g, id, (a) => css(LINEN, Math.min(0.85, a * (0.5 + 0.35 * breath)) * fadeIn), 2, 3);
    // A few targets get a slowly turning dashed ring round the pin, linen over a dark rim so it
    // reads on a bright lit plate as well as a dark one; many targets get a quiet thin ring.
    const def = REGION[id];
    const ring = (r: number) => {
      ctx.beginPath();
      ctx.arc(def.x, def.y, r, 0, Math.PI * 2);
      ctx.stroke();
    };
    ctx.save();
    if (edges) {
      ctx.strokeStyle = css(INK, 0.45 * fadeIn);
      ctx.lineWidth = 2.8;
      ring(17 + 1.5 * breath);
      ctx.setLineDash([4, 3]);
      ctx.lineDashOffset = s.reduced ? 0 : -s.now / 60;
      ctx.strokeStyle = css(LINEN, (0.6 + 0.35 * breath) * fadeIn);
      ctx.lineWidth = 1.3;
      ring(17 + 1.5 * breath);
    } else {
      ctx.strokeStyle = css(LINEN, (0.35 + 0.25 * breath) * fadeIn);
      ctx.lineWidth = 1;
      ring(11 + breath);
    }
    ctx.restore();
  }
  for (const id of chosen) {
    regionFill(g, id, css(BRASS.hi, 0.12 * fadeIn));
    innerGlow(g, id, (a) => css(BRASS.a, Math.min(1, a * 0.95 * fadeIn)), 3, 4);
  }
}

/** A deal: each region warms up from dark as its lamp comes on, with a glow off its pin. */
export function paintLightUps(g: Gfx, s: Scene): void {
  const { ctx } = g;
  for (const r of s.list) {
    if (r.warm >= 1 || r.status !== 'lit') continue;
    regionFill(g, r.id, css(INK, 0.7 * (1 - r.warm)));
    const glow = ctx.createRadialGradient(r.def.x, r.def.y, 2, r.def.x, r.def.y, 26);
    glow.addColorStop(0, `rgba(255,240,210,${(0.55 * Math.sin(Math.PI * r.warm)).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(r.def.x, r.def.y, 26, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** SURROUND: the encircled region glows from its rim inward. */
export function paintRinged(g: Gfx, s: Scene): void {
  if (!s.ringed) return;
  const pulse = s.reduced ? 0.6 : 0.6 + 0.4 * Math.sin((s.now / 1600) * Math.PI * 2);
  innerGlow(g, s.ringed, (a) => `rgba(255,240,210,${Math.min(1, a * (0.55 + 0.3 * pulse))})`, 3, 6);
}

/** Miss: each region goes out at its own moment with a short flicker; the sea darkens with them. */
export function paintLightsOut(g: Gfx, s: Scene, fx: FxState): void {
  const lo = fx.lightsOut;
  if (!lo) return;
  const elapsed = s.now - lo.start;
  let out = 0;
  for (const r of s.list) {
    const since = elapsed - (lo.at.get(r.id) ?? 0) * lo.dur;
    if (since < 0) continue;
    let level: number;
    if (s.reduced) level = clamp01(elapsed / lo.dur);
    // A failing lamp: dark, a stutter back on, then out for good (150 ms in all).
    else level = since < 40 ? 0.85 : since < 70 ? 0.25 : since < 110 ? 0.9 : 1;
    regionFill(g, r.id, css(INK, 0.82 * level));
    out++;
  }
  if (out) {
    g.ctx.fillStyle = css(INK, 0.35 * clamp01((elapsed / lo.dur) * 1.1));
    g.ctx.fillRect(0, 0, W, H);
  }
}

/** How lit a region's markers still are during lights out (1 = untouched). */
export function lightsLeft(fx: FxState, id: RegionId, now: number): number {
  const lo = fx.lightsOut;
  if (!lo) return 1;
  const since = now - lo.start - (lo.at.get(id) ?? 0) * lo.dur;
  return since <= 0 ? 1 : 1 - 0.8 * clamp01(since / 150);
}

/** DEFECT: the source's colour spreads like ink from its pin across each target plate. */
export function paintInk(g: Gfx, s: Scene, fx: FxState): void {
  const { ctx } = g;
  for (const ink of fx.inks) {
    const p = easeInOut(progress(ink, s.now));
    const src = REGION[ink.source];
    for (const id of ink.targets) {
      const r = s.regions[id];
      const radius = p * farthestCorner(src.x, src.y, id);
      if (radius <= 0) continue;
      ctx.save();
      ctx.beginPath();
      inkBlob(ctx, src.x, src.y, radius, ink.start);
      ctx.clip();
      paintPlate(g, id, { colour: ink.colour, fill: r.fill, glow: r.glow, dim: r.dim, blackout: false });
      ctx.restore();
      // A darker wet edge on the ink front.
      ctx.save();
      ctx.clip(getPaths().region[id]);
      ctx.beginPath();
      inkBlob(ctx, src.x, src.y, radius, ink.start);
      ctx.strokeStyle = css(mix(INK, BLOC[ink.colour], 0.45), 0.55 * (1 - p * 0.6));
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    }
  }
}

function farthestCorner(x: number, y: number, id: RegionId): number {
  const b = getGeometry().bounds[id];
  const corners = [
    [b.x0, b.y0],
    [b.x1, b.y0],
    [b.x0, b.y1],
    [b.x1, b.y1],
  ];
  return Math.max(...corners.map(([px, py]) => Math.hypot(px - x, py - y))) + 8;
}

/** A wobbling ink front (seeded per spread so it holds its shape as it grows). */
function inkBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number): void {
  const rnd = mulberry32(Math.floor(seed) | 0);
  const n = 28;
  const amp = Array.from({ length: 4 }, () => rnd() * 0.08);
  const ph = Array.from({ length: 4 }, () => rnd() * Math.PI * 2);
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

/** Spec 9: a region flashes white for 80 ms, then holds its colour (the land layer has it scored). */
export function paintFlashes(g: Gfx, s: Scene, fx: FxState): void {
  const { ctx } = g;
  for (const f of fx.flashes) {
    const p = progress(f, s.now);
    // The white phase is the first 40% (80 ms at 1x); the bloom lingers for the rest.
    const white = 1 - clamp01(p / 0.4);
    const bloom = 1 - p;
    const r = s.regions[f.id];
    const def = r.def;
    const path = getPaths().region[f.id];
    const sprite = bloomSprite(f.id, g.k);
    ctx.save();
    ctx.globalAlpha = bloom;
    ctx.drawImage(sprite.canvas, sprite.x, sprite.y, sprite.w, sprite.h);
    ctx.restore();
    ctx.save();
    ctx.clip(path);
    ctx.globalAlpha = Math.max(white, 0.6 * bloom);
    ctx.fillStyle = css(plateFill(r.colour, 'flash'));
    ctx.fill(path);
    const { core, alpha } = plateCore(r.colour, 'flash');
    const grad = ctx.createRadialGradient(def.x, def.y - 2, 1, def.x, def.y, def.island ? 30 : 58);
    grad.addColorStop(0, css(core, alpha));
    grad.addColorStop(0.45, css(core, alpha * 0.28));
    grad.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = grad;
    ctx.fill(path);
    ctx.globalAlpha = 1;
    ctx.fillStyle = css(WHITE, 0.55 * white);
    ctx.fill(path);
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * bloom})`;
    ctx.lineWidth = 3;
    ctx.stroke(path);
    ctx.restore();
  }
}

/** Clear: regions blink for 80 ms as the shockwave crosses their pin. */
export function paintBlinks(g: Gfx, s: Scene, fx: FxState, speed: number): void {
  const sh = fx.shock;
  if (!sh) return;
  const src = REGION[sh.from];
  const blink = 80 / speed;
  for (const r of s.list) {
    // When the front (r = 640 x (1 - (1 - p)^1.6)) reaches this pin.
    const d = Math.hypot(r.def.x - src.x, r.def.y - src.y) / 640;
    const at = sh.start + (1 - Math.pow(1 - d, 1 / 1.6)) * sh.dur;
    const p = (s.now - at) / blink;
    if (p < 0 || p > 1) continue;
    // The plate lights in its own colour as the front passes (glass, not paint).
    regionFill(g, r.id, css(mix(WHITE, BLOC[r.colour], 0.35), 0.5 * (1 - p)));
  }
}

/** Chief of Staff standby: a blue pulse on the unpinned lit region (spec 9, 200 ms). */
export function paintStandby(g: Gfx, s: Scene, fx: FxState): void {
  const { ctx } = g;
  for (const e of fx.standby) {
    const p = progress(e, s.now);
    const def = REGION[e.id];
    regionFill(g, e.id, css(STANDBY, 0.32 * (1 - p)));
    if (s.reduced) continue;
    const ring = () => {
      ctx.beginPath();
      ctx.arc(def.x, def.y, 9 + 22 * easeOut(p), 0, Math.PI * 2);
      ctx.stroke();
    };
    glowStroke(ctx, ring, (a) => css(STANDBY, a * 1.6 * (1 - p)), 2, 3);
    ctx.strokeStyle = css(STANDBY, 0.95 * (1 - p));
    ctx.lineWidth = 2;
    ring();
  }
}

// ---------------------------------------------------------------- threads and ring

/** Joins between the current pins: taut red thread (snapping into place when a join forms). */
export function paintLiveThreads(g: Gfx, s: Scene): void {
  for (const t of s.live) {
    // Snap taut: a slack thread overshoots and settles (a damped wobble over 420 ms).
    const sag = t.snap >= 1 ? 0 : 7 * Math.exp(-5 * t.snap) * Math.cos(t.snap * 15);
    const a = Math.min(s.regions[t.a].dimNow, s.regions[t.b].dimNow);
    drawThread(g, joinCurve(t.a, t.b, t.kind, sag), {
      width: t.width,
      alpha: t.grey ? Math.max(0.5, a) : 1,
      traffic: t.traffic,
      hot: t.hot,
      grey: t.grey,
    });
  }
}

export function paintPulses(g: Gfx, s: Scene, fx: FxState): void {
  for (const p of fx.pulses) {
    const match = (t: { a: RegionId; b: RegionId }) => (t.a === p.from && t.b === p.to) || (t.a === p.to && t.b === p.from);
    const kind = s.live.find(match)?.kind ?? s.oldThreads.find(match)?.kind ?? 'land';
    drawPulse(g, joinCurve(p.from, p.to, kind), easeOut(progress(p, s.now)));
  }
}

/**
 * The flashpoint ring (STYLE 5.9): 2 pt alarm red with a glow and four reticle ticks, hugging its
 * region (ringRadius). Its arc is the crisis's progress bar: it starts whole at the top and empties
 * clockwise as the total climbs (the spent part stays as a faint track), so it never grows over a
 * neighbour. Once the flashpoint itself is swept it dims to 40%. On a clear it closes in to the
 * cooled ring and turns blue; the cooled ring stays at 13 pt.
 */
export function paintFlashpoint(g: Gfx, s: Scene, fx: FxState): void {
  const id = s.flashpoint;
  if (!id) return;
  const { ctx } = g;
  // On a miss the ring goes out with the rest of the lights.
  const out = fx.lightsOut ? clamp01((s.now - fx.lightsOut.start) / fx.lightsOut.dur) : 0;
  if (out >= 1) return;
  const def = REGION[id];
  const r0 = ringRadius(id);
  ctx.save();
  ctx.globalAlpha = 1 - out;
  if (s.collapse !== null || s.cooled) {
    const p = s.collapse === null ? 1 : easeInOut(s.collapse);
    ringShape(g, def.x, def.y, lerp(r0, RING_COOLED, p), mix(STANDBY, ALARM, p), 1, p >= 1 ? 0.5 : 1 - 0.5 * p, 1 - p);
    ctx.restore();
    return;
  }
  const breath = s.reduced ? 0.5 : 0.5 + 0.5 * Math.sin((s.now / 1800) * Math.PI * 2);
  if (s.flashpointSpent) ctx.globalAlpha *= 0.4;
  // A faint bloom inside the ring only: neighbours are never tinted.
  const grad = ctx.createRadialGradient(def.x, def.y, r0 * 0.45, def.x, def.y, r0);
  grad.addColorStop(0, css(ALARM, 0));
  grad.addColorStop(1, css(ALARM, (0.06 + 0.04 * breath) * s.ring));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(def.x, def.y, r0, 0, Math.PI * 2);
  ctx.fill();
  ringShape(g, def.x, def.y, r0, ALARM, s.ring, breath, 1);
  ctx.restore();
}

/**
 * A ring of radius `rad` whose arc covers `share` of the circle from the top, clockwise, over a
 * faint full track; `glow` 0..1 breathes the glow; `ticks` 0..1 fades the reticle ticks.
 */
function ringShape(g: Gfx, x: number, y: number, rad: number, col: RGB, share: number, glow: number, ticks: number): void {
  const { ctx } = g;
  const top = -Math.PI / 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = css(col, 0.22);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.stroke();
  if (share > 0.002) {
    const arc = () => {
      ctx.beginPath();
      ctx.arc(x, y, rad, top, top + Math.PI * 2 * Math.min(1, share));
      ctx.stroke();
    };
    glowStroke(ctx, arc, (a) => css(col, Math.min(1, a * (1.3 + 0.6 * glow))), 2, (6 + 4 * glow) / 3);
    ctx.strokeStyle = css(col);
    ctx.lineWidth = 2;
    arc();
  }
  if (ticks <= 0) return;
  ctx.strokeStyle = css(col, 0.95 * ticks);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const ox = x + Math.cos(a) * (rad + TICK_OUT);
    const oy = y + Math.sin(a) * (rad + TICK_OUT);
    // A tick that would leave the plate (or run under the bearing strip) is left out.
    if (ox < 2 || ox > W - 2 || oy < 10 || oy > H - 2) continue;
    ctx.moveTo(x + Math.cos(a) * (rad + TICK_IN), y + Math.sin(a) * (rad + TICK_IN));
    ctx.lineTo(ox, oy);
  }
  ctx.stroke();
}

/** Where the scan line is right now (it snaps back on AGAIN). */
export function scanXAt(fx: FxState, now: number): number | null {
  if (fx.scanX === null) return null;
  if (fx.scanSnap) return lerp(fx.scanSnap.from, fx.scanSnap.to, easeInOut(progress(fx.scanSnap, now)));
  return fx.scanX;
}

/** Scan line (spec 9): 2 pt white with a 40% glow, and a faint wake to the west. */
export function paintScan(g: Gfx, s: Scene, fx: FxState): void {
  const x = scanXAt(fx, s.now);
  if (x === null) return;
  const { ctx } = g;
  if (!s.reduced) {
    // The wake fades in after each jump, as though the line had just swept here.
    const wake = clamp01((s.now - fx.scanJumpAt) / 120);
    const grad = ctx.createLinearGradient(x - 44, 0, x, 0);
    grad.addColorStop(0, 'rgba(255,246,224,0)');
    grad.addColorStop(1, `rgba(255,246,224,${0.07 * (0.5 + 0.5 * wake)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(x - 44, 10, 44, H - 10);
  }
  const sprite = scanSprite(g.k);
  ctx.drawImage(sprite.canvas, x + sprite.x, 0, sprite.w, sprite.h);
}

/** The scan cursor on the bearing strip (drawn over the glass). */
export function paintScanCursor(g: Gfx, s: Scene, fx: FxState): void {
  const x = scanXAt(fx, s.now);
  if (x === null) return;
  const { ctx } = g;
  withShadow(g, 'rgba(255,255,255,0.8)', 2, 0, 0, () => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(x - 4, 2);
    ctx.lineTo(x + 4, 2);
    ctx.lineTo(x, 9.5);
    ctx.closePath();
    ctx.fill();
  });
}

/** Stamp pulse (spec 9, +100 ms): the stamp's mark flares out from the pin. */
export function paintStampPulses(g: Gfx, s: Scene, fx: FxState): void {
  const { ctx } = g;
  for (const e of fx.stampPulses) {
    const p = progress(e, s.now);
    const r = s.regions[e.id];
    const fade = 1 - p;
    if (s.reduced) continue; // the pop alone carries it
    if (r.stamp === 'FORTIFY') {
      innerGlow(g, e.id, (a) => css(LINEN, Math.min(1, a * 0.85 * fade)), 4, 5);
    } else {
      const col = r.stamp === 'RELAY' ? mix(WHITE, BLOC[r.colour], 0.5) : LINEN;
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = css(col, 0.9 * fade);
      for (const base of r.stamp === 'RELAY' ? [11.5, 14.2] : [10]) {
        ctx.beginPath();
        ctx.arc(r.def.x, r.def.y, base + 12 * easeOut(p), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

/** A brass pin has landed: a brass ring spreads from the tack (left of the pin) and fades. */
export function paintRipples(g: Gfx, fx: FxState, now: number): void {
  const { ctx } = g;
  for (const e of fx.ripples) {
    if (now < e.start) continue;
    const p = progress(e, now);
    const r = REGION[e.id];
    ctx.save();
    ctx.strokeStyle = css(BRASS.hi, 0.9 * (1 - p));
    ctx.lineWidth = 1.6 * (1 - p) + 0.4;
    ctx.beginPath();
    ctx.arc(r.x - 14.5, r.y + 2, 5 + 22 * easeOut(p), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** Clear: a white ring from the flashpoint, 0 to 640 pt (2 pt stroke, fading). */
export function paintShockwave(g: Gfx, s: Scene, fx: FxState): void {
  const sh = fx.shock;
  if (!sh) return;
  const p = progress(sh, s.now);
  if (p >= 1) return;
  const { ctx } = g;
  const def = REGION[sh.from];
  // A fast front that slows as it spreads (gentler than --ease-out, so it stays on the table).
  const r = 640 * (1 - Math.pow(1 - p, 1.6));
  const fade = 1 - p;
  ctx.save();
  // A soft wash trailing the front, then the 2 pt ring with its glow.
  ctx.strokeStyle = `rgba(255,255,255,${0.1 * fade})`;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(def.x, def.y, Math.max(0, r - 9), 0, Math.PI * 2);
  ctx.stroke();
  const ring = () => {
    ctx.beginPath();
    ctx.arc(def.x, def.y, r, 0, Math.PI * 2);
    ctx.stroke();
  };
  glowStroke(ctx, ring, (a) => `rgba(255,255,255,${a * 1.4 * fade})`, 2, 4);
  ctx.strokeStyle = `rgba(255,255,255,${0.95 * fade})`;
  ctx.lineWidth = 2;
  ring();
  ctx.restore();
}

/** LAY CABLE drag: a provisional brass line from the pin to the finger. */
export function paintCableDrag(g: Gfx, s: Scene): void {
  const d = s.cableDrag;
  if (!d) return;
  const { ctx } = g;
  const a = REGION[d.from];
  if (!a) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([6, 4]);
  const line = () => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
  };
  glowStroke(ctx, line, (k) => css(BRASS.a, k * 1.2), 2, 3);
  ctx.strokeStyle = css(BRASS.a, 0.95);
  ctx.lineWidth = 2;
  line();
  ctx.setLineDash([]);
  ctx.fillStyle = css(BRASS.hi);
  ctx.beginPath();
  ctx.arc(d.x, d.y, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- over the markers

const POP_STYLE = {
  influence: { color: '#D4F6FF', glow: 'rgba(95,212,244,', halo: 'rgba(7,36,49,0.95)', size: 11, tracking: 0 },
  momentum: { color: '#FFE7BD', glow: 'rgba(255,181,71,', halo: 'rgba(36,22,6,0.95)', size: 11, tracking: 0 },
  again: { color: '#FFB547', glow: 'rgba(255,181,71,', halo: 'rgba(12,8,2,0.95)', size: 10, tracking: 1 },
} as const;

/** Pops: thread traffic, stamp effects and AGAIN tags. They stamp in, rise a little and fade. */
export function paintPops(g: Gfx, s: Scene, fx: FxState): void {
  const { ctx } = g;
  for (const pop of fx.pops) {
    if (s.now < pop.start) continue;
    const p = progress(pop, s.now);
    const st = POP_STYLE[pop.tone];
    const scaleIn = s.reduced ? 1 : lerp(1.35, 1, easeBack(clamp01(p / 0.22)));
    const rise = s.reduced ? 0 : 6 * easeOut(p);
    const alpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    const font = `800 ${st.size}px ${FONT_MONO}`;
    ctx.save();
    ctx.translate(pop.x, pop.y - rise);
    ctx.scale(scaleIn, scaleIn);
    ctx.globalAlpha = alpha;
    // A live value glows (STYLE 2): a soft halo of its meaning colour, then the dark edge.
    text(ctx, pop.text, 0, 0, { font, color: 'rgba(0,0,0,0)', halo: [`${st.glow}0.14)`, 7], tracking: st.tracking });
    text(ctx, pop.text, 0, 0, { font, color: 'rgba(0,0,0,0)', halo: [`${st.glow}0.22)`, 4.6], tracking: st.tracking });
    text(ctx, pop.text, 0, 0, { font, color: st.color, halo: [st.halo, 3], tracking: st.tracking });
    ctx.restore();
  }
}

/**
 * Slam at r >= 10: light blooms out of the top region's pin across the table in its colour, fast
 * (120 ms to reach the far edge) and decaying, added on top so the plates and sea stay readable.
 */
export function paintMapFlash(g: Gfx, s: Scene, fx: FxState): void {
  const f = fx.mapFlash;
  if (!f) return;
  const el = s.now - f.start;
  if (el < 0) return;
  const { ctx } = g;
  const reach = 90 + 420 * easeOut(clamp01(el / (f.dur * 0.2)));
  const level = Math.min(1, el / (f.dur * 0.07)) * Math.exp(-el / (f.dur * 0.3));
  if (level < 0.01) return;
  const tint = mix(f.rgb, WHITE, 0.45);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, reach);
  grad.addColorStop(0, css(tint, 0.6 * level));
  grad.addColorStop(0.35, css(tint, 0.26 * level));
  grad.addColorStop(1, css(tint, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
