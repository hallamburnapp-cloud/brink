/**
 * Live effects, drawn every frame over the baked land: gold's shimmer and war's pulse, the deal's
 * light-up, ink floods, the travelling colour pulse, the wave, flashes and blinks, thread pulses,
 * the scan line, the shockwave, the bloom, brass ripples and lights out.
 * Nothing here uses shadowBlur per frame: glows are layered strokes, gradients or cached sprites.
 */
import type { InkColour, Owner, RegionId } from '../contract';
import { MAP_H as H, MAP_W as W, REGION, REGIONS } from '../data';
import { clamp01, easeInOut, easeOut, glowStroke, withShadow, type Gfx } from '../draw';
import { progress, type FxState } from '../fx';
import { getGeometry } from '../geometry';
import { BRASS, css, GOLD_FILL, GOLD_RIM, INK, mix, ownerTone, WAR, WHITE } from '../palette';
import { getPaths } from '../paths';
import { mulberry32 } from '../rand';
import type { RegionVis, Scene } from '../scene';
import { paintPlate } from './land';
import { blurredShape, makeLayer, type Layer } from './static';
import { drawComet, joinCurve } from './threads';

function regionFill(g: Gfx, id: RegionId, color: string | CanvasGradient): void {
  g.ctx.fillStyle = color;
  g.ctx.fill(getPaths().region[id]);
}

function plateOf(s: Scene, r: RegionVis, owner: Owner) {
  return { owner, colour: r.def.colour, live: r.live, scored: r.scored, dim: r.dim, ceased: s.ceased };
}

// ---------------------------------------------------------------- idle life

const SHIMMER_MS = 6000;
const WAR_PULSE_MS = 4000;
const SHIMMER_BAND = 110;
/** The shimmer's diagonal axis runs top-left to bottom-right; its extent over the map. */
const AXIS = Math.SQRT1_2;
const AXIS_END = (W + H) * AXIS;

/** Gold's slow shimmer: a soft band of light crossing your regions every 6 s. */
export function paintShimmer(g: Gfx, s: Scene): void {
  if (s.reduced) return;
  const { ctx } = g;
  const u = (s.now % SHIMMER_MS) / SHIMMER_MS;
  const c = -SHIMMER_BAND + u * (AXIS_END + 2 * SHIMMER_BAND);
  const x0 = (c - SHIMMER_BAND / 2) * AXIS;
  const x1 = (c + SHIMMER_BAND / 2) * AXIS;
  const band = ctx.createLinearGradient(x0, x0, x1, x1);
  band.addColorStop(0, 'rgba(255,248,222,0)');
  band.addColorStop(0.5, 'rgba(255,248,222,0.2)');
  band.addColorStop(1, 'rgba(255,248,222,0)');
  const bounds = getGeometry().bounds;
  for (const r of s.list) {
    if (r.owner !== 'gold') continue;
    const b = bounds[r.id];
    // Only where the band crosses the plate.
    if ((b.x1 + b.y1) * AXIS < c - SHIMMER_BAND / 2 || (b.x0 + b.y0) * AXIS > c + SHIMMER_BAND / 2) continue;
    ctx.save();
    ctx.globalAlpha = r.dimNow;
    regionFill(g, r.id, band);
    ctx.restore();
  }
}

/** War's slow pulse: red regions swell 10% brighter and darker over 4 s (not once war has ceased). */
export function paintWarPulse(g: Gfx, s: Scene): void {
  if (s.reduced || s.ceased) return;
  const { ctx } = g;
  const phase = Math.sin((s.now / WAR_PULSE_MS) * Math.PI * 2);
  for (const r of s.list) {
    if (r.owner !== 'red') continue;
    if (phase > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      regionFill(g, r.id, css(WAR, 0.13 * phase * r.dimNow));
      ctx.restore();
    } else {
      regionFill(g, r.id, css(INK, -0.12 * phase * r.dimNow));
    }
  }
}

// ---------------------------------------------------------------- the deal

