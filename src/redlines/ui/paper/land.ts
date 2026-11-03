/**
 * Whose land a mark is near: the sheet's land (every plate and island disc, as `geom.regionAt` reads it) on a grid of
 * 2 px cells, and for any place, lazily, the distance from each cell to that place's own land and to anyone else's
 * (two-pass chamfer). A hand-written WE DEFEND reads as the place whose land or ring it is nearest (the look critic's
 * whose-is-it test: another island's coast or another plate nearer than the word's own ring and its own land), so
 * arrange.ts asks how near the word's box comes to each. Pure: no DOM; one grid per sheet, built on first use.
 */
import type { Box } from './place';
import type { SheetGeom } from './sheet';
import type { RegionId } from './contract';

const CELL = 2;
const W = Math.ceil(392 / CELL);
const H = Math.ceil(520 / CELL);
/** Distances are kept in quarter px, capped (only the near land matters). */
const CAP = 255;

interface Field {
  /** Each cell's owner (an index into `ids`), or -1 for the sea and the desk. */
  owner: Int16Array;
  ids: RegionId[];
  own: Map<RegionId, Uint8Array>;
  other: Map<RegionId, Uint8Array>;
}

const fields = new WeakMap<SheetGeom, Field>();

function fieldOf(geom: SheetGeom): Field {
  let f = fields.get(geom);
  if (f) return f;
  const ids = Object.keys(geom.shape);
  const index = new Map(ids.map((id, i) => [id, i]));
  const owner = new Int16Array(W * H).fill(-1);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const r = geom.regionAt(i * CELL + CELL / 2, j * CELL + CELL / 2);
      owner[j * W + i] = r ? (index.get(r) ?? -1) : -1;
    }
  }
  f = { owner, ids, own: new Map(), other: new Map() };
  fields.set(geom, f);
  return f;
}

/** The chamfer distance (quarter px, capped) from every cell to the cells `hit` accepts. */
function chamfer(owner: Int16Array, hit: (o: number) => boolean): Uint8Array {
  const d = new Float32Array(W * H).fill(1e6);
  for (let k = 0; k < d.length; k++) if (hit(owner[k])) d[k] = 0;
  const D = Math.SQRT2;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      let v = d[k];
      if (i > 0 && d[k - 1] + 1 < v) v = d[k - 1] + 1;
      if (j > 0) {
        if (d[k - W] + 1 < v) v = d[k - W] + 1;
        if (i > 0 && d[k - W - 1] + D < v) v = d[k - W - 1] + D;
        if (i < W - 1 && d[k - W + 1] + D < v) v = d[k - W + 1] + D;
      }
      d[k] = v;
    }
  }
  for (let j = H - 1; j >= 0; j--) {
    for (let i = W - 1; i >= 0; i--) {
      const k = j * W + i;
      let v = d[k];
      if (i < W - 1 && d[k + 1] + 1 < v) v = d[k + 1] + 1;
      if (j < H - 1) {
        if (d[k + W] + 1 < v) v = d[k + W] + 1;
        if (i < W - 1 && d[k + W + 1] + D < v) v = d[k + W + 1] + D;
        if (i > 0 && d[k + W - 1] + D < v) v = d[k + W - 1] + D;
      }
      d[k] = v;
    }
  }
  const out = new Uint8Array(W * H);
  for (let k = 0; k < d.length; k++) out[k] = Math.min(CAP, Math.round(d[k] * CELL * 4));
  return out;
}

function ownField(f: Field, id: RegionId): Uint8Array {
  let d = f.own.get(id);
  if (!d) {
    const k = f.ids.indexOf(id);
    d = chamfer(f.owner, (o) => o === k);
    f.own.set(id, d);
  }
  return d;
}

function otherField(f: Field, id: RegionId): Uint8Array {
  let d = f.other.get(id);
  if (!d) {
    const k = f.ids.indexOf(id);
    d = chamfer(f.owner, (o) => o >= 0 && o !== k);
    f.other.set(id, d);
  }
  return d;
}

/**
 * The least distance (px) from a box to the land a field measures. Land never fits inside a word's box (an island is
 * taller than a line of hand), so the box's edge, sampled every cell, finds the nearest approach.
 */
function minOnEdge(d: Uint8Array, b: Box): number {
  const i0 = Math.max(0, Math.min(W - 1, Math.floor(b.x0 / CELL)));
  const i1 = Math.max(0, Math.min(W - 1, Math.floor(b.x1 / CELL)));
  const j0 = Math.max(0, Math.min(H - 1, Math.floor(b.y0 / CELL)));
  const j1 = Math.max(0, Math.min(H - 1, Math.floor(b.y1 / CELL)));
  let m = CAP;
  for (let i = i0; i <= i1; i++) {
    const a = d[j0 * W + i];
    const c = d[j1 * W + i];
    if (a < m) m = a;
    if (c < m) m = c;
  }
  for (let j = j0 + 1; j < j1; j++) {
    const a = d[j * W + i0];
    const c = d[j * W + i1];
    if (a < m) m = a;
    if (c < m) m = c;
  }
  // The middle row too (a long, thin box could straddle a narrow neck of land).
  const jm = (j0 + j1) >> 1;
  for (let i = i0; i <= i1; i += 2) if (d[jm * W + i] < m) m = d[jm * W + i];
  return m / 4;
}

/** How near a box comes to `id`'s own land, and to anyone else's (px; 0 when it lies on it). */
export function landNear(geom: SheetGeom, id: RegionId, b: Box): { own: number; other: number } {
  const f = fieldOf(geom);
  return { own: minOnEdge(ownField(f, id), b), other: minOnEdge(otherField(f, id), b) };
}
