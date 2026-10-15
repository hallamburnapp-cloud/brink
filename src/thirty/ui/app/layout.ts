/**
 * The portrait layout (SPEC "The screen"): the 390 x 844 logical frame and the four rects on it.
 * Exactly four things are drawn on the game screen, top to bottom: the strip, the map, the team
 * row and the card. Components position themselves from these rects; nothing measures the DOM.
 */

export type Rect = readonly [x: number, y: number, w: number, h: number];

export const FRAME_W = 390;
export const FRAME_H = 844;

export const R = {
  /** Under the phone's status bar. */
  safeTop: [0, 0, 390, 47],
  /** DAY n OF 30 on the left, the DANGER gauge on the right, the menu button at the far left. */
  strip: [0, 47, 390, 56],
  menu: [8, 59, 32, 32],
  day: [48, 47, 120, 56],
  /** The 200 pt gauge: DANGER above the bar, the number at the needle. */
  gauge: [174, 47, 200, 56],
  /** The 30-region world, redrawn at this height. */
  map: [0, 103, 390, 400],
  /** Up to five chips; hidden until one is held. */
  team: [0, 507, 390, 40],
  /** The adviser, the message and the two buttons (or the offer, or the ending). */
  card: [0, 551, 390, 256],
  button: [16, 0, 358, 56],
  /** Under the phone's home indicator. */
  home: [0, 807, 390, 37],
} as const satisfies Record<string, Rect>;

export const MAP_X = R.map[0];
export const MAP_Y = R.map[1];
export const MAP_W = R.map[2];
export const MAP_H = R.map[3];

/** A rect as absolute-position CSS. */
export function rectStyle(r: Rect): { left: string; top: string; width: string; height: string } {
  return { left: `${r[0]}px`, top: `${r[1]}px`, width: `${r[2]}px`, height: `${r[3]}px` };
}

/**
 * How the frame meets the window. 'device': a phone that reports safe-area insets (an installed
 * app, a notch); the status band (0-47) and the home band (807-844) sit under the OS chrome.
 * 'browser': a phone browser with no insets (its own toolbars take the edges); only the live area
 * (47-807) is fitted, edge to edge. 'desk': a desktop window; the live area is fitted with a
 * margin of table around it.
 */
export type FitMode = 'device' | 'browser' | 'desk';

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const NO_INSETS: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * Uniform scale that fits the frame in a window, plus the frame's top-left. In 'device' mode, if
 * the device's insets are larger than the frame's own bands at this scale, the frame shrinks to
 * keep the live area clear of them.
 */
export function fitFrame(winW: number, winH: number, insets: Insets = NO_INSETS, mode: FitMode = 'device'): { scale: number; left: number; top: number } {
  const topBand = R.safeTop[3];
  const bottomBand = R.home[3];
  const live = FRAME_H - topBand - bottomBand;
  if (mode !== 'device') {
    const margin = mode === 'desk' ? 16 : 0;
    const s = Math.max(0.1, Math.min((winW - 2 * margin) / FRAME_W, (winH - 2 * margin) / live));
    return { scale: s, left: (winW - FRAME_W * s) / 2, top: (winH - live * s) / 2 - topBand * s };
  }
  const availW = Math.max(1, winW - insets.left - insets.right);
  let scale = Math.min(availW / FRAME_W, winH / FRAME_H);
  const need = (s: number) => Math.max(insets.top - topBand * s, 0) + Math.max(insets.bottom - bottomBand * s, 0);
  if (FRAME_H * scale + need(scale) > winH) scale = Math.min(scale, (winH - insets.top - insets.bottom) / live);
  scale = Math.max(0.1, scale);
  let top = (winH - FRAME_H * scale) / 2;
  if (top + topBand * scale < insets.top) top = insets.top - topBand * scale;
  const bottomEdge = top + (FRAME_H - bottomBand) * scale;
  if (bottomEdge > winH - insets.bottom) top -= bottomEdge - (winH - insets.bottom);
  const left = insets.left + (availW - FRAME_W * scale) / 2;
  return { scale, left, top };
}
