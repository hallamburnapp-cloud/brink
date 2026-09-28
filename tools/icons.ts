/**
 * Rasterises public/icons/icon.svg to the PNG sizes the PWA manifest and iOS expect.
 *
 *   public/icons/icon-192.png          (manifest)
 *   public/icons/icon-512.png          (manifest, maskable)
 *   public/icons/apple-touch-icon.png  (180×180)
 *
 * Rendering uses @resvg/resvg-js (native binary). If the binding cannot be loaded
 * on this machine, a hand-written PNG encoder (zlib + CRC-32) draws the BRINK mark
 * directly into pixels so the build never breaks. If the art team's icon.svg (and
 * favicon.svg) do not exist yet, a minimal placeholder mark is written for them.
 *
 * CLI: npx tsx tools/icons.ts     (also run by `npm run og` via tools/og-image.ts)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { crc32 } from './zip';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_DIR = join(ROOT, 'public');
export const ICONS_DIR = join(PUBLIC_DIR, 'icons');

export const NAVY = '#0b1220';
export const OFF_WHITE = '#e8e4d8';
export const RED = '#e03b3b';

/* ------------------------------------------------------------ the mark */

/**
 * Minimal BRINK mark: thin off-white ring on navy, red arc at the top-right.
 * Used only when public/icons/icon.svg is absent (the art team owns the real one).
 */
export function minimalMarkSvg(size = 512): string {
  const c = size / 2;
  const r = size * 0.32;
  const stroke = Math.max(2, size * 0.035);
  // Arc from -10° to +80° measured from 12 o'clock, clockwise: the top-right quadrant.
  const a0 = (-10 * Math.PI) / 180;
  const a1 = (80 * Math.PI) / 180;
  const p = (a: number) => `${(c + r * Math.sin(a)).toFixed(2)} ${(c - r * Math.cos(a)).toFixed(2)}`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect width="${size}" height="${size}" fill="${NAVY}"/>`,
    `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${OFF_WHITE}" stroke-opacity="0.9" stroke-width="${stroke}"/>`,
    `<path d="M ${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)}" fill="none" stroke="${RED}" stroke-width="${stroke * 1.6}" stroke-linecap="round"/>`,
    `</svg>`,
  ].join('');
}

/* ------------------------------------------------------------ PNG encoder */

/** Encode an RGBA8 pixel buffer as a PNG (colour type 6, no interlace) using only node:zlib. */
export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  if (rgba.length !== width * height * 4) throw new Error('encodePng: buffer size does not match dimensions');
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // filter: none
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), rowStart + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** True when `buf` starts with the 8-byte PNG signature. */
export function isPng(buf: Uint8Array): boolean {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return buf.length >= 8 && sig.every((b, i) => buf[i] === b);
}

/* ------------------------------------------------------------ software raster */

export type Rgb = [number, number, number];
export const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Tiny RGBA canvas with a few anti-aliased primitives; enough to draw the mark without a renderer. */
export class Canvas {
  readonly data: Uint8Array;
  constructor(
    readonly width: number,
    readonly height: number,
    fill: Rgb,
  ) {
    this.data = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      this.data[i * 4] = fill[0];
      this.data[i * 4 + 1] = fill[1];
      this.data[i * 4 + 2] = fill[2];
      this.data[i * 4 + 3] = 255;
    }
  }
  blend(x: number, y: number, c: Rgb, a: number) {
    if (a <= 0 || x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (y * this.width + x) * 4;
    const d = this.data;
    d[i] = Math.round(d[i] + (c[0] - d[i]) * a);
    d[i + 1] = Math.round(d[i + 1] + (c[1] - d[i + 1]) * a);
    d[i + 2] = Math.round(d[i + 2] + (c[2] - d[i + 2]) * a);
  }
  /** Horizontal 1px line at `y` with alpha `a` (used for scanlines). */
  hline(y: number, c: Rgb, a: number) {
    for (let x = 0; x < this.width; x++) this.blend(x, y, c, a);
  }
  /** Filled axis-aligned rectangle. */
  rect(x0: number, y0: number, w: number, h: number, c: Rgb, a = 1) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.blend(x, y, c, a);
  }
  /**
   * Anti-aliased ring segment. Angles are degrees clockwise from 12 o'clock;
   * pass a0=0, a1=360 for a full ring.
   */
  arc(cx: number, cy: number, r: number, thickness: number, a0: number, a1: number, c: Rgb, alpha = 1) {
    const rIn = r - thickness / 2;
    const rOut = r + thickness / 2;
    const x0 = Math.max(0, Math.floor(cx - rOut - 1));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + rOut + 1));
    const y0 = Math.max(0, Math.floor(cy - rOut - 1));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + rOut + 1));
    const full = a1 - a0 >= 360;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const d = Math.hypot(dx, dy);
        // coverage across the ring edges (1px feather)
        const cov = Math.min(1, Math.max(0, d - rIn + 0.5)) * Math.min(1, Math.max(0, rOut - d + 0.5));
        if (cov <= 0) continue;
        if (!full) {
          let ang = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 at 12 o'clock, clockwise
          if (ang < 0) ang += 360;
          const s = ((a0 % 360) + 360) % 360;
          const e = s + (a1 - a0);
          const inArc = ang >= s && ang <= e ? true : ang + 360 >= s && ang + 360 <= e;
          if (!inArc) continue;
        }
        this.blend(x, y, c, cov * alpha);
      }
    }
  }
  toPng(): Buffer {
    return encodePng(this.width, this.height, this.data);
  }
}

