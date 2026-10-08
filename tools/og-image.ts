/**
 * Generates public/og-image.png (1200×630) at build time. The image changes daily:
 * it carries the Daily number (days since 2026-09-28, 1-based), the day's seat and
 * the UTC date, so a shared link always previews today's crisis.
 *
 * Also runs the icon generator (tools/icons.ts) so `npm run og` produces every
 * raster asset the build needs.
 *
 * Rendering: an SVG string rasterised with @resvg/resvg-js. If the native binding
 * is unavailable the script writes public/og-image.svg and copies the committed
 * tools/assets/og-fallback.png into place (or software-renders a PNG if even that
 * is missing). The build never breaks on this step.
 *
 * CLI:
 *   npx tsx tools/og-image.ts                    today (UTC)
 *   npx tsx tools/og-image.ts --date 2026-09-28  deterministic (tests, previews)
 *   npx tsx tools/og-image.ts --svg              also write public/og-image.svg
 *   npx tsx tools/og-image.ts --out <file.png>   write somewhere else
 *   npx tsx tools/og-image.ts --write-fallback   regenerate tools/assets/og-fallback.png
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND } from '../src/config';
import {
  Canvas,
  NAVY,
  OFF_WHITE,
  PUBLIC_DIR,
  ROOT,
  drawMark,
  generateIcons,
  hex,
  isPng,
  loadResvg,
  resvgLoadError,
} from './icons';

export const WIDTH = 1200;
export const HEIGHT = 630;

/** Launch day: Daily #1. */
export const DAILY_EPOCH_UTC = Date.UTC(2026, 8, 28);
export const FALLBACK_PNG = join(ROOT, 'tools', 'assets', 'og-fallback.png');

export type Seat = 'republic' | 'federation' | 'coalition';
export const SEATS: readonly Seat[] = ['republic', 'federation', 'coalition'];
export const SEAT_META: Record<Seat, { name: string; accent: string }> = {
  republic: { name: 'The Republic', accent: '#4f8fc9' },
  federation: { name: 'The Federation', accent: '#c43a3a' },
  coalition: { name: 'The Coalition', accent: '#c98a3a' },
};

const MUTED = '#b8bfcc';
const DIM = '#3a4358';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ------------------------------------------------------------ daily maths */

export interface Daily {
  /** UTC calendar date at 00:00Z. */
  date: Date;
  iso: string;
  /** 1 on 2026-09-28, clamped to ≥ 1 before launch. */
  number: number;
  seat: Seat;
}

export function parseIsoDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) throw new Error(`--date must be YYYY-MM-DD, got "${s}"`);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (Number.isNaN(d.getTime())) throw new Error(`invalid date "${s}"`);
  return d;
}

export function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function dailyFor(input: Date): Daily {
  const date = utcMidnight(input);
  const days = Math.floor((date.getTime() - DAILY_EPOCH_UTC) / 86_400_000);
  const number = Math.max(1, days + 1);
  const seat = SEATS[(number - 1) % SEATS.length];
  return { date, iso: date.toISOString().slice(0, 10), number, seat };
}

export function formatDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** mulberry32: small seeded PRNG for the procedural texture. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ------------------------------------------------------------ SVG */

export interface OgOptions {
  /** 'daily' prints "Daily #N · Seat · date"; 'fallback' is undated for the committed PNG. */
  variant?: 'daily' | 'fallback';
  /** The hotel: tonight's Booking in place of the seat, brass in place of the seat's accent, the gauge relabelled. */
  label?: string;
  accent?: string;
  gaugeLabel?: string;
  gaugeValue?: string;
  tagline?: string;
  footer?: string;
}

/** Gauge reading for the day, 0..1, kept in the tense upper band so the needle always looks like trouble. */
export function gaugeLevel(daily: Daily): number {
  const r = rng(daily.number * 7919 + 17);
  return 0.58 + r() * 0.34;
}

