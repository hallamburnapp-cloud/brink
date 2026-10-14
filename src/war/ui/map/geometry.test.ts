import { describe, expect, it } from 'vitest';
import { ISLAND_R, LAND_JOINS, MAP_H, MAP_W, REGION, REGIONS, SEA_LANES, isIsland, pairKey, type Pt } from './data';
import { computeGeometry, getGeometry, hitTest, insidePoly, regionAt, type Segment } from './geometry';

const geo = getGeometry();
const mainlandJoins = new Set(LAND_JOINS.filter(([a, b]) => !(isIsland(a) && isIsland(b))).map(([a, b]) => pairKey(a, b)));
const causewayJoins = new Set(LAND_JOINS.filter(([a, b]) => isIsland(a) && isIsland(b)).map(([a, b]) => pairKey(a, b)));

function maskAt(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= MAP_W || iy >= MAP_H) return 0;
  return geo.mask[iy * MAP_W + ix];
}

function distToSegment(x: number, y: number, s: Segment): number {
  const dx = s.q[0] - s.p[0];
  const dy = s.q[1] - s.p[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((x - s.p[0]) * dx + (y - s.p[1]) * dy) / l2)) : 0;
  return Math.hypot(s.p[0] + dx * t - x, s.p[1] + dy * t - y);
}

function distToPolyline(x: number, y: number, poly: readonly Pt[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    best = Math.min(best, distToSegment(x, y, { p: poly[i], q: poly[(i + 1) % poly.length] }));
  }
  return best;
}

describe('map geometry', () => {
  it('has 36 mainland borders and 9 causeways in the data', () => {
    expect(mainlandJoins.size).toBe(36);
    expect(causewayJoins.size).toBe(9);
    expect(SEA_LANES).toHaveLength(9);
  });

  it('rasterised at 1 pt, the regions touch exactly along the 36 mainland borders', () => {
    const touching = new Set<string>();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const a = geo.mask[y * MAP_W + x];
        if (!a) continue;
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ]) {
          if (x + dx >= MAP_W || y + dy >= MAP_H) continue;
          const b = geo.mask[(y + dy) * MAP_W + x + dx];
          if (b && b !== a) touching.add(pairKey(REGIONS[a - 1].id, REGIONS[b - 1].id));
        }
      }
    }
    expect([...touching].sort()).toEqual([...mainlandJoins].sort());
  });

  it('draws a border for every mainland land join and for nothing else', () => {
    const drawn = new Set(geo.borders.map((b) => pairKey(b.a, b.b)));
    expect(geo.borders).toHaveLength(36);
    expect([...drawn].sort()).toEqual([...mainlandJoins].sort());
    for (const b of geo.borders) {
      const length = b.pieces.reduce((s, p) => s + Math.hypot(p.q[0] - p.p[0], p.q[1] - p.p[1]), 0);
      expect(length, `${b.a}-${b.b}`).toBeGreaterThan(2);
    }
  });

  it('every drawn border point separates exactly its two regions (1 pt raster)', () => {
    let checked = 0;
    for (const b of geo.borders) {
      const ia = REGION[b.a].index + 1;
      const ib = REGION[b.b].index + 1;
      let good = 0;
      for (const s of b.pieces) {
        const len = Math.hypot(s.q[0] - s.p[0], s.q[1] - s.p[1]);
        const nx = -(s.q[1] - s.p[1]) / len;
        const ny = (s.q[0] - s.p[0]) / len;
        for (let d = 0; d <= len; d += 1) {
          const x = s.p[0] + ((s.q[0] - s.p[0]) * d) / len;
          const y = s.p[1] + ((s.q[1] - s.p[1]) * d) / len;
          // Skip the triple points at the ends, where a third cell is within reach.
          if (d < 3 || d > len - 3) continue;
          const l = maskAt(x + nx * 1.5, y + ny * 1.5);
          const r = maskAt(x - nx * 1.5, y - ny * 1.5);
          if (!l || !r) continue; // the drawn coast and the spec outline differ by a point or two
          const sides = [l, r].sort().join();
          expect(sides, `${b.a}-${b.b} at ${x.toFixed(1)},${y.toFixed(1)}`).toBe([ia, ib].sort().join());
          good++;
        }
      }
      expect(good, `${b.a}-${b.b}`).toBeGreaterThan(0);
      checked += good;
    }
    expect(checked).toBeGreaterThan(500);
  });

  it('the drawn borders cover every point where two regions meet (none missing)', () => {
    const byPair = new Map(geo.borders.map((b) => [pairKey(b.a, b.b), b.pieces]));
    const coastOf = (id: string) => geo.coasts[REGION[id].colour as keyof typeof geo.coasts];
    let checked = 0;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W - 1; x++) {
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ]) {
          const a = geo.mask[y * MAP_W + x];
          const b = y + dy < MAP_H ? geo.mask[(y + dy) * MAP_W + x + dx] : 0;
          if (!a || !b || a === b) continue;
          const ida = REGIONS[a - 1].id;
          const idb = REGIONS[b - 1].id;
          const mx = x + 0.5 + dx / 2;
          const my = y + 0.5 + dy / 2;
          const coast = coastOf(ida);
          // Where the rounded coast cuts a spec corner, the border is (correctly) not drawn.
          if (!insidePoly(coast, mx, my) || distToPolyline(mx, my, coast) < 3.5) continue;
          const pieces = byPair.get(pairKey(ida, idb));
          expect(pieces, `${ida}-${idb}`).toBeDefined();
          const d = Math.min(...pieces!.map((s) => distToSegment(mx, my, s)));
          expect(d, `${ida}-${idb} at ${mx},${my}`).toBeLessThan(1.25);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('draws the 9 Scatter causeways between disc edges, and the islands never touch', () => {
    expect(geo.causeways.map((c) => pairKey(c.a, c.b)).sort()).toEqual([...causewayJoins].sort());
    for (const c of geo.causeways) {
      const A = REGION[c.a];
      const B = REGION[c.b];
      expect(Math.hypot(c.p[0] - A.x, c.p[1] - A.y)).toBeCloseTo(ISLAND_R, 6);
      expect(Math.hypot(c.q[0] - B.x, c.q[1] - B.y)).toBeCloseTo(ISLAND_R, 6);
      expect(Math.hypot(c.q[0] - c.p[0], c.q[1] - c.p[1])).toBeGreaterThan(0);
    }
    const islands = REGIONS.filter((r) => r.island);
    for (let i = 0; i < islands.length; i++) {
      for (let j = i + 1; j < islands.length; j++) {
        expect(Math.hypot(islands[i].x - islands[j].x, islands[i].y - islands[j].y)).toBeGreaterThan(2 * ISLAND_R);
      }
    }
  });

  it('puts every pin inside its own region in the mask', () => {
    for (const r of REGIONS) expect(regionAt(geo, r.x, r.y)).toBe(r.id);
  });

  it('builds in under 40 ms', () => {
    const build = () => computeGeometry().mask.length;
    const t0 = performance.now();
    build(); // cold, as on first launch
    const cold = performance.now() - t0;
    const t1 = performance.now();
    const runs = 5;
    for (let i = 0; i < runs; i++) build();
    const warm = (performance.now() - t1) / runs;
    expect(cold).toBeLessThan(40);
    expect(warm).toBeLessThan(40);
  });
});

