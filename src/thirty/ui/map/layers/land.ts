/**
 * The land layer, baked whenever a region's settled heat changes: the sea under it, each plate in
 * its heat's colour (WAR hatched), the borders, the coast hairline, causeways and sea lanes.
 */
import type { Heat, RegionId } from '../contract';
import { MAP_H as H, MAP_W as W, MASSES, REGION } from '../data';
import type { Gfx } from '../draw';
import { getGeometry } from '../geometry';
import { css, HAIRLINE, HATCH_STEP, HATCH_WIDTH, heatTone } from '../palette';
import { getPaths } from '../paths';
import type { Layer } from './static';

/**
 * 45-degree lines across a region (bottom-left to top-right), `step` points apart measured across
 * the lines. Clipped to the plate.
 */
export function hatch(g: Gfx, id: RegionId, color: string, width: number, step = HATCH_STEP): void {
  const { ctx } = g;
  const b = getGeometry().bounds[id];
  ctx.save();
  ctx.clip(getPaths().region[id]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  const dc = step * Math.SQRT2;
  const c0 = Math.floor((b.x0 + b.y0) / dc) * dc;
  for (let c = c0 - dc; c <= b.x1 + b.y1 + dc; c += dc) {
    ctx.moveTo(c - b.y1 - 2, b.y1 + 2);
    ctx.lineTo(c - b.y0 + 2, b.y0 - 2);
  }
  ctx.stroke();
  ctx.restore();
}

/** One region's plate at a heat: the flat colour, a faint sheen towards its centre, WAR's hatching. */
export function paintPlate(g: Gfx, id: RegionId, heat: Heat): void {
  const { ctx } = g;
  const path = getPaths().region[id];
  const r = REGION[id];
  const tone = heatTone(heat);
  ctx.fillStyle = css(tone.fill);
  ctx.fill(path);
  const reach = r.island ? 26 : 50;
  const grad = ctx.createRadialGradient(r.x, r.y - 2, 1, r.x, r.y, reach);
  grad.addColorStop(0, 'rgba(255,250,240,0.10)');
  grad.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = grad;
  ctx.fill(path);
  if (tone.hatch) hatch(g, id, css(tone.hatch), HATCH_WIDTH);
}

export function paintLand(g: Gfx, heats: Readonly<Record<RegionId, Heat>>, base: Layer): void {
  const { ctx } = g;
  const paths = getPaths();
  const geo = getGeometry();
  ctx.drawImage(base.canvas, 0, 0, W, H);

  for (const id in heats) if (REGION[id]) paintPlate(g, id, heats[id]);

  // Borders: a fine dark etch.
  ctx.save();
  ctx.clip(paths.allLand);
  ctx.strokeStyle = 'rgba(6,10,18,0.8)';
  ctx.lineWidth = 1;
  ctx.stroke(paths.borders);
  ctx.restore();

  // Coast: a crisp neutral hairline.
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = css(HAIRLINE, 0.4);
  for (const m of MASSES) ctx.stroke(paths.coast[m]);
  for (const id in heats) if (REGION[id]?.island) ctx.stroke(paths.region[id]);
  ctx.restore();

  // Causeways between islands: short dark bars.
  for (const cw of geo.causeways) {
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#243444';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cw.p[0], cw.p[1]);
    ctx.lineTo(cw.q[0], cw.q[1]);
    ctx.stroke();
    ctx.restore();
  }

  // Sea lanes: faint dashes, centre to centre.
  for (const lane of geo.lanes) {
    const A = REGION[lane.a];
    const B = REGION[lane.b];
    ctx.save();
    ctx.setLineDash([3, 5]);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = css(HAIRLINE, 0.22);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
    ctx.restore();
  }
}