export function buildOgSvg(daily: Daily, opts: OgOptions = {}): string {
  const variant = opts.variant ?? 'daily';
  const seat = SEAT_META[daily.seat];
  const accent = opts.accent ?? (variant === 'daily' ? seat.accent : '#e03b3b');
  const random = rng(daily.number);

  // Procedural scanlines: 1px every 4px, opacity jittered per line so the texture is never a flat pattern.
  const scan: string[] = [];
  for (let y = 0; y < HEIGHT; y += 4) {
    const o = 0.025 + random() * 0.05;
    scan.push(`<rect x="0" y="${y}" width="${WIDTH}" height="1" fill="#ffffff" fill-opacity="${o.toFixed(3)}"/>`);
  }
  // A few brighter drifting lines, like a phosphor glitch.
  for (let i = 0; i < 3; i++) {
    const y = Math.floor(random() * HEIGHT);
    scan.push(`<rect x="0" y="${y}" width="${WIDTH}" height="2" fill="${accent}" fill-opacity="0.10"/>`);
  }

  // Gauge: 240° sweep from 240° (bottom-left) clockwise to 120° (bottom-right), 0 at 12 o'clock.
  const gx = 960;
  const gy = 330;
  const gr = 150;
  const start = -120;
  const sweep = 240;
  const level = gaugeLevel(daily);
  const toXY = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return [gx + r * Math.sin(a), gy - r * Math.cos(a)] as const;
  };
  const arcPath = (a0: number, a1: number, r: number) => {
    const [x0, y0] = toXY(a0, r);
    const [x1, y1] = toXY(a1, r);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  const needleDeg = start + sweep * level;
  const [nx, ny] = toXY(needleDeg, gr - 26);
  const [nbx, nby] = toXY(needleDeg + 180, 18);
  const ticks: string[] = [];
  for (let i = 0; i <= 12; i++) {
    const deg = start + (sweep * i) / 12;
    const major = i % 3 === 0;
    const [tx0, ty0] = toXY(deg, gr + 10);
    const [tx1, ty1] = toXY(deg, gr + (major ? 26 : 18));
    const hot = deg > start + sweep * 0.75;
    ticks.push(
      `<line x1="${tx0.toFixed(2)}" y1="${ty0.toFixed(2)}" x2="${tx1.toFixed(2)}" y2="${ty1.toFixed(2)}" stroke="${hot ? accent : MUTED}" stroke-opacity="${major ? 0.9 : 0.5}" stroke-width="${major ? 3 : 2}"/>`,
    );
  }
  // Red zone: last quarter of the sweep.
  const redZone = arcPath(start + sweep * 0.75, start + sweep, gr);
  const filled = arcPath(start, needleDeg, gr);
  const pct = Math.round(level * 100);

  const meta =
    variant === 'daily'
      ? `Tonight #${daily.number} · ${opts.label ?? seat.name} · ${formatDate(daily.date)}`
      : 'The same night for everyone · One attempt · About two minutes';

  // A long tagline breaks at its first full stop so it never runs into the gauge.
  const tagline = opts.tagline ?? "It's 3am. The phone is ringing.";
  const stop = tagline.indexOf('. ');
  const taglineLines = tagline.length > 34 && stop > 0 ? [tagline.slice(0, stop + 1), tagline.slice(stop + 2)] : [tagline];
  const serif = `'Liberation Serif', 'DejaVu Serif', Georgia, 'Times New Roman', serif`;
  const mono = `'DejaVu Sans Mono', 'Liberation Mono', Menlo, Consolas, monospace`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`,
    `<defs>`,
    `<radialGradient id="glow" cx="0.78" cy="0.5" r="0.75"><stop offset="0" stop-color="#16213a"/><stop offset="1" stop-color="${NAVY}"/></radialGradient>`,
    `<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NAVY}" stop-opacity="0"/><stop offset="1" stop-color="${NAVY}" stop-opacity="0.85"/></linearGradient>`,
    `</defs>`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>`,
    `<g>${scan.join('')}</g>`,
    `<rect x="0" y="${HEIGHT - 160}" width="${WIDTH}" height="160" fill="url(#fade)"/>`,
    // Seat accent bar and frame.
    `<rect x="0" y="0" width="10" height="${HEIGHT}" fill="${accent}"/>`,
    `<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" fill="none" stroke="${OFF_WHITE}" stroke-opacity="0.12"/>`,
    // Gauge.
    `<path d="${arcPath(start, start + sweep, gr)}" fill="none" stroke="${DIM}" stroke-width="14" stroke-linecap="butt"/>`,
    `<path d="${redZone}" fill="none" stroke="#e03b3b" stroke-opacity="0.55" stroke-width="14"/>`,
    `<path d="${filled}" fill="none" stroke="${accent}" stroke-width="14"/>`,
    `<g>${ticks.join('')}</g>`,
    `<line x1="${nbx.toFixed(2)}" y1="${nby.toFixed(2)}" x2="${nx.toFixed(2)}" y2="${ny.toFixed(2)}" stroke="${OFF_WHITE}" stroke-width="4" stroke-linecap="round"/>`,
    `<circle cx="${gx}" cy="${gy}" r="9" fill="${OFF_WHITE}"/>`,
    `<circle cx="${gx}" cy="${gy}" r="4" fill="${NAVY}"/>`,
    `<text x="${gx}" y="${gy + 78}" font-family="${mono}" font-size="20" fill="${MUTED}" text-anchor="middle" letter-spacing="4">${esc(opts.gaugeLabel ?? 'DANGER')}</text>`,
    `<text x="${gx}" y="${gy + 118}" font-family="${mono}" font-size="34" font-weight="bold" fill="${accent}" text-anchor="middle">${esc(opts.gaugeValue ?? `${pct}%`)}</text>`,
    // Copy.
    `<text x="72" y="300" font-family="${serif}" font-size="210" font-weight="bold" fill="${OFF_WHITE}" letter-spacing="14">${esc(BRAND.name)}</text>`,
    `<rect x="76" y="330" width="120" height="3" fill="${accent}"/>`,
    ...taglineLines.map((line, i) => `<text x="76" y="${392 + i * 42}" font-family="${mono}" font-size="34" fill="${MUTED}">${esc(line)}</text>`),
    `<text x="76" y="${452 + (taglineLines.length - 1) * 42}" font-family="${mono}" font-size="26" fill="${accent}" letter-spacing="1">${esc(meta)}</text>`,
    `<text x="76" y="${HEIGHT - 44}" font-family="${mono}" font-size="18" fill="${MUTED}" fill-opacity="0.7" letter-spacing="3">${esc(opts.footer ?? 'KEEP FIVE DIALS OFF THE EDGES · MAKE IT TO DAWN')}</text>`,
    `</svg>`,
  ].join('\n');
}

