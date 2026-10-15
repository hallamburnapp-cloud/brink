/**
 * The land layer (STYLE 5.7 layers 4-12), baked whenever the scene's land signature changes: the
 * sea under it, gold's glow on the water, the plates by owner (gold, grey, hatched red), terrain,
 * borders, bevels, coast hairlines, gold rims, causeways and sea lanes.
 */
import type { Colour, Owner, RegionId } from '../contract';
import { MAP_H as H, MAP_W as W, MASSES, REGION } from '../data';
import type { Gfx } from '../draw';
import { getGeometry } from '../geometry';
import { css, GOLD, GOLD_DEEP, GOLD_RIM, HATCH_STEP, HATCH_WIDTH, INK, lampCore, ownerTone, WAR_TEXT } from '../palette';
import { getPaths } from '../paths';
import type { Scene } from '../scene';
import { blurredShape, makeLayer, type Layer } from './static';

export interface PlateStyle {
  owner: Owner;
  colour: Colour;
  /** The lamp under the glass is on (lit and in play). */
  live: boolean;
  /** Flashed by the current send: the lamp holds brighter. */
  scored: boolean;
  /** 1 = full light; lower fades the plate towards the table. */
  dim: number;
  ceased: boolean;
}

/**
 * 45-degree lines across a region (bottom-left to top-right), `step` points apart measured across
 * the lines, `offset` points along that measure. Clipped to the plate.
 */
