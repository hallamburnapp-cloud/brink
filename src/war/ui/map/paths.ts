/** Path2D objects for the geometry, built once on first use (browser only). */
import type { RegionId } from './contract';
import { MASSES, REGIONS, type Mass, type Pt } from './data';
import { getGeometry, type Shape } from './geometry';

export interface MapPaths {
  region: Record<RegionId, Path2D>;
  coast: Record<Mass, Path2D>;
  /** Every coast and island disc in one path. */
  allLand: Path2D;
  /** Etched borders between regions (36 joins). */
  borders: Path2D;
}

function polyInto(p: Path2D, pts: readonly Pt[]): void {
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  p.closePath();
}

export function shapeInto(p: Path2D, s: Shape): void {
  if (s.kind === 'disc') {
    p.moveTo(s.x + s.r, s.y);
    p.arc(s.x, s.y, s.r, 0, Math.PI * 2);
  } else polyInto(p, s.pts);
}

let cached: MapPaths | null = null;

export function getPaths(): MapPaths {
  if (cached) return cached;
  const geo = getGeometry();
  const region: Record<RegionId, Path2D> = {};
  for (const r of REGIONS) {
    const p = new Path2D();
    shapeInto(p, geo.shapes[r.id]);
    region[r.id] = p;
  }
  const coast = {} as Record<Mass, Path2D>;
  const allLand = new Path2D();
  for (const m of MASSES) {
    const p = new Path2D();
    polyInto(p, geo.coasts[m]);
    coast[m] = p;
    polyInto(allLand, geo.coasts[m]);
  }
  for (const r of REGIONS) if (r.island) shapeInto(allLand, geo.shapes[r.id]);
  const borders = new Path2D();
  for (const b of geo.borders) {
    for (const s of b.pieces) {
      borders.moveTo(s.p[0], s.p[1]);
      borders.lineTo(s.q[0], s.q[1]);
    }
  }
  cached = { region, coast, allLand, borders };
  return cached;
}