/* ------------------------------------------------------------ software fallback */

/** Last-resort raster: navy field, scanlines, accent bar and the mark. No text (no font engine). */
export function softwareOgPng(daily: Daily): Buffer {
  const cv = new Canvas(WIDTH, HEIGHT, hex(NAVY));
  const random = rng(daily.number);
  const white = hex('#ffffff');
  for (let y = 0; y < HEIGHT; y += 4) cv.hline(y, white, 0.025 + random() * 0.05);
  cv.rect(0, 0, 10, HEIGHT, hex(SEAT_META[daily.seat].accent));
  drawMark(cv, 960, 315, 420);
  // Short rule where the wordmark would sit, so the fallback still reads as designed rather than blank.
  cv.rect(76, 330, 120, 3, hex(SEAT_META[daily.seat].accent));
  return cv.toPng();
}

/* ------------------------------------------------------------ generation */

export interface OgResult {
  method: 'resvg' | 'fallback-png' | 'software';
  out: string;
  svgOut: string | null;
  daily: Daily;
  bytes: number;
}

/**
 * What the pack says tonight is. The hotel names the Booking and paints in brass; a crisis pack
 * keeps the seat. Never throws: a pack that fails to load leaves the crisis defaults.
 */
export async function packOptions(daily: Daily): Promise<OgOptions> {
  try {
    const [{ loadContent }, { bookingForSeed }] = await Promise.all([import('./load'), import('../src/engine/run')]);
    const { content } = loadContent();
    if (content.voice !== 'hotel') return {};
    const seats = Object.keys(content.seats);
    const seatId = (seats.length === 1 ? seats[0] : daily.seat) as keyof typeof content.seats;
    const booking = bookingForSeed(content, `daily-${daily.iso}`, seatId, 5);
    return {
      label: booking ? booking.name.toUpperCase() : (content.seats[seatId]?.name ?? 'The Brink'),
      accent: '#c9a24a',
      gaugeLabel: 'THE NIGHT',
      gaugeValue: '3:00',
      tagline: BRAND.tagline,
      footer: 'KEEP FOUR BARS OFF THE FLOOR UNTIL 6:00 · A GUEST WRITES YOUR REVIEW',
    };
  } catch {
    return {};
  }
}