describe('hit testing', () => {
  const none = new Set<string>();

  it('is one mask lookup on land', () => {
    expect(hitTest(geo, 104, 100, none)).toBe('WNM');
    expect(hitTest(geo, 342, 246, none)).toBe('TLM');
  });

  it('picks the preferred side of a border', () => {
    // A point just on Frostmere's side of the Frostmere / Wintermast border.
    const fx = 207;
    expect(regionAt(geo, fx, 30)).toBe('FRM');
    expect(hitTest(geo, fx, 30, new Set(['WMS']))).toBe('WMS');
    expect(hitTest(geo, fx, 30, none)).toBe('FRM');
  });

  it('snaps a sea tap to the nearest lit pin within 30 pt', () => {
    // Open water 29 pt west of Tern Isle's pin, 13 pt off the Highmarch coast.
    expect(regionAt(geo, 143, 258)).toBeNull();
    expect(hitTest(geo, 143, 258, new Set(['TRN']))).toBe('TRN');
    // Northwake's pin is 28 pt from this point off the north coast.
    expect(regionAt(geo, 62, 16)).toBeNull();
    expect(hitTest(geo, 62, 16, new Set(['NWK']))).toBe('NWK');
    // Nothing preferred within reach: the nearest land wins.
    expect(hitTest(geo, 62, 16, new Set(['FRM']))).toBe('NWK');
  });

  it('gives islands a 44 pt hit circle on the sea', () => {
    expect(regionAt(geo, 200, 290)).toBeNull();
    const id = hitTest(geo, 200, 290, none);
    expect(['TRN', 'LNK', 'PBB', 'SHL']).toContain(id);
    expect(hitTest(geo, 200, 290, new Set(['PBB']))).toBe('PBB');
  });

  it('returns null for open sea and outside the frame', () => {
    expect(hitTest(geo, 195, 366, none)).toBeNull();
    expect(hitTest(geo, -5, 100, new Set(['NWK']))).toBeNull();
    expect(hitTest(geo, 100, 600, none)).toBeNull();
  });
});
