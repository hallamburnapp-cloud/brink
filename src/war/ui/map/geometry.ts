/**
 * Map geometry, computed once and cached (spec section 1, REGION CELLS and HIT TESTING):
 * - Voronoi cells per landmass (nearest pin of the same landmass), clipped to the coast;
 * - the drawn coastline (STYLE 5.7: rounded corners plus a fine seeded chart edge);
 * - border pieces (the shared cell edges inside the coast), causeway bars and sea lanes;
 * - a region-ID mask (390 x 520, one byte per point) built from the spec's unrounded outlines;
 * - hit testing on that mask.
 * Pure: no DOM, so the unit tests and node timing run it directly.
 */
import type { RegionId } from './contract';
import {
  ISLAND_R,
  LAND_JOINS,
  MAP_H,
  MAP_W,
  MASSES,
  OUTLINES,
  REGION,
  REGIONS,
  SEA_LANES,
  isIsland,
  type Mass,
  type Pt,
} from './data';
import { mulberry32 } from './rand';

export interface Segment {
  p: Pt;
  q: Pt;
}

/** A border between two regions of one landmass: the pieces of their shared cell edge inside the coast. */
export interface Border {
  a: RegionId;
  b: RegionId;
  pieces: Segment[];
}

/** A Scatter causeway: a bar from disc edge to disc edge. */
export interface Causeway {
  a: RegionId;
  b: RegionId;
  p: Pt;
  q: Pt;
}

export interface Lane {
  a: RegionId;
  b: RegionId;
}

export type Shape = { kind: 'poly'; pts: Pt[] } | { kind: 'disc'; x: number; y: number; r: number };

export interface Geometry {
  /** Drawn coastline per landmass. */
  coasts: Record<Mass, Pt[]>;
  /** Voronoi cell per mainland region (clipped to the landmass bounds grown 12 pt). */
  cells: Record<RegionId, Pt[]>;
  /** The plate each region is drawn as: its cell clipped by the drawn coast, or its island disc. */
  shapes: Record<RegionId, Shape>;
  /** Plate bounds, for small offscreen layers. */
  bounds: Record<RegionId, { x0: number; y0: number; x1: number; y1: number }>;
  borders: Border[];
  causeways: Causeway[];
  lanes: Lane[];
  /** Region index + 1 per map point (row-major, 390 x 520), 0 for sea. Built on first read. */
  readonly mask: Uint8Array;
}

// ------------------------------------------------------------------ polygon helpers

/** Sutherland-Hodgman against one half-plane: keep points with nx*x + ny*y <= c. */
function clipHalf(poly: Pt[], nx: number, ny: number, c: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const dp = nx * p[0] + ny * p[1] - c;
    const dq = nx * q[0] + ny * q[1] - c;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/** Even-odd point in polygon. */
export function insidePoly(poly: readonly Pt[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Parts of segment pq inside a (possibly concave) polygon. */
function clipSegmentToPoly(p: Pt, q: Pt, poly: readonly Pt[]): Segment[] {
  const ts = [0, 1];
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den;
    const u = ((a[0] - p[0]) * dy - (a[1] - p[1]) * dx) / den;
    if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t);
  }
  ts.sort((x, y) => x - y);
  const out: Segment[] = [];
  for (let i = 0; i + 1 < ts.length; i++) {
    const t0 = ts[i];
    const t1 = ts[i + 1];
    if (t1 - t0 < 1e-6) continue;
    const tm = (t0 + t1) / 2;
    if (!insidePoly(poly, p[0] + dx * tm, p[1] + dy * tm)) continue;
    const s: Pt = [p[0] + dx * t0, p[1] + dy * t0];
    const e: Pt = [p[0] + dx * t1, p[1] + dy * t1];
    const last = out[out.length - 1];
    if (last && Math.abs(last.q[0] - s[0]) < 1e-9 && Math.abs(last.q[1] - s[1]) < 1e-9) last.q = e;
    else out.push({ p: s, q: e });
  }
  return out;
}

// ------------------------------------------------------------------ coastline

function roundCorners(poly: readonly Pt[], radius: number): Pt[] {
  const out: Pt[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[(i - 1 + n) % n];
    const c = poly[i];
    const q = poly[(i + 1) % n];
    const l1 = Math.hypot(c[0] - p[0], c[1] - p[1]);
    const l2 = Math.hypot(q[0] - c[0], q[1] - c[1]);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    const a: Pt = [c[0] + ((p[0] - c[0]) / l1) * r, c[1] + ((p[1] - c[1]) / l1) * r];
    const b: Pt = [c[0] + ((q[0] - c[0]) / l2) * r, c[1] + ((q[1] - c[1]) / l2) * r];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      out.push([
        (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
        (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
      ]);
    }
  }
  return out;
}

function resample(pts: readonly Pt[], step: number): Pt[] {
  const out: Pt[] = [];
  let carry = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let d = carry;
    while (d < l) {
      out.push([a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l]);
      d += step;
    }
    carry = d - l;
  }
  return out;
}

/**
 * The drawn coast (STYLE 5.7, Coastline): corners rounded to 6 pt, resampled every 2.5 pt and
 * pushed along the normal by two octaves of periodic value noise (1.1 pt over about 12 pt, 0.45 pt
 * over about 5 pt). Internal borders stay straight bisectors, so the drawn joins are unchanged.
 */
function coastline(poly: readonly Pt[], seed: number): Pt[] {
  const pts = resample(roundCorners(poly, 6), 2.5);
  const rnd = mulberry32(seed);
  const n = pts.length;
  const octave = (period: number, amp: number) => {
    const k = Math.max(3, Math.round(n / period));
    const v = Array.from({ length: k }, () => rnd() * 2 - 1);
    return (i: number) => {
      const x = (i / n) * k;
      const a = Math.floor(x) % k;
      const f = x - Math.floor(x);
      const s = f * f * (3 - 2 * f);
      return (v[a] * (1 - s) + v[(a + 1) % k] * s) * amp;
    };
  };
  const o1 = octave(5, 1.1);
  const o2 = octave(2, 0.45);
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    const d = o1(i) + o2(i);
    return [p[0] + (ty / l) * d, p[1] - (tx / l) * d] as Pt;
  });
}

