/**
 * The situation map's geometry, computed once from the thirty regions (src/thirty/ui/map/data.ts,
 * read-only) in map points (390 x 400), and the frame transform that puts the map on the sheet.
 *
 * The plates are the same Voronoi-in-coast construction the THIRTY DAYS map uses (the art
 * director's geo.json was written from it, so the paper mock's shapes are these shapes): per
 * landmass, the nearest pin of that mass, clipped to a coastline that is the spec outline with
 * rounded corners and two octaves of seeded noise. Hit testing is a 390 x 400 byte mask built
 * from the unrounded outlines plus the island discs. Pure: no DOM, so vitest runs it as is.
 */
import { ISLAND_R, MAP_H, MAP_W, MASSES, OUTLINES, REGION, REGIONS, SEA_LANES, type Mass, type Pt } from '../../../thirty/ui/map/data';
import { mulberry32 } from './rand';

export type RegionId = string;

export interface Segment {
  p: Pt;
  q: Pt;
}

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Geometry {
  /** The drawn coastline per landmass (rounded, noisy), map points. */
  coasts: Record<Mass, Pt[]>;
  /** The plate of every mainland region: its Voronoi cell clipped by the drawn coast. */
  plates: Record<RegionId, Pt[]>;
  /** Plate bounds (islands: the disc). */
  bounds: Record<RegionId, Bounds>;
  /** Sea lanes between region centres. */
  lanes: ReadonlyArray<readonly [RegionId, RegionId]>;
  /** Region index + 1 per map point (row-major, 390 x 400), 0 for sea. Built on first read. */
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

/** Corners rounded to 6 pt, resampled every 2.5 pt, pushed along the normal by two octaves of value noise. */
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

/** Build the geometry from scratch (getGeometry() caches it). */
export function computeGeometry(): Geometry {
  const coasts = {} as Record<Mass, Pt[]>;
  MASSES.forEach((m, i) => {
    coasts[m] = coastline(OUTLINES[m], 1009 + i * 7919);
  });

  const plates: Record<RegionId, Pt[]> = {};
  for (const mass of MASSES) {
    const pins = REGIONS.filter((r) => r.bloc === mass && !r.island);
    for (const p of pins) {
      let plate: Pt[] = coasts[mass];
      for (const q of pins) {
        if (q === p) continue;
        const nx = q.x - p.x;
        const ny = q.y - p.y;
        const c = (q.x * q.x + q.y * q.y - p.x * p.x - p.y * p.y) / 2;
        plate = clipHalf(plate, nx, ny, c);
      }
      plates[p.id] = plate;
    }
  }

  const bounds: Record<RegionId, Bounds> = {};
  for (const r of REGIONS) {
    if (r.island) bounds[r.id] = { x0: r.x - ISLAND_R, y0: r.y - ISLAND_R, x1: r.x + ISLAND_R, y1: r.y + ISLAND_R };
    else {
      const xs = plates[r.id].map((v) => v[0]);
      const ys = plates[r.id].map((v) => v[1]);
      bounds[r.id] = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    }
  }

  let mask: Uint8Array | null = null;
  return {
    coasts,
    plates,
    bounds,
    lanes: SEA_LANES,
    get mask() {
      return (mask ??= buildMask());
    },
  };
}

/** The region-ID mask from the spec's unrounded outlines (one byte per point, sampled at the point centre). */
function buildMask(): Uint8Array {
  const mask = new Uint8Array(MAP_W * MAP_H);
  for (const mass of MASSES) {
    const poly = OUTLINES[mass];
    const pins = REGIONS.filter((r) => r.bloc === mass && !r.island);
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

/** The geometry, built on first use and cached for the session. */
export function getGeometry(): Geometry {
  if (!cached) cached = computeGeometry();
  return cached;
}

// ------------------------------------------------------------------ hit testing (map points)

/** Region at a map point by one mask lookup, or null for sea. */
export function regionAt(geo: Geometry, x: number, y: number): RegionId | null {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= MAP_W || iy >= MAP_H) return null;
  const v = geo.mask[iy * MAP_W + ix];
  return v ? REGIONS[v - 1].id : null;
}

/** A sea tap this close to an island's disc edge (map points) still counts as the island. */
export const ISLAND_SLACK = 8;

/** Region under a map point: the mask, else the nearest island within its slack, else null. */
export function hitMap(geo: Geometry, x: number, y: number): RegionId | null {
  const here = regionAt(geo, x, y);
  if (here) return here;
  let best: RegionId | null = null;
  let bestD = Infinity;
  for (const r of REGIONS) {
    if (!r.island) continue;
    const d = Math.hypot(r.x - x, r.y - y) - ISLAND_R;
    if (d <= ISLAND_SLACK && d < bestD) {
      best = r.id;
      bestD = d;
    }
  }
  return best;
}

// ------------------------------------------------------------------ the frame

/** How the map (390 x 400 points) sits on the sheet (390 x 844 frame px): x as is, y stretched 1.08 and dropped 58. */
export interface FrameTransform {
  sx: number;
  sy: number;
  ox: number;
  oy: number;
}

/** The art director's frame: the sheet under the calendar and the title, above the desk objects. */
export const FRAME: FrameTransform = { sx: 1, sy: 1.08, ox: 0, oy: 58 };

/** The frame of the call mock: the same map pushed up 170 px so the Sound sits under the handset. */
export const CALL_SHIFT = -170;

/**
 * The band of the call frame where the sheet shows between the handset and the clock above and the
 * caller card below (frame px): a tested place is slid into it so the watcher sees the place the call
 * is about. The handset's bar and its shadow cross the band's upper left, so a place is kept right of
 * x 205 and its ring's top below them (y 116: the biggest red ring still ends above the caller card).
 */
export const CALL_BAND = { x0: 205, x1: 330, y: 116 } as const;

/**
 * What covers the sheet on the call (frame px), as parts.tsx and paper.css draw it: the handset off the hook (its bar,
 * its two cups and their shadow, its cord), the week's clock tag at the top right, and the caller card's top edge.
 * HANDSET_FOOT[x] is the lowest y the handset covers in the column x (-Infinity where it covers nothing).
 */
const HANDSET_FOOT: number[] = (() => {
  const foot = Array.from({ length: 392 }, () => -Infinity);
  const th = (-24 * Math.PI) / 180;
  const put = (u: number, v: number) => {
    const x = Math.round(150 + u * Math.cos(th) - v * Math.sin(th));
    const y = 78 + u * Math.sin(th) + v * Math.cos(th);
    if (x >= 0 && x < foot.length && y > foot[x]) foot[x] = y;
  };
  const rect = (u0: number, u1: number, v0: number, v1: number) => {
    for (let u = u0; u <= u1; u += 1) for (let v = v0; v <= v1; v += 1) put(u, v);
  };
  const ellipse = (cu: number, cv: number, ru: number, rv: number) => {
    for (let u = -ru; u <= ru; u += 1) for (let v = -rv; v <= rv; v += 1) if ((u / ru) ** 2 + (v / rv) ** 2 <= 1) put(cu + u, cv + v);
  };
  rect(-98, 98, -12, 12);
  ellipse(-104, 2, 31, 23);
  ellipse(104, 2, 31, 23);
  // The shadow, drawn 6 px left and 14 px down in the handset's own frame.
  rect(-102, 90, 4, 26);
  ellipse(-106, 18, 30, 22);
  ellipse(94, 18, 30, 22);
  // The cord, from the near cup off the frame's left edge.
  for (let t = 0; t <= 1; t += 0.02) {
    const x = Math.round(31 - 35 * t);
    for (let dx = -6; dx <= 6; dx++) if (x + dx >= 0 && x + dx < foot.length) foot[x + dx] = Math.max(foot[x + dx], 131 + 35 * t + 6);
  }
  return foot;
})();
/** The week's clock tag (frame px). */
const CALL_CLOCK = { x0: 238, y0: 8, x1: 382, y1: 68 };
/** The caller card's top edge at x (frame px; the card is turned a degree). */
const cardTop = (x: number) => 163 - 0.0192 * (x - 17);

/** Whether a frame point is hidden on the call: under the handset, the clock tag or the caller card, or off the frame. */
export function callHidden(x: number, y: number, margin = 2): boolean {
  if (x < margin || x > FRAME_W - margin || y < margin) return true;
  if (y > cardTop(x) - margin) return true;
  if (x >= CALL_CLOCK.x0 - margin && x <= CALL_CLOCK.x1 + margin && y >= CALL_CLOCK.y0 - margin && y <= CALL_CLOCK.y1 + margin) return true;
  for (let dx = -Math.ceil(margin); dx <= Math.ceil(margin); dx++) {
    const f = HANDSET_FOOT[Math.round(x) + dx];
    if (f !== undefined && y <= f + margin) return true;
  }
  return false;
}
const FRAME_W = 390;

/** The tested place's marks in the day frame (frame px): the TESTED word's boxes and the red ring round its place. */
export interface CallMarks {
  word: ReadonlyArray<{ x0: number; y0: number; x1: number; y1: number }>;
  ring: { cx: number; cy: number; rx: number; ry: number };
}

/** How much of the TESTED word and the red ring a shift leaves hidden: the word's share and the ring's. */
export function callCover(m: CallMarks, dx: number, dy: number): { word: number; ring: number } {
  let wn = 0;
  let wh = 0;
  for (const b of m.word) {
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 2; j++) {
        wn++;
        if (callHidden(b.x0 + ((b.x1 - b.x0) * i) / 4 + dx, b.y0 + ((b.y1 - b.y0) * j) / 2 + dy)) wh++;
      }
    }
  }
  let rh = 0;
  const RN = 32;
  for (let k = 0; k < RN; k++) {
    const a = (k * 2 * Math.PI) / RN;
    if (callHidden(m.ring.cx + m.ring.rx * Math.cos(a) + dx, m.ring.cy + m.ring.ry * Math.sin(a) + dy, 0)) rh++;
  }
  return { word: wn ? wh / wn : 0, ring: rh / RN };
}