/** A deal: each region warms up from dark as its lamp comes on, with a glow off its pin. */
export function paintLightUps(g: Gfx, s: Scene): void {
  const { ctx } = g;
  for (const r of s.list) {
    if (r.warm >= 1 || !r.lit) continue;
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

// ---------------------------------------------------------------- lights out

/**
 * WAR (the loss): the free regions go out one by one, each with a short flicker; the sea darkens
 * with them; gold stays lit (it was yours for good) and red pulses once at the end.
 */
export function paintLightsOut(g: Gfx, s: Scene, fx: FxState): void {
  const lo = fx.lightsOut;
  if (!lo) return;
  const { ctx } = g;
  const elapsed = s.now - lo.start;
  const p = clamp01(elapsed / lo.dur);
  const paths = getPaths();
  // The sea and everything but gold dims as the lights go.
  const notGold = new Path2D();
  notGold.rect(0, 0, W, H);
  for (const r of s.list) if (r.owner === 'gold') notGold.addPath(paths.region[r.id]);
  ctx.save();
  ctx.clip(notGold, 'evenodd');
  ctx.fillStyle = css(INK, 0.3 * clamp01(p * 1.1));
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  for (const r of s.list) {
    const at = lo.at.get(r.id);
    if (at === undefined) continue;
    const since = elapsed - at * lo.dur;
    if (since < 0) continue;
    // A failing lamp: dark, a stutter back on, then out for good (150 ms in all).
    const level = s.reduced ? p : since < 40 ? 0.85 : since < 70 ? 0.25 : since < 110 ? 0.9 : 1;
    regionFill(g, r.id, css(INK, 0.78 * level));
  }
  // Red pulses once, after the last free region has gone out.
  const pulse = s.reduced ? 0 : Math.sin(Math.PI * clamp01((p - 0.78) / 0.22));
  if (pulse > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of s.list) if (r.owner === 'red') regionFill(g, r.id, css(WAR, 0.42 * pulse));
    ctx.restore();
  }
}

/** How lit a region's marks still are during lights out (1 = untouched). */
export function lightsLeft(fx: FxState, id: RegionId, now: number): number {
  const lo = fx.lightsOut;
  const at = lo?.at.get(id);
  if (!lo || at === undefined) return 1;
  const since = now - lo.start - at * lo.dur;
  return since <= 0 ? 1 : 1 - 0.75 * clamp01(since / 150);
}

/** The order the free regions go out in: a seeded shuffle, spread over 93% of the duration. */
export function lightsOutOrder(ids: RegionId[], seed: number): Map<RegionId, number> {
  const rnd = mulberry32(0x5eed + seed);
  const order = ids.map((id) => ({ id, k: rnd() })).sort((a, b) => a.k - b.k);
  return new Map(order.map((o, i) => [o.id, ids.length > 1 ? (i / (ids.length - 1)) * 0.93 : 0]));
}

// ---------------------------------------------------------------- ownership changes

function farthestCorner(x: number, y: number, id: RegionId): number {
  const b = getGeometry().bounds[id];
  return Math.max(Math.hypot(b.x0 - x, b.y0 - y), Math.hypot(b.x1 - x, b.y0 - y), Math.hypot(b.x0 - x, b.y1 - y), Math.hypot(b.x1 - x, b.y1 - y)) + 8;
}

/** A wobbling ink front (seeded per spread so it holds its shape as it grows). */
function inkBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number): void {
  const rnd = mulberry32(Math.floor(seed) | 0);
  const n = 28;
  const amp = Array.from({ length: 4 }, () => rnd() * 0.08);
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

/**
 * Ink floods each target from the source's pin (or from the target's own centre when the source is
 * the target): gold for a win, red for war. Its front is a wet edge; gold wiping out red flashes
 * white along the front.
 */
export function paintInk(g: Gfx, s: Scene, fx: FxState): void {
  const { ctx } = g;
  for (const ink of fx.inks) {
    const p = easeInOut(progress(ink, s.now));
    const src = REGION[ink.source];
    for (const id of ink.targets) {
      const r = s.regions[id];
      const from = id === ink.source ? r.def : src;
      const radius = p * farthestCorner(from.x, from.y, id);
      if (radius <= 0) continue;
      ctx.save();
      inkBlob(ctx, from.x, from.y, radius, ink.start + r.def.index);
      ctx.clip();
      paintPlate(g, id, plateOf(s, r, ink.owner));
      ctx.restore();
      if (p >= 1) continue;
      const wipe = ink.owner === 'gold' && ink.before.get(id) === 'red';
      ctx.save();
      ctx.clip(getPaths().region[id]);
      inkBlob(ctx, from.x, from.y, radius, ink.start + r.def.index);
      if (ink.owner === 'gold') {
        glowStroke(ctx, () => ctx.stroke(), (a) => css(wipe ? WHITE : GOLD_RIM, a * 1.5 * (1 - p)), wipe ? 3 : 2, 3);
        ctx.strokeStyle = css(wipe ? WHITE : GOLD_RIM, 0.95 * (1 - p * 0.5));
        ctx.lineWidth = wipe ? 3 : 2;
      } else {
        ctx.strokeStyle = css(mix(INK, WAR, 0.5), 0.75 * (1 - p * 0.6));
        ctx.lineWidth = 2.4;
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** Ownership travels: a comet steps along the chain of joins, and each region it reaches blinks. */
export function paintTravel(g: Gfx, s: Scene, fx: FxState): void {
  for (const t of fx.travels) {
    const e = s.now - t.start;
    if (e < 0) continue;
    for (let i = 0; i + 1 < t.path.length; i++) {
      const local = (e - i * t.stepMs) / t.stepMs;
      if (local > 0 && local < 1.35) drawComet(g, joinCurve(t.path[i], t.path[i + 1]), Math.min(1, local), t.colour, 3.2);
      const since = e - (i + 1) * t.stepMs;
      if (since >= 0 && since < 260) blink(g, s, t.path[i + 1], t.colour, 0.55 * (1 - since / 260));
    }
  }
}

function blink(g: Gfx, s: Scene, id: RegionId, colour: InkColour, a: number): void {
  const r = s.regions[id];
  if (!r || a <= 0) return;
  const tone = colour === 'gold' ? mix(WHITE, GOLD_FILL, 0.4) : mix(WHITE, WAR, 0.3);
  regionFill(g, id, css(tone, a));
}

const waveReach = new Map<RegionId, number>();
/** How far a wave from this region travels to have crossed every plate. */
function reachFrom(id: RegionId): number {
  let d = waveReach.get(id);
  if (d === undefined) {
    const src = REGION[id];
    d = Math.max(...REGIONS.map((r) => farthestCorner(src.x, src.y, r.id)));
    waveReach.set(id, d);
  }
  return d;
}

const WAVE_EDGE = 46;
/** The bright crest at the wave's front, in points either side of it. */
const CREST_IN = 70;
const CREST_OUT = 18;

/**
 * A wave rolls out from a region over the whole map and back: each plate takes the colour as the
 * front passes, under a bright crest that also sweeps gold already won (the WORLD UNITED wave),
 * then gives the colour back, far plates first.
 */
export function paintWave(g: Gfx, s: Scene, fx: FxState): void {
  const { ctx } = g;
  for (const w of fx.waves) {
    const p = progress(w, s.now);
    const src = REGION[w.from];
    const reach = reachFrom(w.from) + WAVE_EDGE;
    const front = p < 0.5 ? reach * easeInOut(p / 0.5) : p < 0.58 ? reach : reach * (1 - easeInOut((p - 0.58) / 0.42));
    for (const r of s.list) {
      const d = Math.hypot(r.def.x - src.x, r.def.y - src.y);
      const level = clamp01((front - d) / WAVE_EDGE);
      if (level <= 0 || r.owner === w.colour) continue;
      ctx.save();
      ctx.globalAlpha = level * 0.9;
      paintPlate(g, r.id, plateOf(s, r, w.colour));
      ctx.restore();
    }
    if (p >= 0.58 || front <= 0) continue;
    // The crest: a band of light on the land at the front, strongest on the way out.
    const outer = front + CREST_OUT;
    const inner = Math.max(0, front - CREST_IN);
    const crest = ctx.createRadialGradient(src.x, src.y, inner, src.x, src.y, outer);
    const col = w.colour === 'gold' ? mix(WHITE, GOLD_RIM, 0.35) : mix(WHITE, WAR, 0.4);
    const k = 0.55 * (p < 0.5 ? 1 : 1 - (p - 0.5) / 0.08);
    crest.addColorStop(0, css(col, 0));
    crest.addColorStop((front - inner) / (outer - inner), css(col, k));
    crest.addColorStop(1, css(col, 0));
    ctx.save();
    ctx.clip(getPaths().allLand);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = crest;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- the send

const spriteCache = new Map<string, Layer & { x: number; y: number; w: number; h: number }>();

/** The flash bloom around a region (a 14 pt blur of its shape), baked once per region. */
function bloomSprite(id: RegionId, k: number) {
  const key = `bloom:${id}@${k}`;
  let sp = spriteCache.get(key);
  if (!sp) {
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
    sp = Object.assign(l, { x, y, w, h });
    spriteCache.set(key, sp);
  }
  return sp;
}

/** The scan line with its glow, as a tall sprite (2 pt white, 40% glow). */
function scanSprite(k: number) {
  const key = `scan@${k}`;
  let sp = spriteCache.get(key);
  if (!sp) {
    const w = 16;
    const l = makeLayer(k, w, H);
    withShadow(l, 'rgba(255,255,255,0.4)', 10 / 3, 0, 0, () => {
      l.ctx.fillStyle = 'rgba(255,255,255,0.95)';
      l.ctx.fillRect(w / 2 - 1, 10, 2, H - 10);
    });
    sp = Object.assign(l, { x: -w / 2, y: 0, w, h: H });
    spriteCache.set(key, sp);
  }
  return sp;
}

/** A region flashes white for 80 ms, then holds (the land layer keeps its lamp bright). */
export function paintFlashes(g: Gfx, s: Scene, fx: FxState): void {
  const { ctx } = g;
  for (const f of fx.flashes) {
    const p = progress(f, s.now);
    // The white phase is the first 40% (80 ms at 1x); the bloom lingers for the rest.
    const white = 1 - clamp01(p / 0.4);
    const bloom = 1 - p;
    const r = s.regions[f.id];
    const path = getPaths().region[f.id];
    const sprite = bloomSprite(f.id, g.k);
    ctx.save();
    ctx.globalAlpha = bloom;
    ctx.drawImage(sprite.canvas, sprite.x, sprite.y, sprite.w, sprite.h);
    ctx.restore();
    ctx.save();
    ctx.clip(path);
    const tone = ownerTone(r.owner, r.def.colour, true, s.ceased).fill;
    ctx.fillStyle = css(mix(WHITE, tone, 0.75), 0.75 * white);
    ctx.fill(path);
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * bloom})`;
    ctx.lineWidth = 3;
    ctx.stroke(path);
    ctx.restore();
  }
}

/** A white pulse along the thread from one pin to the next. */
export function paintPulses(g: Gfx, s: Scene, fx: FxState): void {
  for (const p of fx.pulses) drawComet(g, joinCurve(p.from, p.to), easeOut(progress(p, s.now)));
}

/** Scan line: 2 pt white with a 40% glow, and a faint wake to the west. */
export function paintScan(g: Gfx, s: Scene, fx: FxState): void {
  const x = fx.scanX;
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
export function paintScanCursor(g: Gfx, fx: FxState): void {
  const x = fx.scanX;
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

/** Regions blink for 80 ms as the shockwave crosses their pin. */
export function paintBlinks(g: Gfx, s: Scene, fx: FxState, speed: number): void {
  const sh = fx.shock;
  if (!sh) return;
  const src = REGION[sh.from];
  const blinkMs = 80 / speed;
  for (const r of s.list) {
    // When the front (r = 640 x (1 - (1 - p)^1.6)) reaches this pin.
    const d = Math.hypot(r.def.x - src.x, r.def.y - src.y) / 640;
    const at = sh.start + (1 - Math.pow(1 - d, 1 / 1.6)) * sh.dur;
    const p = (s.now - at) / blinkMs;
    if (p < 0 || p > 1) continue;
    const tone = ownerTone(r.owner, r.def.colour, true, s.ceased).fill;
    regionFill(g, r.id, css(mix(WHITE, tone, 0.45), 0.45 * (1 - p)));
  }
}

/** A white ring from a region, 0 to 640 pt (2 pt stroke, fading). */
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

/** Where the decorative brass tack sits, relative to the pin. */
export const BRASS_TACK = { dx: -15, dy: 2 };

/** A brass pin has landed: a brass ring spreads from the tack and fades. */
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
    ctx.arc(r.x + BRASS_TACK.dx, r.y + BRASS_TACK.dy, 5 + 22 * easeOut(p), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * A slam of 10x the target or more: light blooms out of a region across the table, fast (120 ms
 * to reach the far edge) and decaying, added on top so the plates and sea stay readable.
 */
export function paintBloom(g: Gfx, s: Scene, fx: FxState): void {
  const f = fx.bloom;
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