// ------------------------------------------------------------------ build

const EPS = 1e-6;

/** Build the geometry from scratch (getGeometry() caches it). Exported for timing. */
export function computeGeometry(): Geometry {
  const coasts = {} as Record<Mass, Pt[]>;
  MASSES.forEach((m, i) => {
    coasts[m] = coastline(OUTLINES[m], 1009 + i * 7919);
  });

  const cells: Record<RegionId, Pt[]> = {};
  const shapes: Record<RegionId, Shape> = {};
  const borders: Border[] = [];

  for (const mass of MASSES) {
    const outline = OUTLINES[mass];
    const pins = REGIONS.filter((r) => r.colour === mass && !r.island);
    const xs = outline.map((v) => v[0]);
    const ys = outline.map((v) => v[1]);
    // The bounding box grown 12 pt: the drawn coast wanders a little outside the outline.
    const x0 = Math.min(...xs) - 12;
    const x1 = Math.max(...xs) + 12;
    const y0 = Math.min(...ys) - 12;
    const y1 = Math.max(...ys) + 12;
    for (const p of pins) {
      let cell: Pt[] = [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ];
      let plate: Pt[] = coasts[mass];
      for (const q of pins) {
        if (q === p) continue;
        const nx = q.x - p.x;
        const ny = q.y - p.y;
        const c = (q.x * q.x + q.y * q.y - p.x * p.x - p.y * p.y) / 2;
        cell = clipHalf(cell, nx, ny, c);
        plate = clipHalf(plate, nx, ny, c);
      }
      cells[p.id] = cell;
      shapes[p.id] = { kind: 'poly', pts: plate };
    }
    // Shared edges: the edge of p's cell that lies on the bisector of p and q.
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        const p = pins[i];
        const q = pins[j];
        const nx = q.x - p.x;
        const ny = q.y - p.y;
        const nl = Math.hypot(nx, ny);
        const c = (q.x * q.x + q.y * q.y - p.x * p.x - p.y * p.y) / 2;
        const on = (v: Pt) => Math.abs(nx * v[0] + ny * v[1] - c) / nl < EPS * 1000;
        const cell = cells[p.id];
        for (let k = 0; k < cell.length; k++) {
          const a = cell[k];
          const b = cell[(k + 1) % cell.length];
          if (!on(a) || !on(b) || Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-6) continue;
          const pieces = clipSegmentToPoly(a, b, coasts[mass]);
          if (pieces.length) borders.push({ a: p.id, b: q.id, pieces });
        }
      }
    }
  }

  for (const r of REGIONS) {
    if (r.island) shapes[r.id] = { kind: 'disc', x: r.x, y: r.y, r: ISLAND_R };
  }

  const bounds: Geometry['bounds'] = {};
  for (const r of REGIONS) {
    const s = shapes[r.id];
    if (s.kind === 'disc') bounds[r.id] = { x0: s.x - s.r, y0: s.y - s.r, x1: s.x + s.r, y1: s.y + s.r };
    else {
      const xs = s.pts.map((v) => v[0]);
      const ys = s.pts.map((v) => v[1]);
      bounds[r.id] = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    }
  }

  const causeways: Causeway[] = [];
  for (const [a, b] of LAND_JOINS) {
    if (!(isIsland(a) && isIsland(b))) continue;
    const A = REGION[a];
    const B = REGION[b];
    const d = Math.hypot(B.x - A.x, B.y - A.y);
    const ux = (B.x - A.x) / d;
    const uy = (B.y - A.y) / d;
    causeways.push({
      a,
      b,
      p: [A.x + ux * ISLAND_R, A.y + uy * ISLAND_R],
      q: [B.x - ux * ISLAND_R, B.y - uy * ISLAND_R],
    });
  }

  const lanes: Lane[] = SEA_LANES.map(([a, b]) => ({ a, b }));

  // The mask is only needed for hit testing, so it stays off the first paint's critical path.
  let mask: Uint8Array | null = null;
  return {
    coasts,
    cells,
    shapes,
    bounds,
    borders,
    causeways,
    lanes,
    get mask() {
      return (mask ??= buildMask());
    },
  };
}

