/**
 * Layers that never change once baked at a given backing scale (STYLE 5.7 layers 1-3, 7 and 15):
 * the sea with its backlight, graticule, shelf halo and depth contours; the terrain isolines; and
 * the glass finish over everything (bearing strip, grain, sheen, vignette, the rail's shadow).
 */
import { MAP_H as H, MAP_W as W } from '../data';
import { FONT_LABEL, text, type Ctx, type Gfx } from '../draw';
import { css, SEA } from '../palette';
import { getPaths } from '../paths';
import { mulberry32 } from '../rand';

export interface Layer extends Gfx {
  canvas: HTMLCanvasElement;
}

export function makeLayer(k: number, w = W, h = H): Layer {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * k));
  canvas.height = Math.max(1, Math.round(h * k));
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  return { canvas, ctx, k };
}

/**
 * A blurred silhouette without ctx.filter (older Safari lacks it): draw the shape far off-canvas and
 * let its shadow fall back into view.
 */
export function blurredShape(g: Gfx, color: string, blurPt: number, path: Path2D): void {
  const OFF = 4000;
  const { ctx, k } = g;
  ctx.save();
  ctx.translate(-OFF, 0);
  ctx.shadowColor = color;
  ctx.shadowBlur = blurPt * k;
  ctx.shadowOffsetX = OFF * k;
  ctx.fillStyle = '#000';
  ctx.fill(path);
  ctx.restore();
}

/**
 * Layers 1-3 and 5: sea, backlight pool, graticule with registration crosses, shelf halo, depth
 * contours, and the land's contact shadow.
 */
export function paintSea(g: Gfx): void {
  const { ctx, k } = g;
  const paths = getPaths();
  ctx.fillStyle = css(SEA);
  ctx.fillRect(0, 0, W, H);
  const pool = ctx.createRadialGradient(W * 0.52, H * 0.46, 10, W * 0.52, H * 0.46, H * 0.62);
  pool.addColorStop(0, 'rgba(30,62,92,0.55)');
  pool.addColorStop(0.55, 'rgba(18,38,58,0.25)');
  pool.addColorStop(1, 'rgba(4,9,15,0.55)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = 'rgba(157,184,217,0.055)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = 39; x < W; x += 39) {
    ctx.moveTo(x + 0.25, 10);
    ctx.lineTo(x + 0.25, H);
  }
  for (let y = 49; y < H; y += 39) {
    ctx.moveTo(0, y + 0.25);
    ctx.lineTo(W, y + 0.25);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(157,184,217,0.2)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let x = 39; x < W; x += 39) {
    for (let y = 49; y < H; y += 39) {
      ctx.moveTo(x - 2.5, y);
      ctx.lineTo(x + 2.5, y);
      ctx.moveTo(x, y - 2.5);
      ctx.lineTo(x, y + 2.5);
    }
  }
  ctx.stroke();
  ctx.restore();

  blurredShape(g, 'rgba(38,78,112,0.38)', 16, paths.allLand);
  blurredShape(g, 'rgba(46,92,130,0.22)', 5, paths.allLand);

  for (const [d, a] of [
    [7, 0.11],
    [15, 0.06],
  ] as const) {
    const l = makeLayer(k);
    l.ctx.lineJoin = 'round';
    l.ctx.strokeStyle = `rgba(157,184,217,${a})`;
    l.ctx.lineWidth = d * 2 + 0.7;
    l.ctx.stroke(paths.allLand);
    l.ctx.globalCompositeOperation = 'destination-out';
    l.ctx.lineWidth = d * 2 - 0.7;
    l.ctx.stroke(paths.allLand);
    l.ctx.fill(paths.allLand);
    ctx.drawImage(l.canvas, 0, 0, W, H);
  }

  // Layer 5: the plates sit on the glass with a soft contact shadow (the plates cover the shape).
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 7 * k;
  ctx.shadowOffsetY = 2.5 * k;
  ctx.fillStyle = css(SEA);
  ctx.fill(paths.allLand);
  ctx.restore();
}

/**
 * Layer 7: faint isolines of a seeded value-noise field, clipped to the land (two octaves: 0.7 on a
 * 34 pt grid, 0.3 on a finer one; levels .38 to .70; marching squares on 3 pt cells).
 */