/**
 * The sheet's shift for a call about `centre` (a place's centre in the day frame), or the mock's when no place is
 * named. Given the tested place's marks (`marks`, day-frame px), the place's centre goes into the band under the
 * handset as before, then the sheet slides the least it must so that the whole TESTED word, and as much of the red
 * ring as can be, show between the handset, the clock tag and the caller card (the look recheck: TESTED was under
 * the handset on 21 of 956 calls, Marram on 4 of 4).
 */
export function callShiftFor(centre: { x: number; y: number } | null, marks?: CallMarks | null): { x: number; y: number } {
  if (!centre) return { x: 0, y: CALL_SHIFT };
  // With the marks, the red ring's middle goes into the band (a long plate's ring sits far from its pin: Shoal's is 84 px below it).
  const c = marks ? { x: marks.ring.cx, y: marks.ring.cy } : centre;
  const x = c.x < CALL_BAND.x0 ? CALL_BAND.x0 - c.x : c.x > CALL_BAND.x1 ? CALL_BAND.x1 - c.x : 0;
  const base = { x: Math.round(x), y: Math.round(CALL_BAND.y - c.y) };
  if (!marks) return base;
  const at = callCover(marks, base.x, base.y);
  if (at.word === 0 && at.ring === 0) return base;
  let best = { dx: 0, dy: 0 };
  let bestCost = Infinity;
  const tryAt = (ddx: number, ddy: number) => {
    const move = (Math.abs(ddx) + Math.abs(ddy)) * 0.6;
    if (move >= bestCost) return;
    const c = callCover(marks, base.x + ddx, base.y + ddy);
    const cost = c.word * 1000 + c.ring * 200 + move;
    if (cost < bestCost) {
      bestCost = cost;
      best = { dx: ddx, dy: ddy };
    }
  };
  // A coarse search, then a fine one round the best of it.
  for (let ddy = -120; ddy <= 120; ddy += 6) for (let ddx = -150; ddx <= 150; ddx += 10) tryAt(ddx, ddy);
  const { dx: cx, dy: cy } = best;
  for (let ddy = cy - 6; ddy <= cy + 6; ddy += 1) for (let ddx = cx - 10; ddx <= cx + 10; ddx += 2) tryAt(ddx, ddy);
  return { x: base.x + best.dx, y: base.y + best.dy };
}