/** Draws the minimal mark into a Canvas (same geometry as minimalMarkSvg). */
export function drawMark(cv: Canvas, cx: number, cy: number, size: number) {
  const r = size * 0.32;
  const stroke = Math.max(2, size * 0.035);
  cv.arc(cx, cy, r, stroke, 0, 360, hex(OFF_WHITE), 0.9);
  cv.arc(cx, cy, r, stroke * 1.6, -10, 80, hex(RED), 1);
}

/** Software-rendered square icon of the mark at `size`. */
export function rasterMarkPng(size: number): Buffer {
  const cv = new Canvas(size, size, hex(NAVY));
  drawMark(cv, size / 2, size / 2, size);
  return cv.toPng();
}

/* ------------------------------------------------------------ resvg loader */

export interface ResvgLike {
  render(svg: string, opts: { width?: number; height?: number }): Buffer;
}

let cached: ResvgLike | null | undefined;
let loadError: string | null = null;

/**
 * Loads @resvg/resvg-js lazily. Returns null (and remembers why) if the native
 * binding is missing for this platform so callers can fall back.
 */
export async function loadResvg(): Promise<ResvgLike | null> {
  if (cached !== undefined) return cached;
  try {
    // BRINK_NO_RESVG=1 exercises the fallback path on a machine where resvg works.
    if (process.env.BRINK_NO_RESVG) throw new Error('disabled by BRINK_NO_RESVG');
    const mod = (await import('@resvg/resvg-js')) as typeof import('@resvg/resvg-js');
    const { Resvg } = mod;
    // Smoke test: a 2×2 render proves the binary actually executes, not just resolves.
    new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>').render().asPng();
    cached = {
      render(svg, { width, height }) {
        const fitTo = width ? ({ mode: 'width', value: width } as const) : height ? ({ mode: 'height', value: height } as const) : ({ mode: 'original' } as const);
        const r = new Resvg(svg, {
          fitTo,
          font: {
            loadSystemFonts: true,
            // Generic families in the SVG resolve to these when present; resvg falls back otherwise.
            serifFamily: 'Liberation Serif',
            monospaceFamily: 'DejaVu Sans Mono',
            sansSerifFamily: 'Liberation Sans',
          },
          logLevel: 'off',
        });
        return r.render().asPng();
      },
    };
  } catch (err) {
    loadError = err instanceof Error ? err.message.split('\n')[0] : String(err);
    cached = null;
  }
  return cached;
}

export function resvgLoadError(): string | null {
  return loadError;
}

/* ------------------------------------------------------------ generator */

export interface IconTarget {
  file: string;
  size: number;
}

export const ICON_TARGETS: IconTarget[] = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

export interface IconsReport {
  renderer: 'resvg' | 'software';
  wroteSourceSvg: boolean;
  wroteFavicon: boolean;
  files: { path: string; bytes: number }[];
}

/**
 * Generates the PNG icons. Never throws for renderer problems: falls back to the
 * software raster so `npm run build` cannot fail on icon generation.
 */
export async function generateIcons(opts: { iconsDir?: string; publicDir?: string; quiet?: boolean } = {}): Promise<IconsReport> {
  const publicDir = opts.publicDir ?? PUBLIC_DIR;
  const iconsDir = opts.iconsDir ?? join(publicDir, 'icons');
  mkdirSync(iconsDir, { recursive: true });

  const svgPath = join(iconsDir, 'icon.svg');
  const faviconPath = join(publicDir, 'favicon.svg');
  let wroteSourceSvg = false;
  let wroteFavicon = false;
  if (!existsSync(svgPath)) {
    writeFileSync(svgPath, minimalMarkSvg(512));
    wroteSourceSvg = true;
  }
  if (!existsSync(faviconPath)) {
    writeFileSync(faviconPath, minimalMarkSvg(64));
    wroteFavicon = true;
  }
  const svg = readFileSync(svgPath, 'utf8');

  const resvg = await loadResvg();
  const files: IconsReport['files'] = [];
  for (const t of ICON_TARGETS) {
    let png: Buffer;
    if (resvg) {
      try {
        png = resvg.render(svg, { width: t.size });
      } catch (err) {
        if (!opts.quiet) console.warn(`[icons] resvg failed on ${t.file} (${(err as Error).message}); using software raster`);
        png = rasterMarkPng(t.size);
      }
    } else {
      png = rasterMarkPng(t.size);
    }
    const out = join(iconsDir, t.file);
    writeFileSync(out, png);
    files.push({ path: out, bytes: png.length });
  }

  const report: IconsReport = { renderer: resvg ? 'resvg' : 'software', wroteSourceSvg, wroteFavicon, files };
  if (!opts.quiet) printIconsReport(report);
  return report;
}

export function printIconsReport(r: IconsReport) {
  const rel = (p: string) => p.startsWith(ROOT) ? p.slice(ROOT.length + 1) : p;
  if (r.wroteSourceSvg) console.log('[icons] public/icons/icon.svg was missing: wrote placeholder mark (art team may replace it)');
  if (r.wroteFavicon) console.log('[icons] public/favicon.svg was missing: wrote placeholder mark');
  if (r.renderer === 'software') console.log(`[icons] resvg unavailable (${resvgLoadError() ?? 'unknown'}); drew the mark with the built-in PNG encoder`);
  for (const f of r.files) console.log(`[icons] ${rel(f.path)}  ${(f.bytes / 1024).toFixed(1)} KB  (${r.renderer})`);
}

/* ------------------------------------------------------------ CLI */

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  generateIcons().catch((err) => {
    console.error('[icons] failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