export function hatch(g: Gfx, id: RegionId, color: string, width: number, step = HATCH_STEP, offset = 0): void {
  const { ctx } = g;
  const b = getGeometry().bounds[id];
  ctx.save();
  ctx.clip(getPaths().region[id]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  // Lines x + y = c, for c spaced step * sqrt(2) apart (step across the lines).
  const dc = step * Math.SQRT2;
  const c0 = Math.floor((b.x0 + b.y0) / dc) * dc + offset * Math.SQRT2;
  for (let c = c0 - dc; c <= b.x1 + b.y1 + dc; c += dc) {
    ctx.moveTo(c - b.y1 - 2, b.y1 + 2);
    ctx.lineTo(c - b.y0 + 2, b.y0 - 2);
  }
  ctx.stroke();
  ctx.restore();
}

/** One region's glass plate: its owner's tone, the lamp core when lit, red's hatching, gold's rim, dim. */
export function paintPlate(g: Gfx, id: RegionId, p: PlateStyle): void {
  const { ctx } = g;
  const path = getPaths().region[id];
  const r = REGION[id];
  const tone = ownerTone(p.owner, p.colour, p.live, p.ceased);
  ctx.fillStyle = css(tone.fill);
  ctx.fill(path);

  const reach = r.island ? 30 : 58;
  const grad = ctx.createRadialGradient(r.x, r.y - 2, 1, r.x, r.y, reach);
  if (p.live) {
    const { core, alpha } = lampCore(p.owner);
    const a = Math.min(1, alpha * (p.scored ? 1.6 : 1));
    grad.addColorStop(0, css(core, a));
    grad.addColorStop(0.45, css(core, a * 0.28));
    grad.addColorStop(1, 'rgba(0,0,0,0.14)');
  } else {
    // Unlit glass: a faint sheen at the pin, darker towards the edge.
    grad.addColorStop(0, `rgba(255,248,230,${p.owner === 'gold' ? 0.12 : 0.05})`);
    grad.addColorStop(1, 'rgba(0,0,0,0.16)');
  }
  ctx.fillStyle = grad;
  ctx.fill(path);

  if (tone.hatch) hatch(g, id, css(tone.hatch), HATCH_WIDTH);
  if (p.owner === 'gold') {
    goldSheen(g, id);
    goldRim(g, id);
  }
  if (p.dim < 1) {
    ctx.fillStyle = css(INK, (1 - p.dim) * 0.85);
    ctx.fill(path);
  }
}

/** Gold is metal under the lamp: lighter towards the top-left, deeper towards the bottom-right. */
function goldSheen(g: Gfx, id: RegionId): void {
  const { ctx } = g;
  const b = getGeometry().bounds[id];
  const grad = ctx.createLinearGradient(b.x0, b.y0, b.x1, b.y1);
  grad.addColorStop(0, css(GOLD_RIM, 0.3));
  grad.addColorStop(0.4, css(GOLD_RIM, 0));
  grad.addColorStop(0.62, css(GOLD_DEEP, 0.12));
  grad.addColorStop(1, css(GOLD_DEEP, 0.55));
  ctx.fillStyle = grad;
  ctx.fill(getPaths().region[id]);
}

/** Gold's 1.5 pt light rim (a 3 pt stroke clipped inside the plate) with a soft inner glow. */
function goldRim(g: Gfx, id: RegionId): void {
  const { ctx } = g;
  const path = getPaths().region[id];
  ctx.save();
  ctx.clip(path);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = css(GOLD_RIM, 0.22);
  ctx.lineWidth = 10;
  ctx.stroke(path);
  ctx.strokeStyle = css(GOLD_RIM, 0.95);
  ctx.lineWidth = 3;
  ctx.stroke(path);
  ctx.restore();
}

const glowCache = new Map<string, Layer & { x: number; y: number; w: number; h: number }>();

/** A gold region's glow on the water: its shape blurred (a wide soft halo and a tight bright one), baked once. */
function goldGlow(id: RegionId, k: number) {
  const key = `${id}@${k}`;
  let sp = glowCache.get(key);
  if (!sp) {
    const b = getGeometry().bounds[id];
    const m = 32;
    const x = Math.floor(b.x0 - m);
    const y = Math.floor(b.y0 - m);
    const w = Math.ceil(b.x1 - b.x0 + 2 * m);
    const h = Math.ceil(b.y1 - b.y0 + 2 * m);
    // A blur needs little resolution: 1.5 px per point keeps 30 cached glows small.
    const l = makeLayer(Math.min(k, 1.5), w, h);
    l.ctx.translate(-x, -y);
    blurredShape(l, 'rgba(242,210,122,0.34)', 14, getPaths().region[id]);
    blurredShape(l, 'rgba(255,233,168,0.3)', 4, getPaths().region[id]);
    sp = Object.assign(l, { x, y, w, h });
    glowCache.set(key, sp);
  }
  return sp;
}

export interface LandStatics {
  base: Layer;
  terrain: Layer;
}

export function paintLand(g: Gfx, s: Scene, statics: LandStatics): void {
  const { ctx } = g;
  const paths = getPaths();
  const geo = getGeometry();
  // The base already carries the plates' contact shadow (it never changes).
  ctx.drawImage(statics.base.canvas, 0, 0, W, H);
  if (s.sweeping) {
    ctx.fillStyle = 'rgba(6,10,15,0.32)';
    ctx.fillRect(0, 0, W, H);
  }
  const massDim = s.sweeping ? 0.6 : 1;

  // Gold glows onto the water around it (the plates cover the land, so only the sea shows it).
  ctx.save();
  ctx.globalAlpha = s.sweeping ? 0.5 : 1;
  for (const r of s.list) {
    if (r.owner !== 'gold') continue;
    const glow = goldGlow(r.id, g.k);
    ctx.drawImage(glow.canvas, glow.x, glow.y, glow.w, glow.h);
  }
  ctx.restore();

  for (const r of s.list) {
    paintPlate(g, r.id, { owner: r.owner, colour: r.def.colour, live: r.live, scored: r.scored, dim: r.dim, ceased: s.ceased });
  }

  ctx.save();
  ctx.globalAlpha = s.sweeping ? 0.6 : 1;
  ctx.drawImage(statics.terrain.canvas, 0, 0, W, H);
  ctx.restore();

  // Borders: a 1 pt etch with a faint highlight on its lower-right lip.
  ctx.save();
  ctx.clip(paths.allLand);
  ctx.translate(0.7, 0.7);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 0.7;
  ctx.stroke(paths.borders);
  ctx.translate(-0.7, -0.7);
  ctx.strokeStyle = 'rgba(5,10,16,0.9)';
  ctx.lineWidth = 1;
  ctx.stroke(paths.borders);
  ctx.restore();

  // Bevel: the cut edge of each plate, lit from the top-left lamp.
  const bevel = (path: Path2D, x0: number, y0: number, x1: number, y1: number, k: number) => {
    ctx.save();
    ctx.clip(path);
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, `rgba(255,250,235,${0.3 * k})`);
    grad.addColorStop(0.5, `rgba(255,250,235,${0.06 * k})`);
    grad.addColorStop(1, `rgba(0,0,0,${0.45 * k})`);
    ctx.strokeStyle = grad;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.stroke(path);
    ctx.restore();
  };
  for (const m of MASSES) {
    const xs = geo.coasts[m].map((v) => v[0]);
    const ys = geo.coasts[m].map((v) => v[1]);
    bevel(paths.coast[m], Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), massDim);
  }
  for (const r of s.list) {
    if (!r.def.island) continue;
    bevel(paths.region[r.id], r.def.x - 20, r.def.y - 20, r.def.x + 20, r.def.y + 20, r.live ? 1 : 0.45);
  }

  // Coast: a crisp neutral hairline (colour on the map means ownership only); gold's edge is its rim.
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = `rgba(157,184,217,${0.42 * massDim})`;
  for (const m of MASSES) ctx.stroke(paths.coast[m]);
  for (const r of s.list) {
    if (!r.def.island) continue;
    ctx.strokeStyle = r.owner === 'gold' ? css(GOLD, 0.8) : `rgba(157,184,217,${r.dim < 1 ? 0.25 : 0.42})`;
    ctx.stroke(paths.region[r.id]);
  }
  ctx.restore();

  // CEASEFIRE: war stops where it stands, and its regions stay outlined.
  if (s.ceased) {
    for (const r of s.list) {
      if (r.owner !== 'red') continue;
      const path = paths.region[r.id];
      ctx.save();
      ctx.clip(path);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = css(WAR_TEXT, 0.75);
      ctx.lineWidth = 3;
      ctx.stroke(path);
      ctx.restore();
    }
  }

  // Causeways: 6 pt bars between disc edges, with a lit top edge.
  for (const cw of geo.causeways) {
    const dim = Math.min(s.regions[cw.a].dim, s.regions[cw.b].dim);
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.55 * dim;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#2A3A4A';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cw.p[0], cw.p[1]);
    ctx.lineTo(cw.q[0], cw.q[1]);
    ctx.stroke();
    let nx = -(cw.q[1] - cw.p[1]);
    let ny = cw.q[0] - cw.p[0];
    const nl = Math.hypot(nx, ny);
    if (nx + ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const ox = (nx / nl) * 2.6;
    const oy = (ny / nl) * 2.6;
    ctx.strokeStyle = 'rgba(157,184,217,0.18)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cw.p[0] + ox, cw.p[1] + oy);
    ctx.lineTo(cw.q[0] + ox, cw.q[1] + oy);
    ctx.stroke();
    ctx.restore();
  }

  // Sea lanes: white 1.5 pt dashes, 4 on 4 off, centre to centre.
  for (const lane of geo.lanes) {
    const A = REGION[lane.a];
    const B = REGION[lane.b];
    const dim = Math.min(s.regions[lane.a].dim, s.regions[lane.b].dim);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = `rgba(233,240,248,${0.16 + 0.34 * dim})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
    ctx.restore();
  }
}