export function toFrame(f: FrameTransform, x: number, y: number): [number, number] {
  return [x * f.sx + f.ox, y * f.sy + f.oy];
}

export function toMap(f: FrameTransform, fx: number, fy: number): [number, number] {
  return [(fx - f.ox) / f.sx, (fy - f.oy) / f.sy];
}

/** The region's centre in frame px (its pin: inside its plate, or the island's middle). */
export function centreOf(f: FrameTransform, id: RegionId): { x: number; y: number } | null {
  const r = REGION[id];
  if (!r) return null;
  const [x, y] = toFrame(f, r.x, r.y);
  return { x, y };
}

export function boundsOf(geo: Geometry, f: FrameTransform, id: RegionId): Bounds | null {
  const b = geo.bounds[id];
  if (!b) return null;
  const [x0, y0] = toFrame(f, b.x0, b.y0);
  const [x1, y1] = toFrame(f, b.x1, b.y1);
  return { x0, y0, x1, y1 };
}

/** Region under a frame point (the finger), or null for the sea and the desk. */
export function hitFrame(geo: Geometry, f: FrameTransform, fx: number, fy: number): RegionId | null {
  const [x, y] = toMap(f, fx, fy);
  return hitMap(geo, x, y);
}

export { ISLAND_R, MAP_H, MAP_W, MASSES, OUTLINES, REGION, REGIONS, SEA_LANES };
export type { Mass, Pt };