/**
 * The region-ID mask from the spec's unrounded outlines (one byte per point, sampled at the point
 * centre). Scanline fill: per row, the outline's crossings give the land spans. Along a row the
 * nearest pin changes only where two pins' distances cross, which is linear in x, so each span is
 * filled run by run instead of testing every pin at every point.
 */
function buildMask(): Uint8Array {
  const mask = new Uint8Array(MAP_W * MAP_H);
  for (const mass of MASSES) {
    const poly = OUTLINES[mass];
    const pins = REGIONS.filter((r) => r.colour === mass && !r.island);
    const n = pins.length;
    const pxs = new Float64Array(n);
    const pys = new Float64Array(n);
    const ids = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      pxs[i] = pins[i].x;
      pys[i] = pins[i].y;
      ids[i] = pins[i].index + 1;
    }
    const dy2 = new Float64Array(n);
    let yStart = Infinity;
    let yEnd = -Infinity;
    for (const v of poly) {
      yStart = Math.min(yStart, v[1]);
      yEnd = Math.max(yEnd, v[1]);
    }
    const crossings: number[] = [];
    for (let y = Math.max(0, Math.floor(yStart)); y <= Math.min(MAP_H - 1, Math.ceil(yEnd)); y++) {
      const py = y + 0.5;
      crossings.length = 0;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0];
        const yi = poly[i][1];
        const xj = poly[j][0];
        const yj = poly[j][1];
        if (yi > py !== yj > py) crossings.push(((xj - xi) * (py - yi)) / (yj - yi) + xi);
      }
      crossings.sort((a, b) => a - b);
      for (let i = 0; i < n; i++) dy2[i] = (pys[i] - py) * (pys[i] - py);
      const row = y * MAP_W;
      for (let k = 0; k + 1 < crossings.length; k += 2) {
        // Point centres inside the span [crossings[k], crossings[k+1]).
        let x = Math.max(0, Math.ceil(crossings[k] - 0.5));
        const end = Math.min(MAP_W, Math.ceil(crossings[k + 1] - 0.5));
        while (x < end) {
          const px = x + 0.5;
          let best = 0;
          let bestD = Infinity;
          for (let i = 0; i < n; i++) {
            const d = (pxs[i] - px) * (pxs[i] - px) + dy2[i];
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          }
          // Moving east, only pins further east can take over; find the first point where one does.
          let next = end;
          const xb = pxs[best];
          for (let i = 0; i < n; i++) {
            if (pxs[i] <= xb) continue;
            const cross = (pxs[i] * pxs[i] + dy2[i] - xb * xb - dy2[best]) / (2 * (pxs[i] - xb));
            const k2 = Math.floor(cross - 0.5) + 1;
            if (k2 > x && k2 < next) next = k2;
          }
          mask.fill(ids[best], row + x, row + next);
          x = next;
        }
      }
    }
  }
  for (const r of REGIONS) {
    if (!r.island) continue;
    const R2 = ISLAND_R * ISLAND_R;
    for (let y = Math.floor(r.y - ISLAND_R); y <= Math.ceil(r.y + ISLAND_R); y++) {
      for (let x = Math.floor(r.x - ISLAND_R); x <= Math.ceil(r.x + ISLAND_R); x++) {
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        const dx = x + 0.5 - r.x;
        const dy = y + 0.5 - r.y;
        if (dx * dx + dy * dy <= R2) mask[y * MAP_W + x] = r.index + 1;
      }
    }
  }
  return mask;
}

let cached: Geometry | null = null;

