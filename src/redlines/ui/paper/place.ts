/**
 * Where the hand puts a mark so it reads: a word, a counter or a pin is offered a few spots round its
 * place (under, above, beside) and takes the first that is clear of what is already printed or put
 * down (the names, the bloc titles, the other islands, the pins, the counters, the other words), or
 * the least covered of them. Boxes are frame px. Pure, so it has tests.
 */
import type { Bounds } from './geometry';

export type Box = Bounds;

export interface Obstacle {
  /** The obstacle's bounds (for a ring: the ellipse's, grown by the band). */
  box: Box;
  /** How much an overlap with this costs per px² (a printed name more than a neighbour's plate). */
  weight: number;
  /** A ring instead of a box: the whole ellipse, or (with `band`) only its stroke, `band` px either side of the line. */
  ellipse?: Ellipse;
  band?: number;
}

export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** A ring as an obstacle: the whole of it (nothing may sit inside), or only its stroke (`band` px either side). */
export function ringObstacle(e: Ellipse, weight: number, band?: number): Obstacle {
  const g = band ?? 0;
  return { box: { x0: e.cx - e.rx - g, y0: e.cy - e.ry - g, x1: e.cx + e.rx + g, y1: e.cy + e.ry + g }, weight, ellipse: e, band };
}

/** How much of box `b` an obstacle covers (px²): the boxes' overlap, or for a ring the part of `b` inside it (sampled every 1.5 px). */
export function covers(b: Box, o: Obstacle): number {
  const a = overlap(b, o.box);
  if (!a || !o.ellipse) return a;
  const { cx, cy, rx, ry } = o.ellipse;
  const x0 = Math.max(b.x0, o.box.x0);
  const x1 = Math.min(b.x1, o.box.x1);
  const y0 = Math.max(b.y0, o.box.y0);
  const y1 = Math.min(b.y1, o.box.y1);
  const nx = Math.max(1, Math.round((x1 - x0) / 1.5));
  const ny = Math.max(1, Math.round((y1 - y0) / 1.5));
  let inside = 0;
  for (let i = 0; i < nx; i++) {
    const x = x0 + ((i + 0.5) * (x1 - x0)) / nx;
    for (let j = 0; j < ny; j++) {
      const y = y0 + ((j + 0.5) * (y1 - y0)) / ny;
      const dx = x - cx;
      const dy = y - cy;
      const q = (dx / rx) ** 2 + (dy / ry) ** 2;
      if (o.band === undefined) {
        if (q <= 1) inside++;
      } else {
        // The distance to the line along the ray from the centre.
        const d = q > 0 ? Math.hypot(dx, dy) * (1 - 1 / Math.sqrt(q)) : -Math.min(rx, ry);
        if (Math.abs(d) <= o.band) inside++;
      }
    }
  }
  return (inside / (nx * ny)) * a;
}

export interface Spot {
  x: number;
  y: number;
  /** Extra cost for taking this spot rather than the first (the preferred one costs 0). */
  rank: number;
}

/** The overlap area of two boxes. */
export function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

export function box(x0: number, y0: number, x1: number, y1: number): Box {
  return { x0, y0, x1, y1 };
}

/** A box centred on a point. */
export function around(x: number, y: number, w: number, h: number): Box {
  return { x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 };
}

/** The frame the marks must stay inside (the sheet's width; the foot is where the note begins). */
export const FRAME_BOX: Box = { x0: 4, y0: 50, x1: 386, y1: 496 };

/** How far a box pokes out of the frame, as an area. */
function outside(b: Box, frame: Box): number {
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  let a = 0;
  if (b.x0 < frame.x0) a += (frame.x0 - b.x0) * h;
  if (b.x1 > frame.x1) a += (b.x1 - frame.x1) * h;
  if (b.y0 < frame.y0) a += (frame.y0 - b.y0) * w;
  if (b.y1 > frame.y1) a += (b.y1 - frame.y1) * w;
  return a;
}

/** The cost of a box at a spot: what it covers, weighted, and what it leaves the frame by. */
export function costOf(b: Box, obstacles: readonly Obstacle[], frame: Box = FRAME_BOX): number {
  let c = outside(b, frame) * 4;
  for (const o of obstacles) c += covers(b, o) * o.weight;
  return c;
}

/**
 * Pick the spot whose box costs least (its own rank added, so a clear preferred spot wins and a spot
 * further down the list is taken only when it is clearer). `boxAt` gives the mark's box at a spot.
 */
export function pickSpot(spots: readonly Spot[], boxAt: (s: Spot) => Box, obstacles: readonly Obstacle[], frame: Box = FRAME_BOX): Spot {
  return pickSpotCost(spots, boxAt, obstacles, frame).spot;
}

/** As pickSpot, with the winning spot's cost (so a set of words can be placed in the order that costs least overall). */
export function pickSpotCost(spots: readonly Spot[], boxAt: (s: Spot) => Box, obstacles: readonly Obstacle[], frame: Box = FRAME_BOX): { spot: Spot; cost: number } {
  let best = spots[0];
  let bestCost = Infinity;
  for (const s of spots) {
    const c = costOf(boxAt(s), obstacles, frame) + s.rank;
    if (c < bestCost) {
      bestCost = c;
      best = s;
    }
  }
  return { spot: best, cost: bestCost };
}

/** Every order of a short list (three promises at most: six orders). */
export function orders<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  const out: T[][] = [];
  items.forEach((it, i) => {
    for (const rest of orders([...items.slice(0, i), ...items.slice(i + 1)])) out.push([it, ...rest]);
  });
  return out;
}

/** Keep a box's centre so the box lies inside the frame (when it fits). */
export function clampInto(x: number, y: number, w: number, h: number, frame: Box = FRAME_BOX): { x: number; y: number } {
  const cx = Math.max(frame.x0 + w / 2, Math.min(frame.x1 - w / 2, x));
  const cy = Math.max(frame.y0 + h / 2, Math.min(frame.y1 - h / 2, y));
  return { x: cx, y: cy };
}
