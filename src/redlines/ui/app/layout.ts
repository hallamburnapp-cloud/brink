/**
 * The frame: the 390 x 844 paper situation room (docs/redlines/looks/paper), fitted whole to the
 * window and letterboxed on a dark desk. The look fills the frame edge to edge (the calendar at the
 * top, the tape at the foot), so unlike THIRTY DAYS nothing of it is cropped for a browser's bars:
 * the whole sheet is scaled to fit inside the safe area, and on a desk it keeps a margin of desk.
 * Pure, so it has tests.
 */
export const FRAME_W = 390;
export const FRAME_H = 844;

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const NO_INSETS: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

/** 'phone': fitted edge to edge inside the insets. 'desk': a desktop window, with a margin of desk around the frame. */
export type FitMode = 'phone' | 'desk';

export const DESK_MARGIN = 24;

export interface Fit {
  scale: number;
  left: number;
  top: number;
}

/** Uniform scale that fits the whole frame in the window's safe area, and the frame's top-left. */
export function fitFrame(winW: number, winH: number, insets: Insets = NO_INSETS, mode: FitMode = 'phone'): Fit {
  const margin = mode === 'desk' ? DESK_MARGIN : 0;
  const availW = Math.max(1, winW - insets.left - insets.right - 2 * margin);
  const availH = Math.max(1, winH - insets.top - insets.bottom - 2 * margin);
  const scale = Math.max(0.1, Math.min(availW / FRAME_W, availH / FRAME_H));
  const left = insets.left + margin + (availW - FRAME_W * scale) / 2;
  const top = insets.top + margin + (availH - FRAME_H * scale) / 2;
  return { scale, left, top };
}

/** A window point to frame px, given where the frame sits. */
export function toFramePoint(clientX: number, clientY: number, fit: Fit): { x: number; y: number } {
  return { x: (clientX - fit.left) / fit.scale, y: (clientY - fit.top) / fit.scale };
}