export async function generateOgImage(opts: { date?: Date; out?: string; writeSvg?: boolean; variant?: 'daily' | 'fallback'; pack?: OgOptions } = {}): Promise<OgResult> {
  const daily = dailyFor(opts.date ?? new Date());
  const out = resolve(opts.out ?? join(PUBLIC_DIR, 'og-image.png'));
  const svgOut = out.replace(/\.png$/i, '.svg');
  mkdirSync(resolve(out, '..'), { recursive: true });
  const svg = buildOgSvg(daily, { ...(opts.pack ?? {}), variant: opts.variant });

  const resvg = await loadResvg();
  let method: OgResult['method'];
  let png: Buffer | null = null;
  if (resvg) {
    try {
      png = resvg.render(svg, { width: WIDTH });
      method = 'resvg';
    } catch (err) {
      console.warn(`[og] resvg render failed: ${(err as Error).message}`);
    }
  }
  let wroteSvg = false;
  if (!png) {
    // Fallback path: ship the SVG for anyone who can use it, and a committed PNG for the rest.
    writeFileSync(svgOut, svg);
    wroteSvg = true;
    if (existsSync(FALLBACK_PNG) && isPng(readFileSync(FALLBACK_PNG))) {
      copyFileSync(FALLBACK_PNG, out);
      png = readFileSync(out);
      method = 'fallback-png';
    } else {
      png = softwareOgPng(daily);
      method = 'software';
    }
  }
  if (opts.writeSvg && !wroteSvg) {
    writeFileSync(svgOut, svg);
    wroteSvg = true;
  }
  writeFileSync(out, png);
  return { method: method!, out, svgOut: wroteSvg ? svgOut : null, daily, bytes: png.length };
}

/* ------------------------------------------------------------ CLI */

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const rel = (p: string) => (p.startsWith(ROOT) ? p.slice(ROOT.length + 1) : p);
  const dateArg = arg('--date');
  const date = dateArg ? parseIsoDate(dateArg) : new Date();
  const writeSvg = process.argv.includes('--svg');

  // Icons first: `npm run og` is the one raster step in `npm run build`.
  await generateIcons();

  if (process.argv.includes('--write-fallback')) {
    const r = await generateOgImage({ date, out: FALLBACK_PNG, variant: 'fallback' });
    console.log(`[og] fallback ${rel(r.out)}  ${(r.bytes / 1024).toFixed(1)} KB  via ${r.method}`);
    if (r.method !== 'resvg') console.warn('[og] note: resvg was unavailable, so the fallback PNG has no text');
  }

  const pack = await packOptions(dailyFor(date));
  const r = await generateOgImage({ date, out: arg('--out'), writeSvg, pack });
  const seat = pack.label ?? SEAT_META[r.daily.seat].name;
  console.log(`[og] Daily #${r.daily.number} · ${seat} · ${r.daily.iso}${dateArg ? '  (fixed by --date)' : '  (UTC today)'}`);
  switch (r.method) {
    case 'resvg':
      console.log(`[og] rendered ${rel(r.out)} ${WIDTH}×${HEIGHT} with resvg  ${(r.bytes / 1024).toFixed(1)} KB`);
      break;
    case 'fallback-png':
      console.log(`[og] resvg unavailable (${resvgLoadError() ?? 'unknown'}): wrote ${rel(r.svgOut!)} and copied ${rel(FALLBACK_PNG)} to ${rel(r.out)}`);
      break;
    case 'software':
      console.log(`[og] resvg unavailable (${resvgLoadError() ?? 'unknown'}) and no ${rel(FALLBACK_PNG)}: wrote ${rel(r.svgOut!)} and software-rendered ${rel(r.out)}`);
      break;
  }
  if (r.svgOut && r.method === 'resvg') console.log(`[og] also wrote ${rel(r.svgOut)}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error('[og] failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