export function paintTerrain(g: Gfx): void {
  const { ctx } = g;
  const rnd = mulberry32(4242);
  const G = 34;
  const gw = Math.ceil(W / G) + 2;
  const gh = Math.ceil(H / G) + 2;
  const grid = Float32Array.from({ length: gw * gh }, () => rnd());
  const val = (x: number, y: number) => {
    const gx = x / G;
    const gy = y / G;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = gx - ix;
    const fy = gy - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const at = (i: number, j: number) => grid[(iy + j) * gw + (ix + i)];
    const a = at(0, 0) * (1 - sx) + at(1, 0) * sx;
    const b = at(0, 1) * (1 - sx) + at(1, 1) * sx;
    return a * (1 - sy) + b * sy;
  };
  const field = (x: number, y: number) => 0.7 * val(x, y) + 0.3 * val(x * 2.3 + 91, y * 2.3 + 37);
  const S = 3;
  const nx = Math.ceil(W / S);
  const ny = Math.ceil(H / S);
  const F = new Float32Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) F[j * (nx + 1) + i] = field(i * S, j * S);
  const path = new Path2D();
  const pts: number[] = [];
  for (const lv of [0.38, 0.46, 0.54, 0.62, 0.7]) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const v0 = F[j * (nx + 1) + i];
        const v1 = F[j * (nx + 1) + i + 1];
        const v2 = F[(j + 1) * (nx + 1) + i + 1];
        const v3 = F[(j + 1) * (nx + 1) + i];
        const x = i * S;
        const y = j * S;
        pts.length = 0;
        const edge = (a: number, b: number, ax: number, ay: number, bx: number, by: number) => {
          if (a < lv !== b < lv) {
            const t = (lv - a) / (b - a);
            pts.push(ax + (bx - ax) * t, ay + (by - ay) * t);
          }
        };
        edge(v0, v1, x, y, x + S, y);
        edge(v1, v2, x + S, y, x + S, y + S);
        edge(v2, v3, x + S, y + S, x, y + S);
        edge(v3, v0, x, y + S, x, y);
        for (let p = 0; p + 3 < pts.length; p += 4) {
          path.moveTo(pts[p], pts[p + 1]);
          path.lineTo(pts[p + 2], pts[p + 3]);
        }
      }
    }
  }
  ctx.save();
  ctx.clip(getPaths().allLand);
  ctx.strokeStyle = 'rgba(233,226,210,0.07)';
  ctx.lineWidth = 0.6;
  ctx.stroke(path);
  ctx.restore();
}

/** Bearing strip at map y 0-10: ticks every 39 pt and 'W — SCORING —▸ E' (pins score west to east). */
function paintBearing(ctx: Ctx): void {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, 12);
  g.addColorStop(0, 'rgba(4,7,11,0.85)');
  g.addColorStop(1, 'rgba(4,7,11,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 10);
  ctx.fillStyle = 'rgba(233,226,210,0.08)';
  ctx.fillRect(0, 10, W, 0.6);
  ctx.strokeStyle = 'rgba(233,226,210,0.32)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 39) {
    ctx.moveTo(x + 0.35, 10);
    ctx.lineTo(x + 0.35, 5);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(233,226,210,0.16)';
  ctx.beginPath();
  for (let x = 13; x < W; x += 13) {
    if (x % 39 === 0) continue;
    ctx.moveTo(x + 0.35, 10);
    ctx.lineTo(x + 0.35, 7.5);
  }
  ctx.stroke();
  const cx = W / 2;
  ctx.fillStyle = 'rgba(4,7,11,0.95)';
  ctx.fillRect(cx - 62, 0, 124, 10);
  const ls = 'rgba(233,226,210,0.42)';
  const font = `600 8px ${FONT_LABEL}`;
  text(ctx, 'W', cx - 55, 5.4, { font, color: ls });
  text(ctx, 'SCORING', cx, 5.4, { font, color: ls, tracking: 1.4 });
  text(ctx, 'E', cx + 55, 5.4, { font, color: ls });
  ctx.strokeStyle = ls;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - 49, 5);
  ctx.lineTo(cx - 25, 5);
  ctx.moveTo(cx + 25, 5);
  ctx.lineTo(cx + 48, 5);
  ctx.stroke();
  ctx.fillStyle = ls;
  ctx.beginPath();
  ctx.moveTo(cx + 49.5, 5);
  ctx.lineTo(cx + 46, 3);
  ctx.lineTo(cx + 46, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

let noise: HTMLCanvasElement | null = null;
function noiseTile(): HTMLCanvasElement {
  if (noise) return noise;
  const c = document.createElement('canvas');
  c.width = c.height = 192;
  const x = c.getContext('2d')!;
  const img = x.createImageData(192, 192);
  const rnd = mulberry32(77);
  for (let i = 0; i < img.data.length; i += 4) {
    const on = rnd() > 0.5 ? 255 : 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = on;
    img.data[i + 3] = Math.floor(rnd() * 22);
  }
  x.putImageData(img, 0, 0);
  noise = c;
  return c;
}

/** Layer 15: bearing strip, then grain (one speck per device pixel), sheen, vignette, rail shadow. */
export function paintGlass(g: Gfx): void {
  const { ctx, k } = g;
  paintBearing(ctx);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(noiseTile(), 'repeat')!;
  ctx.fillRect(0, 0, W * k, H * k);
  ctx.restore();
  ctx.save();
  const sheen = ctx.createLinearGradient(0, 0, W * 0.7, H * 0.55);
  sheen.addColorStop(0, 'rgba(220,235,255,0.05)');
  sheen.addColorStop(0.45, 'rgba(220,235,255,0.012)');
  sheen.addColorStop(1, 'rgba(220,235,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.36, W / 2, H * 0.48, H * 0.78);
  v.addColorStop(0, 'rgba(3,6,10,0)');
  v.addColorStop(1, 'rgba(3,6,10,0.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const rail = ctx.createLinearGradient(0, 10, 0, 26);
  rail.addColorStop(0, 'rgba(0,0,0,0.35)');
  rail.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rail;
  ctx.fillRect(0, 10, W, 16);
  ctx.restore();
}
