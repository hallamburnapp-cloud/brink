/**
 * BRINK — sharing module.
 *
 * Three layers, all pure except where the browser is unavoidable:
 *  - `emojiStrip` / `shareText` / `summariseMoment` are plain functions (unit-tested in Node).
 *  - `renderShareCard` paints a 1080×1350 PNG with Canvas 2D and rejects cleanly when
 *    there is no document (SSR, tests, workers).
 *  - `share` / `downloadBlob` drive the Web Share API with graceful fallbacks and never throw.
 *
 * Usage note for the ending screen: render the PNG when the screen mounts and hand the Blob
 * to `share()` from the click handler. Awaiting a canvas render inside the handler can
 * outlive the user-activation window and make `navigator.share` refuse.
 */
import { BRAND } from '../config';
import type { EndingKind, Mode } from '../engine/types';

export interface ShareCardData {
  brand: string; // 'BRINK' (from config; do not hardcode)
  url: string; // public URL
  seatName: string; // 'The Republic'
  seatAccent: string; // hex
  days: number; // days survived
  endingName: string; // 'Midnight'
  endingEmoji: string;
  endingKind: EndingKind;
  momentLabel: string; // 'The moment it went wrong'
  moment: string | null; // one-line description of the card (already resolved text, ≤ 90 chars)
  trail: number[][]; // meter snapshots per card: [public, military, allies, economy, escalation]
  seed: string;
  mode: Mode;
  dailyNumber?: number; // e.g. 12 → "BRINK #12"
  streak?: number;
  pieces?: string[]; // display names of held pieces (≤ 4 shown)
  /** Total leverage scored (the run's score). Expert only; omitted for the night. */
  score?: number;
  /** The night's clock at the end ("6:00" at dawn, the time of the fall otherwise). Simple ruleset only. */
  clock?: string;
  /** True when the night reached dawn. */
  dawn?: boolean;
  /** Endless acts survived past the Endgame. */
  endlessActs?: number;
}

function scoreLabel(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ------------------------------------------------------------------ constants

const METER_LABELS = ['PUBLIC', 'MILITARY', 'ALLIES', 'ECONOMY', 'ESCALATION'] as const;
const ESCALATION_ROW = 4;
const DEFAULT_COLUMNS = 10;
const MOMENT_MAX = 90;
const MAX_PIECES = 4;

type BandEmoji = '🟥' | '🟧' | '🟨' | '🟩' | '🟦';
/** Band 0 (0–20) … band 4 (81–100) for office meters, where high is good. */
const OFFICE_BANDS: readonly BandEmoji[] = ['🟥', '🟧', '🟨', '🟩', '🟦'];
/** Inverted for escalation, where low is good. */
const ESCALATION_BANDS: readonly BandEmoji[] = ['🟦', '🟩', '🟨', '🟧', '🟥'];
const EMPTY_CELL = '⬛';

const BAND_HEX: Record<BandEmoji, string> = {
  '🟥': '#e03b3b',
  '🟧': '#e08a3b',
  '🟨': '#e0c43b',
  '🟩': '#5cbf6f',
  '🟦': '#4f8fc9',
};
const EMPTY_HEX = '#c9c3b3';

const KIND_LABEL: Record<EndingKind, string> = {
  nuclear: 'Nuclear',
  removed: 'Removed',
  standdown: 'Stand-Down',
  survival: 'Survived',
  special: 'Special',
};
/** Endings that read as a loss get the red stamp; the rest are muted. */
const RED_KINDS: ReadonlySet<EndingKind> = new Set<EndingKind>(['nuclear', 'removed']);

// ------------------------------------------------------------------ emoji strip

function bandIndex(v: number): number {
  const c = Math.min(100, Math.max(0, v));
  if (c <= 20) return 0;
  if (c <= 40) return 1;
  if (c <= 60) return 2;
  if (c <= 80) return 3;
  return 4;
}

function cellBand(v: number | undefined, row: number): BandEmoji | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const b = bandIndex(v);
  return row === ESCALATION_ROW ? ESCALATION_BANDS[b] : OFFICE_BANDS[b];
}

/**
 * Evenly spaced indices into a trail of length `n`, always including the first and
 * last snapshot when `columns > 1`. Shorter trails repeat snapshots; longer ones skip.
 */
