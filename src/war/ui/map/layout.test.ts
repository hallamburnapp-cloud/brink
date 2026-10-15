import { describe, expect, it } from 'vitest';
import { MAP_H, MAP_W, REGIONS } from './data';
import { warTagAt, warTagText, winChipAt } from './layers/markers';
import { BADGE_H, BADGE_MAX_W, ringLayout, ringRadius, WIN_CHIP_HALF } from './layers/ring';
import type { RegionVis } from './scene';

/** The bearing strip runs along the top 10 pt of the map. */
const STRIP = 10;

function vis(id: string, over: Partial<RegionVis> = {}): RegionVis {
  const def = REGIONS.find((r) => r.id === id)!;
  return {
    id,
    def,
    owner: 'grey',
    lit: false,
    live: false,
    pinned: false,
    joinable: false,
    capital: def.capital,
    port: def.port,
    crisis: false,
    preview: null,
    brass: false,
    scored: false,
    dim: 1,
    dimNow: 1,
    order: null,
    orderDone: false,
    warm: 1,
    ...over,
  };
}

describe('the crisis ring', () => {
  it('marks one region: it rings an island disc, and on the mainland reaches at most half way to the nearest pin', () => {
    for (const r of REGIONS) {
      const rad = ringRadius(r.id);
      expect(rad).toBeGreaterThanOrEqual(20);
      if (r.island) {
        expect(rad).toBe(27);
        continue;
      }
      const nearest = Math.min(...REGIONS.filter((o) => o.id !== r.id).map((o) => Math.hypot(o.x - r.x, o.y - r.y)));
      expect(rad).toBeLessThanOrEqual(Math.max(22, nearest / 2) + 1e-9);
      expect(rad).toBeLessThanOrEqual(32);
    }
  });

  it('stays on the map, clear of the bearing strip, wherever the crisis falls', () => {
    for (const r of REGIONS) {
      const rad = ringRadius(r.id);
      expect(r.x - rad).toBeGreaterThanOrEqual(4);
      expect(r.x + rad).toBeLessThanOrEqual(MAP_W - 4);
      expect(r.y - rad).toBeGreaterThanOrEqual(8);
      expect(r.y + rad).toBeLessThanOrEqual(MAP_H - 4);
    }
  });

  it('keeps the target-and-×2 chip on the map, off the bearing strip, and clear of the win number', () => {
    for (const r of REGIONS) {
      const L = ringLayout(r.id);
      const half = BADGE_MAX_W / 2;
      expect(L.badge.y - BADGE_H / 2, r.id).toBeGreaterThanOrEqual(STRIP + 2);
      expect(L.badge.y + BADGE_H / 2, r.id).toBeLessThanOrEqual(MAP_H);
      expect(L.badge.x - half).toBeGreaterThanOrEqual(0);
      expect(L.badge.x + half).toBeLessThanOrEqual(MAP_W);
      const win = winChipAt(vis(r.id, { crisis: true }));
      const clear = L.badge.y + BADGE_H / 2 <= win.y - WIN_CHIP_HALF || L.badge.y - BADGE_H / 2 >= win.y + WIN_CHIP_HALF;
      expect(clear, r.id).toBe(true);
      // It sits on the ring (touching it), not floating away from it.
      const gap = Math.abs(L.badge.y - r.y) - BADGE_H / 2 - L.r;
      expect(gap, r.id).toBeLessThanOrEqual(6);
    }
  });
});

describe('labels on the map', () => {
  it('words the war tag the way the player reads it', () => {
    expect(warTagText(3)).toBe('WAR · 3 TURNS');
    expect(warTagText(2)).toBe('WAR · 2 TURNS');
    expect(warTagText(1)).toBe('WAR · THIS TURN');
  });

  it('keeps the war tag on the map for every region, lit, dark or under the ring', () => {
    for (const r of REGIONS) {
      for (const over of [{}, { lit: true }, { lit: true, crisis: true }]) {
        const { x, y } = warTagAt(vis(r.id, over), 92);
        expect(x - 46).toBeGreaterThanOrEqual(0);
        expect(x + 46).toBeLessThanOrEqual(MAP_W);
        expect(y - 8.5, r.id).toBeGreaterThanOrEqual(STRIP);
        expect(y + 8.5, r.id).toBeLessThanOrEqual(MAP_H);
      }
    }
  });

  it('keeps every win-preview number on the map, clear of the bearing strip', () => {
    for (const r of REGIONS) {
      const { x, y } = winChipAt(vis(r.id));
      expect(x - WIN_CHIP_HALF).toBeGreaterThanOrEqual(0);
      expect(x + WIN_CHIP_HALF).toBeLessThanOrEqual(MAP_W);
      expect(y - WIN_CHIP_HALF, r.id).toBeGreaterThanOrEqual(STRIP);
    }
  });
});
