/**
 * The DANGER gauge's numbers (SPEC "The screen", 1): a 200 pt bar whose colour runs cool blue at 0
 * to red at 100, a needle at the value, the number at the needle, and the small delta that floats
 * beside it. Pure, so the colour, the needle and the placements have tests.
 */

export const BAR_W = 200;
/** The number's digits are 18 pt mono: about this wide each. */
const DIGIT_W = 11;
/** The delta's characters are 12 pt mono: about this wide each. */
const DELTA_CHAR_W = 7.4;
/** The gap between the number and its delta. */
const DELTA_GAP = 6;

export type RGB = readonly [number, number, number];

const STOPS: ReadonlyArray<readonly [number, RGB]> = [
  [0, [96, 164, 220]],
  [40, [150, 160, 150]],
  [60, [214, 160, 64]],
  [80, [226, 112, 47]],
  [100, [204, 48, 40]],
];

/** The gauge's colour at a DANGER value: blue, through amber, to red. */
export function gaugeRgb(danger: number): RGB {
  const d = Math.max(0, Math.min(100, danger));
  for (let i = 1; i < STOPS.length; i++) {
    const [d1, c1] = STOPS[i];
    if (d > d1) continue;
    const [d0, c0] = STOPS[i - 1];
    const t = d1 === d0 ? 1 : (d - d0) / (d1 - d0);
    return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
  }
  return STOPS[STOPS.length - 1][1];
}

export function gaugeColour(danger: number): string {
  const [r, g, b] = gaugeRgb(danger);
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/** The needle's x along the bar for a DANGER value. */
export function needleX(danger: number): number {
  return (Math.max(0, Math.min(100, danger)) / 100) * BAR_W;
}

export type Anchor = 'start' | 'middle' | 'end';

/**
 * Where the number sits: centred on the needle, except at the ends of the bar, where its near edge
 * sits on the needle so the number is never away from it and never off the bar.
 */
export function numberPlace(danger: number): { x: number; anchor: Anchor } {
  const d = Math.max(0, Math.min(100, danger));
  const x = needleX(d);
  if (d < 9) return { x, anchor: 'start' };
  if (d > 91) return { x, anchor: 'end' };
  return { x, anchor: 'middle' };
}

/** The number's left and right edges on the bar. */
export function numberEdges(danger: number): [number, number] {
  const d = Math.round(Math.max(0, Math.min(100, danger)));
  const w = String(d).length * DIGIT_W;
  const { x, anchor } = numberPlace(d);
  if (anchor === 'start') return [x, x + w];
  if (anchor === 'end') return [x - w, x];
  return [x - w / 2, x + w / 2];
}

/** The number's centre on the bar (kept for callers that only need a point). */
export function numberX(danger: number): number {
  const [l, r] = numberEdges(danger);
  return (l + r) / 2;
}

/**
 * The floating delta's centre: beside the number on the side towards the bar's middle (right of it
 * under 50, left of it from 50), and always inside the bar, so it is never clipped at 100 nor
 * drawn over the day label at 0.
 */
export function deltaX(danger: number, text: string): number {
  const half = (Math.max(1, text.length) * DELTA_CHAR_W) / 2;
  const [l, r] = numberEdges(danger);
  const x = danger < 50 ? r + DELTA_GAP + half : l - DELTA_GAP - half;
  return Math.max(half + 1, Math.min(BAR_W - half - 1, x));
}

/** '-18', '+9'; empty for no change. */
export function deltaText(n: number): string {
  if (n === 0) return '';
  return n < 0 ? `−${-n}` : `+${n}`;
}
