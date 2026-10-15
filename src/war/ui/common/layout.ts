/**
 * The portrait layout (SPEC sections 9 and 10). Rects are [x, y, w, h] in frame px on the 390 x 844
 * logical screen. Components position themselves from these, and the director aims flying numbers
 * with them, so nothing needs to measure the DOM.
 */

export type Rect = readonly [x: number, y: number, w: number, h: number];

export const FRAME_W = 390;
export const FRAME_H = 844;

export const R = {
  safeTop: [0, 0, 390, 47],
  // The Big Board: the goal display (section 10).
  board: [0, 47, 390, 60],
  goldCount: [16, 50, 150, 26],
  menu: [179, 50, 32, 32],
  warCount: [224, 50, 150, 26],
  goldBar: [16, 84, 209, 16],
  warBar: [245, 84, 129, 16],
  rail: [0, 107, 390, 64],
  map: [0, 171, 390, 520],
  /** The intro's SKIP, in the tap-to-continue row at the foot of the map (a 44 pt hit height). */
  skip: [310, 648, 64, 32],
  /** The intro's tap-to-continue pill (TRY IT on a first launch's last screen). */
  introNext: [95, 644, 200, 40],
  // The readout.
  readout: [0, 691, 390, 48],
  target: [16, 693, 170, 20],
  need: [16, 717, 170, 16],
  points: [196, 695, 86, 40],
  mult: [300, 695, 74, 40],
  // The controls.
  controls: [0, 739, 390, 68],
  swap: [16, 745, 104, 56],
  coins: [128, 745, 70, 56],
  send: [206, 745, 168, 56],
  home: [0, 807, 390, 37],
  // The shop, in the Briefing tray.
  tray: [0, 451, 390, 356],
  offer0: [16, 485, 110, 180],
  offer1: [140, 485, 110, 180],
  offer2: [264, 485, 110, 180],
  reroll: [16, 677, 171, 44],
  next: [203, 677, 171, 44],
  receipt: [16, 729, 358, 28],
  // The end screens: the card over the upper map (or the lower, when the near-miss regions are up
  // there), the best send in the readout band, HOME and NEW GAME on the console's controls.
  endCard: [24, 182, 342, 240],
  endCardLow: [24, 446, 342, 240],
  endBest: [16, 693, 358, 44],
  endHome: [16, 745, 182, 56],
  endNew: [206, 745, 168, 56],
} as const satisfies Record<string, Rect>;

export const OFFER_RECTS: readonly Rect[] = [R.offer0, R.offer1, R.offer2];

/** Seat x positions (spec: 17, 90, 163, 236, 309), y 110, 64 x 58. */
export const SEAT_X = [17, 90, 163, 236, 309] as const;
export const SEAT_Y = 110;
export const SEAT_W = 64;
export const SEAT_H = 58;
export const SEATS = 5;

export const MAP_X = R.map[0];
export const MAP_Y = R.map[1];

/**
 * Where the showcase (a score of 16x the target or more, stamped big over the map) is centred, in
 * frame px: in the half of the map away from the crisis, so it never covers the ring and its target
 * badge, and the score visibly travels into the ring afterwards. `crisisMapY` is the crisis pin's y
 * in map px (null: no crisis known, the upper half).
 */
export function showcaseAt(crisisMapY: number | null): { x: number; y: number } {
  const y = crisisMapY !== null && crisisMapY < R.map[3] / 2 ? 400 : 150;
  return { x: R.map[0] + R.map[2] / 2, y: R.map[1] + y };
}

export function centre(r: Rect): { x: number; y: number } {
  return { x: r[0] + r[2] / 2, y: r[1] + r[3] / 2 };
}

/** A rect as absolute-position CSS. */
export function rectStyle(r: Rect): { left: string; top: string; width: string; height: string } {
  return { left: `${r[0]}px`, top: `${r[1]}px`, width: `${r[2]}px`, height: `${r[3]}px` };
}

/** Which seat slot a dragged seat's centre x falls in. */
export function slotAt(centreX: number, count: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < count; i++) {
    const d = Math.abs(SEAT_X[i] + SEAT_W / 2 - centreX);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** The order seats show in while one is dragged from `from` towards slot `to`. */
export function dragOrder(count: number, from: number, to: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i).filter((i) => i !== from);
  order.splice(Math.max(0, Math.min(count - 1, to)), 0, from);
  return order;
}

/** Clamp a balloon of width w centred on x inside the 8 px frame margins. */
export function clampBalloonX(centreX: number, w: number): number {
  return Math.max(8, Math.min(FRAME_W - 8 - w, centreX - w / 2));
}

/**
 * How the frame meets the window. 'device': a phone that reports safe-area insets (an installed
 * app, a notch); the status band (0-47) and the home band (807-844) sit under the OS chrome.
 * 'browser': a phone browser with no insets (its own toolbars take the edges); only the live area
 * (47-807) is fitted, edge to edge. 'desk': a desktop window; the live area is fitted with a margin
 * of room around it, and the console is framed as an object set into the room.
 */
export type FitMode = 'device' | 'browser' | 'desk';

const NO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * Uniform scale that fits the frame in a window, plus the frame's top-left. In 'device' mode, if
 * the device's insets are larger than the frame's own bands at this scale, the frame shrinks to
 * keep the war room clear of them.
 */
export function fitFrame(
  winW: number,
  winH: number,
  insets: { top: number; bottom: number; left: number; right: number } = NO_INSETS,
  mode: FitMode = 'device',
): { scale: number; left: number; top: number } {
  const topBand = R.safeTop[3];
  const bottomBand = R.home[3];
  const live = FRAME_H - topBand - bottomBand;
  if (mode !== 'device') {
    const margin = mode === 'desk' ? 12 : 0;
    const s = Math.max(0.1, Math.min((winW - 2 * margin) / FRAME_W, (winH - 2 * margin) / live));
    return { scale: s, left: (winW - FRAME_W * s) / 2, top: (winH - live * s) / 2 - topBand * s };
  }
  const availW = Math.max(1, winW - insets.left - insets.right);
  let scale = Math.min(availW / FRAME_W, winH / FRAME_H);
  // The live area (47..807) must clear the insets.
  const need = (s: number) => Math.max(insets.top - topBand * s, 0) + Math.max(insets.bottom - bottomBand * s, 0);
  if (FRAME_H * scale + need(scale) > winH) {
    scale = Math.min(scale, (winH - insets.top - insets.bottom) / live);
  }
  scale = Math.max(0.1, scale);
  let top = (winH - FRAME_H * scale) / 2;
  if (top + topBand * scale < insets.top) top = insets.top - topBand * scale;
  const bottomEdge = top + (FRAME_H - bottomBand) * scale;
  if (bottomEdge > winH - insets.bottom) top -= bottomEdge - (winH - insets.bottom);
  const left = insets.left + (availW - FRAME_W * scale) / 2;
  return { scale, left, top };
}
