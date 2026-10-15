/**
 * Layers that never change once baked at a given backing scale: the sea with its soft backlight
 * and the land's shelf and contact shadow; and the glass finish over everything (a little grain,
 * a vignette). Calm and quiet: the map is a chart on a table, not a console.
 */
import { MAP_H as H, MAP_W as W } from '../data';
import type { Gfx } from '../draw';
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

/** The sea, a faint pool of light under the middle, the land's shelf halo and contact shadow. */
export function paintSea(g: Gfx): void {
  const { ctx, k } = g;
  const paths = getPaths();
  ctx.fillStyle = css(SEA);
  ctx.fillRect(0, 0, W, H);
  const pool = ctx.createRadialGradient(W * 0.5, H * 0.48, 10, W * 0.5, H * 0.48, H * 0.62);
  pool.addColorStop(0, 'rgba(40,74,108,0.42)');
  pool.addColorStop(0.65, 'rgba(24,46,70,0.16)');
  pool.addColorStop(1, 'rgba(24,46,70,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, W, H);

  blurredShape(g, 'rgba(60,110,150,0.3)', 14, paths.allLand);
  blurredShape(g, 'rgba(70,120,160,0.18)', 4, paths.allLand);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6 * k;
  ctx.shadowOffsetY = 2 * k;
  ctx.fillStyle = css(SEA);
  ctx.fill(paths.allLand);
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
    img.data[i + 3] = Math.floor(rnd() * 16);
  }
  x.putImageData(img, 0, 0);
  noise = c;
  return c;
}

/** A little grain (one speck per device pixel): paper under glass. No vignette: the map has no edge. */
export function paintGlass(g: Gfx): void {
  const { ctx, k } = g;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = ctx.createPattern(noiseTile(), 'repeat')!;
  ctx.fillRect(0, 0, W * k, H * k);
  ctx.restore();
}