function sampleIndices(n: number, columns: number): number[] {
  if (columns <= 1) return [n - 1];
  const out: number[] = new Array(columns);
  for (let i = 0; i < columns; i++) out[i] = Math.round((i * (n - 1)) / (columns - 1));
  return out;
}

/**
 * Five rows (public, military, allies, economy, escalation) × `columns` (default 10) emoji,
 * sampled evenly across the trail.
 * Bands: office meters 0-20 🟥, 21-40 🟧, 41-60 🟨, 61-80 🟩, 81-100 🟦; escalation is
 * inverted (low is good): 0-20 🟦, 21-40 🟩, 41-60 🟨, 61-80 🟧, 81-100 🟥.
 * Empty trail → '⬛'.
 */
export function emojiStrip(trail: number[][], columns: number = DEFAULT_COLUMNS): string[] {
  const cols = Math.max(1, Math.floor(Number.isFinite(columns) ? columns : DEFAULT_COLUMNS));
  const n = Array.isArray(trail) ? trail.length : 0;
  if (n === 0) return METER_LABELS.map(() => EMPTY_CELL.repeat(cols));
  const idx = sampleIndices(n, cols);
  return METER_LABELS.map((_, row) => idx.map((i) => cellBand(trail[i]?.[row], row) ?? EMPTY_CELL).join(''));
}

/** The same strip as colours (hex) for drawing in the DOM: five rows × `columns`. */
export function stripCells(trail: number[][], columns: number = DEFAULT_COLUMNS): string[][] {
  const cols = Math.max(1, Math.floor(Number.isFinite(columns) ? columns : DEFAULT_COLUMNS));
  const n = Array.isArray(trail) ? trail.length : 0;
  if (n === 0) return METER_LABELS.map(() => new Array(cols).fill(EMPTY_HEX));
  const idx = sampleIndices(n, cols);
  return METER_LABELS.map((_, row) =>
    idx.map((i) => {
      const b = cellBand(trail[i]?.[row], row);
      return b ? BAND_HEX[b] : EMPTY_HEX;
    }),
  );
}

// ------------------------------------------------------------------ text share

function modeLabel(data: ShareCardData): string {
  if (data.mode === 'daily') return typeof data.dailyNumber === 'number' ? `#${data.dailyNumber}` : 'Daily';
  if (data.mode === 'challenge') return 'Challenge';
  if (data.mode === 'night') return 'Night';
  return 'Endless';
}

function dayCount(days: number): string {
  const d = Math.max(0, Math.floor(Number.isFinite(days) ? days : 0));
  return `${d} ${d === 1 ? 'day' : 'days'}`;
}

function brandOf(data: ShareCardData): string {
  return data.brand || BRAND.name;
}

function urlOf(data: ShareCardData): string {
  return data.url || BRAND.url;
}

/**
 * Text share, e.g.
 *
 *   BRINK #12 · The Republic · 31 days · 3-day streak
 *   🕊️ The Communiqué — Stand-Down
 *   The moment it held: The private session
 *   🟩🟩🟨🟨🟧🟨🟩🟩🟩🟩
 *   … (5 rows)
 *   Seed ABC-123 · https://url
 *
 * Daily mode shows `#number` and the streak when > 1; endless says 'Endless'.
 * The moment line is omitted when `moment` is null.
 */
export function shareText(data: ShareCardData): string {
  if (typeof data.clock === 'string') {
    // The night: one line people paste, the strip, the link.
    const result = data.dawn ? '🌅 Dawn' : data.endingKind === 'nuclear' ? `☢️ ${data.clock}` : `🌑 Fell at ${data.clock}`;
    const head = `${brandOf(data)} ${modeLabel(data)} ${result}`;
    const lines: string[] = [head];
    if (data.mode === 'daily' && typeof data.streak === 'number' && data.streak > 1) lines.push(`${Math.floor(data.streak)} nights in a row`);
    lines.push(...emojiStrip(data.trail));
    lines.push(urlOf(data));
    return lines.join('\n');
  }
  const head = [`${brandOf(data)} ${modeLabel(data)}`, data.seatName, dayCount(data.days)];
  if (data.mode === 'daily' && typeof data.streak === 'number' && data.streak > 1) {
    head.push(`${Math.floor(data.streak)}-day streak`);
  }

  const emoji = (data.endingEmoji ?? '').trim();
  const ending = `${emoji ? `${emoji} ` : ''}${data.endingName} — ${KIND_LABEL[data.endingKind] ?? 'Ending'}`;

  const lines: string[] = [head.join(' · '), ending];
  if (typeof data.score === 'number') lines.push(`Score ${scoreLabel(data.score)}${data.endlessActs ? ` · endless ${data.endlessActs}` : ''}`);
  if (data.moment) lines.push(`${data.momentLabel}: ${data.moment}`);
  lines.push(...emojiStrip(data.trail));
  lines.push(`Seed ${data.seed} · ${urlOf(data)}`);
  return lines.join('\n');
}

