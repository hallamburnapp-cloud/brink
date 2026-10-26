/**
 * Where a slip goes on the sheet (frame px) so it does not cover what the finger needs next: the MOVE
 * slip must leave every place the counter can move to tappable, so it is offered a few spots round
 * the counter (right, left, under, over) and the first clear of them all is taken; a slip with
 * nothing to avoid goes under its place. Pure, so it has tests.
 */

export interface Pt {
  x: number;
  y: number;
}

export interface SlipPos {
  left: number;
  top: number;
}

/** The sheet the slips lie on: inside the frame's sides, under the calendar, above the note. */
export const SHEET = { x0: 8, y0: 52, x1: 382, y1: 496 } as const;

/** A place is clear of a slip when its centre is this far outside the slip (a fingertip). */
export const CLEAR_PX = 16;

function fitLeft(left: number, width: number): number {
  return Math.max(SHEET.x0, Math.min(SHEET.x1 - width, left));
}
function fitTop(top: number, height: number): number {
  return Math.max(SHEET.y0, Math.min(SHEET.y1 - height, top));
}

/** How many of the points the slip at (left, top) would cover (with the fingertip's margin). */
export function covered(pos: SlipPos, width: number, height: number, avoid: readonly Pt[]): number {
  let n = 0;
  for (const p of avoid) {
    if (p.x >= pos.left - CLEAR_PX && p.x <= pos.left + width + CLEAR_PX && p.y >= pos.top - CLEAR_PX && p.y <= pos.top + height + CLEAR_PX) n++;
  }
  return n;
}

/**
 * The slip's spot: under its anchor (the place held, the counter lifted) when nothing it must leave clear
 * is there; else right of it, left of it, over it, then the sheet's foot and its head. The least
 * covering spot wins when none is clear.
 */
export function placeSlip(anchor: Pt, width: number, height: number, avoid: readonly Pt[] = []): SlipPos {
  const spots: SlipPos[] = [
    { left: anchor.x - width / 2, top: anchor.y + 30 },
    { left: anchor.x + 28, top: anchor.y - height / 2 },
    { left: anchor.x - 28 - width, top: anchor.y - height / 2 },
    { left: anchor.x - width / 2, top: anchor.y - 30 - height },
    { left: anchor.x - width / 2, top: SHEET.y1 - height },
    { left: anchor.x - width / 2, top: SHEET.y0 },
  ].map((s) => ({ left: fitLeft(s.left, width), top: fitTop(s.top, height) }));
  let best = spots[0];
  let bestN = Infinity;
  for (const s of spots) {
    const n = covered(s, width, height, avoid);
    if (n < bestN) {
      best = s;
      bestN = n;
      if (n === 0) break;
    }
  }
  return best;
}