/** The geometry, built on first use (well under 40 ms, mask included) and cached for the session. */
export function getGeometry(): Geometry {
  if (!cached) cached = computeGeometry();
  return cached;
}

// ------------------------------------------------------------------ hit testing

/** Region at a map point by one mask lookup, or null for sea. */
export function regionAt(geo: Geometry, x: number, y: number): RegionId | null {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= MAP_W || iy >= MAP_H) return null;
  const v = geo.mask[iy * MAP_W + ix];
  return v ? REGIONS[v - 1].id : null;
}

/** Sea taps snap to the nearest preferred pin within this distance (spec 1). */
export const SEA_SNAP = 30;
/** Island hit circle radius for taps on the sea (spec 1: islands use a 44 pt hit circle). */
export const ISLAND_HIT = 44;
/** How far a tap may be from a preferred region's edge and still choose it over its neighbour. */
const NEAR = 6;
/** On a sea tap, land this close to the tap counts as tapped. */
const NEAR_SEA = 8;

const RING_DIRS = Array.from({ length: 16 }, (_, i) => [Math.cos((i * Math.PI) / 8), Math.sin((i * Math.PI) / 8)]);

/** Regions found on rings around the tap, each with the smallest ring radius it appeared on. */
function nearbyLand(geo: Geometry, x: number, y: number, maxR: number): Map<RegionId, number> {
  const found = new Map<RegionId, number>();
  for (let r = 1.5; r <= maxR + 1e-9; r += 1.5) {
    for (const [dx, dy] of RING_DIRS) {
      const id = regionAt(geo, x + dx * r, y + dy * r);
      if (id && !found.has(id)) found.set(id, r);
    }
  }
  return found;
}

/**
 * Region under a tap (spec 1, HIT TESTING):
 * - land: one mask lookup; if that region is not preferred but a preferred one lies within 6 pt,
 *   the preferred one wins (so a tap on a border picks the lit side);
 * - sea: the nearest preferred pin within 30 pt, or preferred land within 8 pt, or a preferred
 *   island within its 44 pt hit circle; failing those, any land within 8 pt or island within 44 pt.
 * `prefer` is the set the player can act on: lit and pinned regions, or an armed Order's targets.
 */
export function hitTest(geo: Geometry, x: number, y: number, prefer: ReadonlySet<RegionId>): RegionId | null {
  if (!(x >= 0 && y >= 0 && x < MAP_W && y < MAP_H)) return null;
  const here = regionAt(geo, x, y);
  if (here) {
    if (prefer.has(here)) return here;
    let best: RegionId | null = null;
    let bestD = Infinity;
    for (const [id, d] of nearbyLand(geo, x, y, NEAR)) {
      if (prefer.has(id) && d < bestD) {
        best = id;
        bestD = d;
      }
    }
    return best ?? here;
  }

  // Sea: gather candidates with a distance each (to the pin, the land or the island's edge).
  const candidates: Array<{ id: RegionId; d: number }> = [];
  for (const r of REGIONS) {
    const d = Math.hypot(r.x - x, r.y - y);
    if (prefer.has(r.id) && d <= SEA_SNAP) candidates.push({ id: r.id, d });
    if (r.island && d <= ISLAND_HIT) candidates.push({ id: r.id, d: Math.max(0, d - ISLAND_R) });
  }
  for (const [id, d] of nearbyLand(geo, x, y, NEAR_SEA)) candidates.push({ id, d });
  const pick = (list: Array<{ id: RegionId; d: number }>) =>
    list.reduce<{ id: RegionId; d: number } | null>((b, c) => (!b || c.d < b.d ? c : b), null)?.id ?? null;
  return pick(candidates.filter((c) => prefer.has(c.id))) ?? pick(candidates);
}

/** How far past a plate's bounds a partial repaint reaches (map points): its rim, glow and shadow. */
export const REPAINT_PAD = 4;

/**
 * A plate's partial-repaint clip in whole device pixels: its bounds grown by REPAINT_PAD, scaled by
 * the layer's backing scale `k`, snapped outward and kept on the layer. A clip edge that falls
 * inside a device pixel is anti-aliased, and repainting translucent layers through it blends them
 * over the old pixel twice: hairline seams that stay until the next full bake.
 */
export function deviceClip(
  b: { x0: number; y0: number; x1: number; y1: number },
  k: number,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } {
  const x0 = Math.max(0, Math.floor((b.x0 - REPAINT_PAD) * k));
  const y0 = Math.max(0, Math.floor((b.y0 - REPAINT_PAD) * k));
  const x1 = Math.min(width, Math.ceil((b.x1 + REPAINT_PAD) * k));
  const y1 = Math.min(height, Math.ceil((b.y1 + REPAINT_PAD) * k));
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}
