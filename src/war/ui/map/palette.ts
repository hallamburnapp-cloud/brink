/**
 * Map colours (STYLE.md section 3). Plates are tinted glass: unlit glass is a hand-picked dark jewel
 * tone per bloc; lit, scored and flash states mix the bloc colour over that tone and add a lamp core.
 */
import type { Colour } from './contract';
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

export const SEA = hex('#0D1B2A');
export const WHITE: RGB = [255, 255, 255];
export const THREAD = hex('#E0483C');
export const THREAD_HOT_GLOW = hex('#FF5A3C');
export const HEAT = hex('#FFF6E0');
export const ALARM = hex('#FF5A4E');
export const STANDBY = hex('#6FA8FF');
export const INK = hex('#05080C');
export const LINEN = hex('#E9E2D2');
export const TYPE_INK = hex('#2A2520');
export const STAMP_INK = hex('#C4372C');
export const INFLUENCE = hex('#5FD4F4');
export const INFLUENCE_HI = hex('#D4F6FF');
export const MOMENTUM = hex('#FFB547');
export const MOMENTUM_HI = hex('#FFE7BD');
export const GOLD = hex('#F2C94C');
export const PEWTER = { hi: hex('#C9CDD4'), base: hex('#8A8F98'), lo: hex('#4D525A') };
export const BRASS = {
  hi: hex('#F7E0A3'),
  a: hex('#E3C078'),
  b: hex('#C9A35B'),
  c: hex('#9E7B3B'),
  lo: hex('#5A4219'),
  deep: hex('#3A2A10'),
};
/** Dark halo behind map text (STYLE 4: region names and weights). */
export const HALO = 'rgba(6,11,17,0.85)';

export const BLOC: Readonly<Record<Colour, RGB>> = Object.fromEntries(COLOURS.map((c) => [c, hex(COLOUR_HEX[c])])) as Record<
  Colour,
  RGB
>;

/** Unlit glass per bloc (mixing a warm hue into the navy sea muddies it, so these are hand-picked). */
export const DARK: Readonly<Record<Colour, RGB>> = {
  CAP: hex('#172E46'),
  HMR: hex('#0F352E'),
  SCT: hex('#34301A'),
  SND: hex('#3C1D1A'),
  FRS: hex('#251E44'),
};

/**
 * Plate states. 'retired' is shuttered glass (spec 6, RETIRE); 'off' is a plate after the lights
 * went out on a miss (spec 9).
 */
export type FillState = 'dark' | 'spent' | 'lit' | 'scored' | 'flash' | 'retired';

interface PlateRecipe {
  /** Bloc colour over the dark tone. */
  base: number;
  /** White mixed into the bloc for the lamp core, and the core's alpha. */
  core: number;
  coreA: number;
  /** Sea mixed over the result (spent glass lets the sea through). */
  sea: number;
}

const PLATE: Record<Exclude<FillState, 'retired'>, PlateRecipe> = {
  dark: { base: 0, core: 0, coreA: 0, sea: 0 },
  spent: { base: 0, core: 0, coreA: 0, sea: 0.5 },
  lit: { base: 0.56, core: 0.22, coreA: 0.5, sea: 0 },
  scored: { base: 0.86, core: 0.5, coreA: 0.85, sea: 0 },
  flash: { base: 1, core: 0.55, coreA: 0.8, sea: 0 },
};

export function plateFill(colour: Colour, state: FillState): RGB {
  if (state === 'retired') return mix(INK, DARK[colour], 0.55);
  const p = PLATE[state];
  const c = mix(BLOC[colour], DARK[colour], p.base);
  return p.sea ? mix(SEA, c, p.sea) : c;
}

/** The lamp under the pin: core colour and alpha (0 for unlit glass, which gets a faint bloc core). */
export function plateCore(colour: Colour, state: FillState): { core: RGB; alpha: number } {
  if (state === 'retired') return { core: BLOC[colour], alpha: 0 };
  const p = PLATE[state];
  return { core: mix(WHITE, BLOC[colour], p.core), alpha: p.coreA };
}

export function isLitState(state: FillState): boolean {
  return state === 'lit' || state === 'scored' || state === 'flash';
}

/** Region weight label colour on dark glass: the bloc mixed 45% into linen. */
export function weightInk(colour: Colour, big: boolean): RGB {
  return big ? mix(LINEN, BLOC[colour], 0.8) : mix(BLOC[colour], LINEN, 0.45);
}
