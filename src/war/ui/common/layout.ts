/**
 * The portrait layout (spec section 10). Rects are [x, y, w, h] in frame px on the 390 x 844
 * logical screen. Components position themselves from these, and the director aims flying
 * numbers with them, so nothing needs to measure the DOM.
 */

export type Rect = readonly [x: number, y: number, w: number, h: number];

export const FRAME_W = 390;
export const FRAME_H = 844;

export const R = {
  safeTop: [0, 0, 390, 47],
  board: [0, 47, 390, 60],
  rule: [0, 103, 390, 4],
  rail: [0, 107, 390, 64],
  map: [0, 171, 390, 520],
  readout: [0, 691, 390, 48],
  inf: [196, 695, 86, 40],
  mom: [300, 695, 74, 40],
  controls: [0, 739, 390, 68],
  swap: [16, 745, 96, 56],
  tray0: [120, 745, 52, 56],
  tray1: [178, 745, 52, 56],
  sweep: [238, 745, 136, 56],
  home: [0, 807, 390, 37],
  tray: [0, 451, 390, 356],
  offer0: [16, 489, 171, 150],
  offer1: [203, 489, 171, 150],
  folder: [16, 651, 171, 88],
  reroll: [203, 651, 171, 40],
  next: [203, 699, 171, 40],
  endCard: [24, 200, 342, 300],
  endButton: [24, 520, 342, 56],
} as const satisfies Record<string, Rect>;

/** Seat x positions (spec: 17, 90, 163, 236, 309), y 110, 64 x 58. */
export const SEAT_X = [17, 90, 163, 236, 309] as const;
export const SEAT_Y = 110;
export const SEAT_W = 64;
export const SEAT_H = 58;

/** Open folder cards: 110 x 150 at x 16, 140, 264, y 489. */
export const FOLDER_CARD_X = [16, 140, 264] as const;

export const MAP_X = R.map[0];
export const MAP_Y = R.map[1];

export function centre(r: Rect): { x: number; y: number } {
  return { x: r[0] + r[2] / 2, y: r[1] + r[3] / 2 };
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
