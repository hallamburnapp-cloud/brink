/**
 * The land layer (STYLE 5.7 layers 4-13, minus the live effects), baked whenever the scene's land
 * signature changes: the sea under it, plates, terrain, borders, bevels, coast hairlines, stamps,
 * causeways, sea lanes, cables, ferry routes, Gridlock marks and the run's old threads.
 */
import type { Colour, RegionId } from '../contract';
import { MAP_H as H, MAP_W as W, MASSES, REGION, pairKey } from '../data';
import { withShadow, type Gfx } from '../draw';
import { getGeometry } from '../geometry';
import { ALARM, BLOC, css, INK, LINEN, mix, plateCore, plateFill, SEA, type FillState } from '../palette';
import { getPaths } from '../paths';
import { threadWidth, type RegionVis, type Scene } from '../scene';
import { makeLayer, type Layer } from './static';
import { drawCable, drawThread, joinCurve, pointOn, strokeCurve } from './threads';

export interface PlateStyle {
  colour: Colour;
  fill: FillState;
  glow: number;
  dim: number;
  blackout: boolean;
}

/** One region's glass plate: tone, lamp core, Influence glow, Blackout hatch and dim. */
export function paintPlate(g: Gfx, id: RegionId, p: PlateStyle): void {
  const { ctx } = g;
  const path = getPaths().region[id];
  const r = REGION[id];
  let tone = plateFill(p.colour, p.fill);
  const lit = p.fill === 'lit' || p.fill === 'scored' || p.fill === 'flash';
  // Blackout: the bloc takes the spent tone; lit plates keep a little light so they stay tappable,
  // but never read as live (they make the shape and add nothing).
  if (p.blackout) tone = lit ? mix(tone, plateFill(p.colour, 'spent'), 0.7) : plateFill(p.colour, 'spent');
  ctx.fillStyle = css(tone);
  ctx.fill(path);

  const { core, alpha } = plateCore(p.colour, p.fill);
  const reach = r.island ? 30 : 58;
  const grad = ctx.createRadialGradient(r.x, r.y - 2, 1, r.x, r.y, reach);
  if (alpha > 0) {
    const a = p.blackout ? alpha * 0.3 : alpha;
    grad.addColorStop(0, css(core, a));
    grad.addColorStop(0.45, css(core, a * 0.28));
    grad.addColorStop(1, 'rgba(0,0,0,0.16)');
  } else {
    grad.addColorStop(0, css(BLOC[p.colour], p.fill === 'retired' ? 0 : 0.07));
    grad.addColorStop(1, 'rgba(0,0,0,0.12)');
  }
  ctx.fillStyle = grad;
  ctx.fill(path);

  if (p.glow > 0 && p.fill !== 'retired') {
    ctx.fillStyle = css(BLOC[p.colour], p.glow * 0.6);
    ctx.fill(path);
  }
  if (p.fill === 'retired') paintShutter(g, id);
  if (p.blackout) paintHatch(g, id, css(ALARM, 0.35), 5, 1);
  if (p.dim < 1) {
    ctx.fillStyle = css(INK, (1 - p.dim) * 0.85);
    ctx.fill(path);
  }
}