// ------------------------------------------------------------------ moment summary

/**
 * Tokens that end in a full stop without ending a sentence. Kept short and crisis-flavoured;
 * the cost of a miss is a slightly early cut, never a crash.
 */
const ABBREVIATION_TAIL =
  /(?:(?:^|\s)(?:mr|mrs|ms|dr|gen|col|lt|sgt|capt|maj|adm|cmdr|sen|rep|pres|sec|gov|amb|st|no|vs|etc|approx|dept|e\.g|i\.e|a\.m|p\.m|[a-z])\.|(?:[a-z]\.){2,})$/i;

function firstSentence(s: string): string {
  const re = /[.!?]+["'”’)\]]*(?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const head = s.slice(0, m.index + m[0].length);
    if (m[0].startsWith('.') && ABBREVIATION_TAIL.test(head)) continue;
    return head;
  }
  return s;
}

function truncateWithEllipsis(s: string, max: number): string {
  if (s.length <= max) return s;
  let cut = s.slice(0, max - 1);
  // Never leave half a surrogate pair behind.
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  const space = cut.lastIndexOf(' ');
  if (space > max * 0.5) cut = cut.slice(0, space);
  cut = cut.replace(/[\s,;:.!?…—–\-("'“‘]+$/u, '');
  return `${cut}…`;
}

/**
 * Builds the moment line from a card's text: first sentence, ≤ 90 chars, ellipsised with a
 * single '…'. Whitespace (including YAML line breaks) is collapsed and '...' normalised.
 */
export function summariseMoment(text: string): string {
  const clean = String(text ?? '')
    .replace(/\.{3}/g, '…')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return '';
  return truncateWithEllipsis(firstSentence(clean), MOMENT_MAX);
}

// ------------------------------------------------------------------ filename

/** brink-<mode>-<seed>.png — lower-cased brand, seed reduced to filename-safe characters. */
export function shareFilename(data: ShareCardData): string {
  const brand = brandOf(data).toLowerCase().replace(/[^a-z0-9]+/g, '') || 'brink';
  const seed = String(data.seed ?? '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'run';
  return `${brand}-${data.mode}-${seed}.png`;
}

// ------------------------------------------------------------------ PNG render

const W = 1080;
const H = 1350;

const NAVY = '#0b1220';
const PAPER = '#ece7d8';
const INK = '#141a26';
const INK_MUTED = '#5f5b50';
const INK_FAINT = 'rgba(20, 26, 38, 0.22)';
const RED = '#c8322f';
const STAMP_MUTED = '#7a7466';
const NAVY_TEXT = '#8b95a8';

const SERIF = 'Georgia, "Times New Roman", serif';
const MONO = 'ui-monospace, Menlo, monospace';

// Panel geometry (portrait): navy margins top and bottom, paper in between.
const PANEL_X = 72;
const PANEL_Y = 104;
const PANEL_W = 936;
const PANEL_H = 1130;
const BAND_W = 12; // red file-tab band on the panel's left edge
const CONTENT_L = PANEL_X + BAND_W + 44; // 128
const CONTENT_R = PANEL_X + PANEL_W - 48; // 960

type Ctx = CanvasRenderingContext2D;

/** Tiny deterministic PRNG so the same run always renders the same texture. */
function seededRandom(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function spacedWidth(ctx: Ctx, text: string, spacing: number): number {
  const chars = Array.from(text);
  let w = 0;
  for (const ch of chars) w += ctx.measureText(ch).width;
  return w + spacing * Math.max(0, chars.length - 1);
}

/** Letter-spaced text drawn glyph by glyph (works everywhere; `ctx.letterSpacing` does not). */
function drawSpaced(ctx: Ctx, text: string, x: number, y: number, spacing: number, align: 'left' | 'right' | 'center' = 'left'): number {
  const width = spacedWidth(ctx, text, spacing);
  let cx = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of Array.from(text)) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = prev;
  return width;
}

/** Largest font size in [min, max] (step 2) at which `text` fits `maxWidth`. Leaves ctx.font set. */
function fitFont(ctx: Ctx, text: string, maxWidth: number, max: number, min: number, style: string, family: string): number {
  for (let size = max; size >= min; size -= 2) {
    ctx.font = `${style} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  ctx.font = `${style} ${min}px ${family}`;
  return min;
}

/** Greedy word wrap to at most `maxLines`, ellipsising the last line if the text overflows. */
function wrapText(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines) {
    if (current) lines.push(current);
    return lines;
  }
  // Overflowed: squeeze the remainder into the last line with an ellipsis.
  let last = `${lines[maxLines - 1]} ${current}`.trim();
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
    const space = last.lastIndexOf(' ');
    last = space > 0 ? last.slice(0, space) : last.slice(0, -1);
  }
  lines[maxLines - 1] = `${last.replace(/[\s,;:.—–-]+$/, '')}…`;
  return lines;
}

function truncateToWidth(ctx: Ctx, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function paintBackground(ctx: Ctx, rnd: () => number, heat: number): void {
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);

  // Vignette.
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.8);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // Red heat glow, top-right, scaled by final escalation.
  const glow = ctx.createRadialGradient(W, 0, 40, W, 0, 760);
  glow.addColorStop(0, `rgba(224,59,59,${(0.08 + 0.42 * heat).toFixed(3)})`);
  glow.addColorStop(1, 'rgba(224,59,59,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Scanlines.
  ctx.fillStyle = 'rgba(255,255,255,0.028)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  // Grain: sparse light and dark specks.
  for (let i = 0; i < 7000; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const light = rnd() > 0.45;
    const a = 0.02 + rnd() * 0.05;
    ctx.fillStyle = light ? `rgba(255,255,255,${a.toFixed(3)})` : `rgba(0,0,0,${(a * 1.5).toFixed(3)})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Top rule: the "alert" bar.
  ctx.fillStyle = `rgba(224,59,59,${(0.35 + 0.65 * heat).toFixed(3)})`;
  ctx.fillRect(0, 0, W, 6);
}

function paintPanel(ctx: Ctx, rnd: () => number, heat: number): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 22;
  ctx.fillStyle = PAPER;
  roundRectPath(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 8);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 8);
  ctx.clip();

  // Paper grain.
  for (let i = 0; i < 9000; i++) {
    const x = PANEL_X + rnd() * PANEL_W;
    const y = PANEL_Y + rnd() * PANEL_H;
    const a = 0.025 + rnd() * 0.045;
    ctx.fillStyle = rnd() > 0.3 ? `rgba(70,50,30,${a.toFixed(3)})` : `rgba(255,255,255,${(a * 1.6).toFixed(3)})`;
    ctx.fillRect(x, y, 1 + (rnd() > 0.7 ? 1 : 0), 1);
  }
  // Faint top-to-bottom tone shift so the paper is not flat.
  const tone = ctx.createLinearGradient(0, PANEL_Y, 0, PANEL_Y + PANEL_H);
  tone.addColorStop(0, 'rgba(255,255,255,0.10)');
  tone.addColorStop(1, 'rgba(60,40,20,0.06)');
  ctx.fillStyle = tone;
  ctx.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

  // Red file-tab band, intensity from escalation.
  ctx.fillStyle = `rgba(200,50,47,${(0.55 + 0.45 * heat).toFixed(3)})`;
  ctx.fillRect(PANEL_X, PANEL_Y, BAND_W, PANEL_H);
  ctx.restore();
}

function paintHeader(ctx: Ctx, data: ShareCardData): void {
  const line1 = PANEL_Y + 86;
  const line2 = line1 + 40;

  // Brand, letter-spaced, bold mono.
  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `bold 44px ${MONO}`;
  drawSpaced(ctx, brandOf(data).toUpperCase(), CONTENT_L, line1, 8);

  // Mode / daily number, right aligned.
  ctx.fillStyle = INK_MUTED;
  ctx.font = `bold 30px ${MONO}`;
  drawSpaced(ctx, modeLabel(data).toUpperCase(), CONTENT_R, line1, 3, 'right');

  // Seat with accent swatch.
  const rgb = hexToRgb(data.seatAccent);
  ctx.fillStyle = rgb ? `rgb(${rgb.join(',')})` : INK_MUTED;
  ctx.beginPath();
  ctx.arc(CONTENT_L + 8, line2 - 9, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = `22px ${MONO}`;
  drawSpaced(ctx, data.seatName.toUpperCase(), CONTENT_L + 30, line2, 3);

  // Seed, right aligned.
  ctx.fillStyle = INK_MUTED;
  drawSpaced(ctx, `SEED ${data.seed}`.toUpperCase(), CONTENT_R, line2, 2, 'right');

  // Rule.
  ctx.fillStyle = INK_FAINT;
  ctx.fillRect(CONTENT_L, line2 + 26, CONTENT_R - CONTENT_L, 2);
}

function paintEnding(ctx: Ctx, data: ShareCardData): void {
  const baseline = PANEL_Y + 262;
  let x = CONTENT_L;
  const emoji = (data.endingEmoji ?? '').trim();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  if (emoji) {
    ctx.font = `68px ${SERIF}`;
    ctx.fillText(emoji, x, baseline - 4);
    x += ctx.measureText(emoji).width + 22;
  }
  const name = data.endingName || 'Ending';
  fitFont(ctx, name, CONTENT_R - x, 84, 40, 'bold', SERIF);
  ctx.fillText(name, x, baseline);
}

function paintDays(ctx: Ctx, data: ShareCardData, heat: number): void {
  const baseline = PANEL_Y + 512;
  const night = typeof data.clock === 'string';
  const days = night ? data.clock! : String(Math.max(0, Math.floor(Number.isFinite(data.days) ? data.days : 0)));
  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  fitFont(ctx, days, 470, night ? 180 : 236, 120, 'bold', SERIF);
  ctx.fillText(days, CONTENT_L - 6, baseline);
  const numberWidth = ctx.measureText(days).width;

  ctx.fillStyle = INK_MUTED;
  ctx.font = `22px ${MONO}`;
  const caption = night ? (data.dawn ? 'DAWN' : 'FELL') : days === '1' ? 'DAY SURVIVED' : 'DAYS SURVIVED';
  drawSpaced(ctx, caption, CONTENT_L, baseline + 40, 5);

  // Stamp: kind, rotated, right of the number.
  const label = (KIND_LABEL[data.endingKind] ?? 'Ending').toUpperCase();
  const stampColour = RED_KINDS.has(data.endingKind) ? RED : STAMP_MUTED;
  const stampCx = Math.max(CONTENT_L + numberWidth + 200, 800);
  paintStamp(ctx, label, Math.min(stampCx, CONTENT_R - 150), baseline - 70, stampColour, RED_KINDS.has(data.endingKind) ? 0.78 + 0.2 * heat : 0.82);

  // Score (total leverage), right-aligned under the stamp.
  if (typeof data.score === 'number' && Number.isFinite(data.score)) {
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = INK;
    ctx.font = `bold 48px ${SERIF}`;
    ctx.fillText(scoreLabel(data.score), CONTENT_R, baseline + 4);
    ctx.textAlign = 'left';
    ctx.fillStyle = INK_MUTED;
    ctx.font = `22px ${MONO}`;
    const cap = data.endlessActs ? `SCORE · ENDLESS ${Math.max(1, Math.floor(data.endlessActs))}` : 'SCORE';
    drawSpaced(ctx, cap, CONTENT_R - spacedWidth(ctx, cap, 5), baseline + 40, 5);
    ctx.restore();
  }
}

function paintStamp(ctx: Ctx, text: string, cx: number, cy: number, colour: string, alpha: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-7 * Math.PI) / 180);
  ctx.globalAlpha = alpha;
  ctx.font = `bold 34px ${MONO}`;
  const spacing = 6;
  const textW = spacedWidth(ctx, text, spacing);
  const padX = 24;
  const padY = 16;
  const w = textW + padX * 2;
  const h = 34 + padY * 2;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 4;
  roundRectPath(ctx, -w / 2, -h / 2, w, h, 6);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, -w / 2 + 7, -h / 2 + 7, w - 14, h - 14, 3);
  ctx.stroke();
  ctx.fillStyle = colour;
  ctx.textBaseline = 'middle';
  drawSpaced(ctx, text, -textW / 2, 2, spacing);
  ctx.restore();
}

function paintMoment(ctx: Ctx, data: ShareCardData): void {
  const labelY = PANEL_Y + 618;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = RED_KINDS.has(data.endingKind) ? RED : INK_MUTED;
  ctx.font = `bold 20px ${MONO}`;
  drawSpaced(ctx, (data.momentLabel || 'The moment').toUpperCase(), CONTENT_L, labelY, 3);

  ctx.fillStyle = INK;
  ctx.font = `italic 34px ${SERIF}`;
  const text = data.moment ? summariseMoment(data.moment) : '—';
  const lines = wrapText(ctx, text, CONTENT_R - CONTENT_L, 2);
  lines.forEach((line, i) => ctx.fillText(line, CONTENT_L, labelY + 46 + i * 42));
}

function paintPieces(ctx: Ctx, data: ShareCardData): void {
  const pieces = (data.pieces ?? []).filter((p) => typeof p === 'string' && p.trim()).slice(0, MAX_PIECES);
  if (pieces.length === 0) return;
  const top = PANEL_Y + 736;
  const chipH = 40;
  const padX = 16;
  const gap = 12;
  let x = CONTENT_L;
  ctx.font = `20px ${MONO}`;
  ctx.textBaseline = 'middle';
  for (const piece of pieces) {
    const remaining = CONTENT_R - x;
    if (remaining < 80) break;
    const label = truncateToWidth(ctx, piece, remaining - padX * 2);
    const w = ctx.measureText(label).width + padX * 2;
    ctx.fillStyle = 'rgba(11,18,32,0.07)';
    roundRectPath(ctx, x, top, w, chipH, chipH / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(11,18,32,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(label, x + padX, top + chipH / 2 + 1);
    x += w + gap;
  }
  ctx.textBaseline = 'alphabetic';
}

function paintStrip(ctx: Ctx, data: ShareCardData): void {
  const top = PANEL_Y + 816;
  const cellW = 56;
  const cellH = 40;
  const gap = 6;
  const pitch = cellH + 14;
  const labelRight = CONTENT_L + 190;
  const gridLeft = labelRight + 22;
  const rows = emojiStrip(data.trail, DEFAULT_COLUMNS);

  ctx.textBaseline = 'alphabetic';
  rows.forEach((row, r) => {
    const y = top + r * pitch;
    ctx.fillStyle = INK_MUTED;
    ctx.font = `18px ${MONO}`;
    drawSpaced(ctx, METER_LABELS[r], labelRight, y + cellH / 2 + 6, 2, 'right');
    Array.from(row).forEach((cell, c) => {
      const colour = (BAND_HEX as Record<string, string>)[cell] ?? EMPTY_HEX;
      ctx.fillStyle = colour;
      roundRectPath(ctx, gridLeft + c * (cellW + gap), y, cellW, cellH, 6);
      ctx.fill();
    });
  });

  // Timeline hints under the grid.
  const hintY = top + rows.length * pitch + 12;
  const gridRight = gridLeft + DEFAULT_COLUMNS * cellW + (DEFAULT_COLUMNS - 1) * gap;
  ctx.fillStyle = INK_MUTED;
  ctx.font = `16px ${MONO}`;
  drawSpaced(ctx, 'DAY 1', gridLeft, hintY, 2);
  drawSpaced(ctx, `DAY ${Math.max(1, Math.floor(Number.isFinite(data.days) ? data.days : 1))}`, gridRight, hintY, 2, 'right');
}

function paintFooter(ctx: Ctx, data: ShareCardData): void {
  const display = urlOf(data).replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  ctx.fillStyle = NAVY_TEXT;
  ctx.font = `24px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  drawSpaced(ctx, display, W / 2, PANEL_Y + PANEL_H + 66, 2, 'center');
}

function paint(ctx: Ctx, data: ShareCardData): void {
  const last = data.trail[data.trail.length - 1];
  const finalEscalation = typeof last?.[ESCALATION_ROW] === 'number' ? last[ESCALATION_ROW] : 50;
  const heat = Math.min(1, Math.max(0, finalEscalation / 100));
  const rnd = seededRandom(`${data.seed}|${data.mode}|${data.days}`);

  paintBackground(ctx, rnd, heat);
  paintPanel(ctx, rnd, heat);
  paintHeader(ctx, data);
  paintEnding(ctx, data);
  paintDays(ctx, data, heat);
  paintMoment(ctx, data);
  paintPieces(ctx, data);
  paintStrip(ctx, data);
  paintFooter(ctx, data);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const meta = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  const type = /^data:([^;,]+)/.exec(meta)?.[1] ?? 'image/png';
  const bin = atob(payload);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    try {
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('renderShareCard: canvas.toBlob produced no image'))), 'image/png');
        return;
      }
      resolve(dataUrlToBlob(canvas.toDataURL('image/png')));
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Client-side PNG, 1080×1350 portrait, drawn with Canvas 2D: navy background with procedural
 * scanline/grain texture, an off-white briefing-paper panel, monospace header block, big serif
 * ending name with emoji, the kind as a red or muted stamp, the days survived huge, the moment
 * line, up to four piece chips, and the five-row meter strip as coloured rounded rects.
 * Red accent intensity scales with final escalation. System fonts only.
 * Rejects if there is no document or no 2D canvas.
 */
export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    throw new Error('renderShareCard: no document available — canvas rendering needs a browser');
  }
  let canvas: HTMLCanvasElement;
  try {
    canvas = document.createElement('canvas');
  } catch (err) {
    throw new Error(`renderShareCard: could not create a canvas (${err instanceof Error ? err.message : String(err)})`);
  }
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('renderShareCard: 2D canvas context unavailable');
  paint(ctx, data);
  return canvasToBlob(canvas);
}

// ------------------------------------------------------------------ share flow

function isAbort(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError';
}

/**
 * Share flow: navigator.share with the PNG file (mobile), else navigator.share text, else
 * clipboard, else download the PNG. Returns which path was used. Never throws.
 * A user-cancelled share sheet (AbortError) returns 'failed' without falling through, so the
 * player is not surprised by a clipboard write or download after dismissing the sheet.
 */
export async function share(data: ShareCardData, blob?: Blob): Promise<'shared' | 'copied' | 'downloaded' | 'failed'> {
  let text: string;
  let filename: string;
  let title: string;
  try {
    text = shareText(data);
    filename = shareFilename(data);
    title = `${brandOf(data)} — ${data.endingName}`;
  } catch {
    return 'failed';
  }

  const nav: Navigator | undefined = typeof navigator !== 'undefined' ? navigator : undefined;
  const canShareApi = !!nav && typeof nav.share === 'function';

  // 1. Native share with the image attached.
  if (blob && canShareApi) {
    try {
      const file = typeof File === 'function' ? new File([blob], filename, { type: blob.type || 'image/png' }) : null;
      if (file && (typeof nav!.canShare !== 'function' || nav!.canShare({ files: [file] }))) {
        await nav!.share({ files: [file], title, text });
        return 'shared';
      }
    } catch (err) {
      if (isAbort(err)) return 'failed';
    }
  }

  // 2. Native share, text only.
  if (canShareApi) {
    try {
      await nav!.share({ title, text });
      return 'shared';
    } catch (err) {
      if (isAbort(err)) return 'failed';
    }
  }

  // 3. Clipboard.
  try {
    const clipboard = nav?.clipboard;
    if (clipboard && typeof clipboard.writeText === 'function') {
      await clipboard.writeText(text);
      return 'copied';
    }
  } catch {
    /* fall through */
  }

  // 4. Download the PNG.
  if (blob) {
    try {
      downloadBlob(blob, filename);
      return 'downloaded';
    } catch {
      /* fall through */
    }
  }

  return 'failed';
}

/**
 * Helper for the ending screen: download the PNG (use `shareFilename(data)` for the
 * brink-<mode>-<seed>.png name). Throws only when there is no document to click through.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('downloadBlob: needs a browser document');
  }
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename || 'brink.png';
  a.rel = 'noopener';
  a.style.display = 'none';
  (document.body ?? document.documentElement).appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  }
}
