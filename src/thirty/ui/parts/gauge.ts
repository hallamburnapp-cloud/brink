/**
 * The DANGER gauge's numbers (SPEC "The screen", 1): a 200 pt bar whose colour runs cool blue at 0
 * to red at 100, a needle at the value, the number at the needle, and the small delta that floats
 * beside it. Pure, so the colour and the needle have tests.
 */

export const BAR_W = 200;
/** The number's width (18 pt mono, up to three digits) keeps it inside the gauge at either end. */
const NUMBER_HALF = 18;

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

/** Where the number sits: at the needle, kept inside the bar's ends. */
export function numberX(danger: number): number {
  return Math.max(NUMBER_HALF, Math.min(BAR_W - NUMBER_HALF, needleX(danger)));
}

/** '-18', '+9'; empty for no change. */
export function deltaText(n: number): string {
  if (n === 0) return '';
  return n < 0 ? `−${-n}` : `+${n}`;
}