/** Diagonal hatching across a whole plate. */
function paintHatch(g: Gfx, id: RegionId, color: string, step: number, width: number): void {
  const { ctx } = g;
  const b = getGeometry().bounds[id];
  ctx.save();
  ctx.clip(getPaths().region[id]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  const h = b.y1 - b.y0;
  for (let x = b.x0 - h; x < b.x1 + h; x += step) {
    ctx.moveTo(x, b.y0);
    ctx.lineTo(x + h, b.y1);
  }
  ctx.stroke();
  ctx.restore();
}

/** RETIRE: the plate is shuttered (three-bar shutter, spec 6), slats lit from the top-left. */
function paintShutter(g: Gfx, id: RegionId): void {
  const { ctx } = g;
  const b = getGeometry().bounds[id];
  ctx.save();
  ctx.clip(getPaths().region[id]);
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  for (let y = b.y0 + 2; y < b.y1; y += 3.6) {
    ctx.moveTo(b.x0, y);
    ctx.lineTo(b.x1, y);
  }
  ctx.stroke();
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'rgba(233,226,210,0.07)';
  ctx.beginPath();
  for (let y = b.y0 + 3.1; y < b.y1; y += 3.6) {
    ctx.moveTo(b.x0, y);
    ctx.lineTo(b.x1, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** FORTIFY: linen hatching kept to a 6 pt band inside the border, plus a linen edge. */
const hatchCache = new Map<string, Layer & { x0: number; y0: number; w: number; h: number }>();
function fortifyHatch(id: RegionId, k: number) {
  const key = `${id}@${k}`;
  const hit = hatchCache.get(key);
  if (hit) return hit;
  const b = getGeometry().bounds[id];
  const x0 = Math.floor(b.x0) - 2;
  const y0 = Math.floor(b.y0) - 2;
  const w = Math.ceil(b.x1 - x0) + 4;
  const h = Math.ceil(b.y1 - y0) + 4;
  const l = makeLayer(k, w, h);
  l.ctx.translate(-x0, -y0);
  l.ctx.strokeStyle = css(LINEN, 0.55);
  l.ctx.lineWidth = 1;
  l.ctx.beginPath();
  for (let x = x0 - h; x < x0 + w + h; x += 4.5) {
    l.ctx.moveTo(x, y0);
    l.ctx.lineTo(x - h, y0 + h);
  }
  l.ctx.stroke();
  l.ctx.globalCompositeOperation = 'destination-in';
  l.ctx.lineJoin = 'round';
  l.ctx.lineWidth = 12;
  l.ctx.stroke(getPaths().region[id]);
  const entry = Object.assign(l, { x0, y0, w, h });
  hatchCache.set(key, entry);
  return entry;
}

function paintFortify(g: Gfx, r: RegionVis): void {
  const { ctx } = g;
  const path = getPaths().region[r.id];
  const hatch = fortifyHatch(r.id, g.k);
  ctx.save();
  ctx.clip(path);
  ctx.globalAlpha = Math.max(0.35, r.dim);
  ctx.drawImage(hatch.canvas, hatch.x0, hatch.y0, hatch.w, hatch.h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = css(LINEN, 0.5 * Math.max(0.35, r.dim));
  ctx.lineWidth = 2;
  ctx.stroke(path);
  ctx.restore();
}

/** A small alarm-red X: Gridlock crossing out a lane or cable. */
function crossOut(g: Gfx, x: number, y: number, alpha: number): void {
  const { ctx } = g;
  ctx.save();
  ctx.lineCap = 'round';
  const s = 3.6;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x + s, y + s);
    ctx.moveTo(x + s, y - s);
    ctx.lineTo(x - s, y + s);
  };
  path();
  ctx.strokeStyle = `rgba(5,8,12,${0.85 * alpha})`;
  ctx.lineWidth = 3.4;
  ctx.stroke();
  withShadow(g, css(ALARM, 0.6 * alpha), 2, 0, 0, () => {
    path();
    ctx.strokeStyle = css(ALARM, alpha);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  });
  ctx.restore();
}

/**
 * Ferry Master: every port is joined to every other, drawn as a ferry service through the
 * Scatter. Each mainland port runs a dotted crossing to its nearest island port (skipped where a
 * sea lane already makes that crossing), so every port visibly reaches the hub and, through it,
 * every other port.
 */
function paintFerry(g: Gfx, s: Scene): void {
  const { ctx } = g;
  const ports = s.list.filter((r) => r.port && r.status !== 'retired');
  const hubs = ports.filter((r) => r.def.island);
  if (!hubs.length) return;
  const lanes = new Set(getGeometry().lanes.map((l) => pairKey(l.a, l.b)));
  ctx.save();
  ctx.setLineDash([0.01, 3.4]);
  ctx.lineCap = 'round';
  for (const r of ports) {
    if (r.def.island) continue;
    const hub = hubs.reduce((b, h) => (dist(r, h) < dist(r, b) ? h : b));
    if (lanes.has(pairKey(r.id, hub.id))) continue;
    const dim = Math.min(r.dim, hub.dim);
    ctx.strokeStyle = `rgba(200,228,255,${0.3 + 0.35 * dim})`;
    ctx.lineWidth = 1.6;
    strokeCurve(g, joinCurve(r.id, hub.id, 'ferry'));
  }
  ctx.restore();
}

function dist(a: RegionVis, b: RegionVis): number {
  return Math.hypot(a.def.x - b.def.x, a.def.y - b.def.y);
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

  for (const r of s.list) {
    paintPlate(g, r.id, { colour: r.colour, fill: r.fill, glow: r.glow, dim: r.dim, blackout: r.blackout });
  }

  ctx.save();
  ctx.globalAlpha = s.sweeping ? 0.045 / 0.07 : 1;
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
    const lit = r.fill === 'lit' || r.fill === 'scored';
    bevel(paths.region[r.id], r.def.x - 20, r.def.y - 20, r.def.x + 20, r.def.y + 20, lit ? 1 : 0.45);
  }

  // Coast: a crisp hairline in the landmass colour (the spent tone under Blackout).
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.75;
  for (const m of MASSES) {
    // Each landmass is drawn in its own bloc's colour (a Mass is also a Colour).
    const c: Colour = m;
    const tone = s.blackout === c ? plateFill(c, 'spent') : mix(BLOC[c], SEA, 0.75);
    ctx.strokeStyle = css(tone, 0.75 * massDim);
    ctx.stroke(paths.coast[m]);
  }
  for (const r of s.list) {
    if (!r.def.island) continue;
    const tone = r.blackout ? plateFill(r.colour, 'spent') : mix(BLOC[r.colour], SEA, 0.75);
    ctx.strokeStyle = css(tone, 0.75 * (r.dim < 1 ? 0.6 : 1));
    ctx.stroke(paths.region[r.id]);
  }
  ctx.restore();

  for (const r of s.list) if (r.stamp === 'FORTIFY' && r.status !== 'retired') paintFortify(g, r);

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

  if (s.ferry) paintFerry(g, s);

  // Sea lanes: white 1.5 pt dashes, 4 on 4 off, centre to centre (cut under Gridlock).
  for (const lane of geo.lanes) {
    const A = REGION[lane.a];
    const B = REGION[lane.b];
    const dim = Math.min(s.regions[lane.a].dim, s.regions[lane.b].dim);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = `rgba(233,240,248,${(0.16 + 0.34 * dim) * (s.gridlock ? 0.45 : 1)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
    ctx.restore();
  }

  for (const [a, b] of s.cables) {
    const dim = Math.min(s.regions[a]?.dim ?? 1, s.regions[b]?.dim ?? 1);
    drawCable(g, joinCurve(a, b, 'cable'), (0.5 + 0.5 * dim) * (s.gridlock ? 0.55 : 1));
  }

  for (const t of s.oldThreads) {
    const dim = Math.min(s.regions[t.a].dim, s.regions[t.b].dim);
    drawThread(g, joinCurve(t.a, t.b, t.kind), {
      width: threadWidth(t.traffic),
      alpha: 0.72 * (0.4 + 0.6 * dim),
      traffic: t.traffic,
    });
  }

  if (s.gridlock) {
    for (const lane of geo.lanes) {
      const A = REGION[lane.a];
      const B = REGION[lane.b];
      crossOut(g, (A.x + B.x) / 2, (A.y + B.y) / 2, 0.9);
    }
    for (const [a, b] of s.cables) {
      const [x, y] = pointOn(joinCurve(a, b, 'cable'), 0.5);
      crossOut(g, x, y, 0.9);
    }
  }
}
