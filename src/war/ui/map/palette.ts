/**
 * Map colours (docs/war/v2/SPEC.md section 8; STYLE.md section 3 for the table and metals).
 *
 * Colour means ownership and nothing else: gold is yours, red is war's, grey is free. The three
 * states also differ by brightness (gold > grey > red with its hatching), so the map reads in
 * sunlight, in greyscale and for colour-blind players; palette.test.ts holds that order.
 */
import type { Colour, Owner } from './contract';
import { COLOURS, COLOUR_HEX } from './data';

export type RGB = readonly [number, number, number];

export function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function css(c: RGB, a = 1): string {
  const r = c[0] | 0;
  const g = c[1] | 0;
  const b = c[2] | 0;
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${Math.max(0, a).toFixed(4)})`;
}

/** `top` at opacity t over `under`. */
export function mix(top: RGB, under: RGB, t: number): RGB {
  return [top[0] * t + under[0] * (1 - t), top[1] * t + under[1] * (1 - t), top[2] * t + under[2] * (1 - t)];
}

export function scale(c: RGB, k: number): RGB {
  return [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];
}

// ---------------------------------------------------------------- luminance

function toLinear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function toSrgb(l: number): number {
  const c = l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, c * 255));
}

/** Relative luminance (WCAG), 0 for black to 1 for white. */
export function luminance(c: RGB): number {
  return 0.2126 * toLinear(c[0]) + 0.7152 * toLinear(c[1]) + 0.0722 * toLinear(c[2]);
}

/** The same hue at a given relative luminance (scaled in linear light). */
function withLuminance(c: RGB, target: number): RGB {
  const lin = [toLinear(c[0]), toLinear(c[1]), toLinear(c[2])];
  const l = luminance(c) || 1e-6;
  const k = target / l;
  return [toSrgb(lin[0] * k), toSrgb(lin[1] * k), toSrgb(lin[2] * k)];
}

/** Average luminance of a fill covered by stripes over a share of its area (light adds linearly). */
export function stripedLuminance(fill: RGB, stripe: RGB, cover: number): number {
  return luminance(fill) * (1 - cover) + luminance(stripe) * cover;
}

function hsl(c: RGB): [number, number, number] {
  const r = c[0] / 255;
  const g = c[1] / 255;
  const b = c[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h < 0 ? h + 360 : h, s, l];
}

function fromHsl(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// ---------------------------------------------------------------- the table and its fixtures

export const SEA = hex('#0D1B2A');
/** What the gold and red fills sit over (the table, STYLE --table). */
export const TABLE = hex('#0B0F14');
/** The grey plates' base (SPEC 8: the bloc tint 35% over this). */
const GREY_BASE = hex('#16222F');
export const WHITE: RGB = [255, 255, 255];
export const INK = hex('#05080C');
export const LINEN = hex('#E9E2D2');
export const TYPE_INK = hex('#2A2520');
export const AMBER = hex('#FFB547');
/** The crisis ring and the threads between pins (SPEC 8: white, never red). */
export const RING_WHITE = hex('#F4F1E8');
export const BRASS = {
  hi: hex('#F7E0A3'),
  a: hex('#E3C078'),
  b: hex('#C9A35B'),
  c: hex('#9E7B3B'),
  lo: hex('#5A4219'),
  deep: hex('#3A2A10'),
};

export const BLOC: Readonly<Record<Colour, RGB>> = Object.fromEntries(COLOURS.map((c) => [c, hex(COLOUR_HEX[c])])) as Record<
  Colour,
  RGB
>;

// ---------------------------------------------------------------- ownership

/** Gold, yours: fill #F2D27A at 85%, a 1.5 pt #FFE9A8 rim, a soft glow, a 6 s shimmer. */
export const GOLD = hex('#F2D27A');
export const GOLD_RIM = hex('#FFE9A8');
/** The shadowed side of a gold plate. */
export const GOLD_DEEP = hex('#8A5F12');
export const GOLD_INK = hex('#3A2C0A');
/** Red, war's: fill #E0483C at 75%, 2 pt #7A1E17 hatching every 6 pt at 45 degrees, a 4 s pulse. */
export const WAR = hex('#E0483C');
export const WAR_HATCH = hex('#7A1E17');
/** Red text and outlines on the dark table (the war tag): a touch lighter than the fill, for contrast. */
export const WAR_TEXT = hex('#FF6A5C');

export const HATCH_STEP = 6;
export const HATCH_WIDTH = 2;
/** Share of a plate the hatching covers (2 pt lines every 6 pt, measured across the lines). */
export const HATCH_COVER = HATCH_WIDTH / HATCH_STEP;

export const GOLD_FILL = mix(GOLD, TABLE, 0.85);
export const WAR_FILL = mix(WAR, TABLE, 0.75);
/** CEASEFIRE: the war stops where it stands; red stops pulsing and fades to 60%. */
const WAR_FILL_CEASED = mix(WAR, TABLE, 0.6);

/**
 * Luminance targets for the grey plates. The spec's recipe (the bloc at 25% saturation, 35% over
 * #16222F) gives each bloc a different brightness (teal is darker than ice blue); pinning every
 * bloc to one luminance keeps "grey" one brightness, between gold and hatched red. Dark plates are
 * dark, so lit ones and gold stand out.
 */
const GREY_LIT_L = 0.15;
const GREY_DARK_L = 0.055;
/**
 * War's regions when they are not in the deal (nearly always): a deeper red that keeps its
 * saturation, so it still reads as red but sits below dark grey in brightness.
 */
const WAR_DARK_FILL = hex('#78180F');
const WAR_DARK_HATCH = hex('#3A0A07');
const CEASED_DARK = 0.8;

/** The bloc hue at 25% saturation, 35% over the table: grey with a trace of its bloc. */
export function greyTint(colour: Colour): RGB {
  const [h, , l] = hsl(BLOC[colour]);
  return mix(fromHsl(h, 0.25, l), GREY_BASE, 0.35);
}

export interface OwnerTone {
  fill: RGB;
  /** Hatching colour, or null when the plate is not hatched. */
  hatch: RGB | null;
}

/**
 * A plate's base tone. `lit`: the region is in this turn's deal and can be pinned (the lamp under
 * the glass is on). Dark plates are dimmer, except gold, which stays gold.
 */
export function ownerTone(owner: Owner, colour: Colour, lit: boolean, ceased = false): OwnerTone {
  // Gold is yours and lit for good: the lamp under a dealt gold region adds light on top.
  if (owner === 'gold') return { fill: GOLD_FILL, hatch: null };
  if (owner === 'red') {
    if (lit) return { fill: ceased ? WAR_FILL_CEASED : WAR_FILL, hatch: WAR_HATCH };
    return ceased
      ? { fill: scale(WAR_DARK_FILL, CEASED_DARK), hatch: scale(WAR_DARK_HATCH, CEASED_DARK) }
      : { fill: WAR_DARK_FILL, hatch: WAR_DARK_HATCH };
  }
  return { fill: withLuminance(greyTint(colour), lit ? GREY_LIT_L : GREY_DARK_L), hatch: null };
}

/** The tone's average luminance, hatching included (what the eye and a greyscale photo see). */
export function toneLuminance(t: OwnerTone): number {
  return t.hatch ? stripedLuminance(t.fill, t.hatch, HATCH_COVER) : luminance(t.fill);
}

/** The lamp under a lit plate: a warm white core, tinted towards the plate. */
export function lampCore(owner: Owner): { core: RGB; alpha: number } {
  if (owner === 'gold') return { core: hex('#FFE59A'), alpha: 0.36 };
  if (owner === 'red') return { core: hex('#FFB3A8'), alpha: 0.35 };
  return { core: hex('#F3EEE2'), alpha: 0.42 };
}

/** Text and glyph colours on a plate: dark ink on gold, linen elsewhere. */
export function markInk(owner: Owner): { text: RGB; glyph: RGB } {
  if (owner === 'gold') return { text: GOLD_INK, glyph: hex('#6B5420') };
  if (owner === 'red') return { text: hex('#FBE6E2'), glyph: hex('#F7B9B0') };
  return { text: LINEN, glyph: hex('#B9C3CC') };
}

/** The bloc glyph on a grey plate: its bloc colour, washed out to the plate's 25% saturation. */
export function greyGlyph(colour: Colour): RGB {
  const [h] = hsl(BLOC[colour]);
  return fromHsl(h, 0.35, 0.72);
}
