import { describe, expect, it } from 'vitest';
import { MAP_H, MAP_W, REGIONS } from './data';
import { warTagAt, warTagText, winChipAt } from './layers/markers';
import { BADGE_H, labelBoxes, ringLayout, ringRadius, WIN_CHIP_HALF, type Box } from './layers/ring';
import type { RegionVis } from './scene';

/** Measured: of 90 crisis-and-target pairs, this many chips graze a neighbour's number box. */
const NUMBER_CLASHES = 5;
/** The top of the map sits under the rail's shadow: nothing important in its first few points. */
const TOP = 6;

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
    scored: false,
    dim: 1,
    dimNow: 1,
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

  it('stays on the map wherever the crisis falls', () => {
    for (const r of REGIONS) {
      const rad = ringRadius(r.id);
      expect(r.x - rad).toBeGreaterThanOrEqual(4);
      expect(r.x + rad).toBeLessThanOrEqual(MAP_W - 4);
      expect(r.y - rad).toBeGreaterThanOrEqual(8);
      expect(r.y + rad).toBeLessThanOrEqual(MAP_H - 4);
    }
  });

  it('keeps the target-and-×2 chip on the map, on the ring, and clear of the win check', () => {
    for (const r of REGIONS) {
      const L = ringLayout(r.id);
      const half = L.width / 2;
      expect(L.badge.y - BADGE_H / 2, r.id).toBeGreaterThanOrEqual(TOP + 2);
      expect(L.badge.y + BADGE_H / 2, r.id).toBeLessThanOrEqual(MAP_H);
      expect(L.badge.x - half).toBeGreaterThanOrEqual(0);
      expect(L.badge.x + half).toBeLessThanOrEqual(MAP_W);
      const win = winChipAt(vis(r.id, { crisis: true }));
      const clear = L.badge.y + BADGE_H / 2 <= win.y - WIN_CHIP_HALF || L.badge.y - BADGE_H / 2 >= win.y + WIN_CHIP_HALF;
      expect(clear, r.id).toBe(true);
      // It sits on the ring (touching it), not floating away from it.
      const gap = Math.abs(L.badge.y - r.y) - BADGE_H / 2 - L.r;
      expect(gap, r.id).toBeLessThanOrEqual(6);
      expect(L.badge.x - half, r.id).toBeLessThanOrEqual(r.x - 3);
      expect(L.badge.x + half, r.id).toBeGreaterThanOrEqual(r.x + 3);
    }
  });

  it('moves the chip along the ring to clear the names (and nearly all the numbers) round it', () => {
    const touches = (chip: Box, b: Box) => Math.min(chip.x1, b.x1) > Math.max(chip.x0, b.x0) && Math.min(chip.y1, b.y1) > Math.max(chip.y0, b.y0);
    let numberClashes = 0;
    for (const r of REGIONS) {
      for (const target of ['64', '3,700', '12,000']) {
        const L = ringLayout(r.id, target);
        const chip = { x0: L.badge.x - L.width / 2, y0: L.badge.y - BADGE_H / 2, x1: L.badge.x + L.width / 2, y1: L.badge.y + BADGE_H / 2 };
        for (const o of REGIONS) {
          if (o.id === r.id) continue;
          const [marks, name] = labelBoxes(o.id);
          // Wenmoor's chip used to sit on Northwake's name ('NORTHWAKE64 ×2').
          expect(touches(chip, name), `${r.id} ${target} on ${o.id}'s name`).toBe(false);
          if (touches(chip, marks)) numberClashes++;
        }
      }
    }
    // A wide chip on the crowded coasts may still graze a neighbour's number box (the boxes are generous).
    expect(numberClashes).toBeLessThanOrEqual(NUMBER_CLASHES);
  });
});

describe('labels on the map', () => {
  it('words the war tag the way the player reads it, during a turn, between turns and as war spreads', () => {
    expect(warTagText(3)).toBe('WAR · 3 TURNS');
    expect(warTagText(2)).toBe('WAR · 2 TURNS');
    expect(warTagText(1)).toBe('WAR · THIS TURN');
    expect(warTagText(2, true)).toBe('WAR · IN 2 TURNS');
    expect(warTagText(1, true)).toBe('WAR · NEXT TURN');
    expect(warTagText(0)).toBe('WAR · NOW');
  });

  it('keeps the war tag on the map for every region, lit, dark or under the ring', () => {
    for (const r of REGIONS) {
      for (const over of [{}, { lit: true }, { lit: true, crisis: true }]) {
        const { x, y } = warTagAt(vis(r.id, over), 92);
        expect(x - 46).toBeGreaterThanOrEqual(0);
        expect(x + 46).toBeLessThanOrEqual(MAP_W);
        expect(y - 8.5, r.id).toBeGreaterThanOrEqual(TOP);
        expect(y + 8.5, r.id).toBeLessThanOrEqual(MAP_H);
      }
    }
  });

  it('keeps the war tag off the crisis ring’s chip', () => {
    // Ashkettle in crisis, the tag on Edda Vale just above it: the tag moves above its region.
    const L = ringLayout('ASK', '140');
    const chip = { x0: L.badge.x - L.width / 2, y0: L.badge.y - BADGE_H / 2, x1: L.badge.x + L.width / 2, y1: L.badge.y + BADGE_H / 2 };
    const at = warTagAt(vis('EDV'), 100, chip);
    const tag = { x0: at.x - 50, y0: at.y - 8.5, x1: at.x + 50, y1: at.y + 8.5 };
    const clear = tag.x1 <= chip.x0 || tag.x0 >= chip.x1 || tag.y1 <= chip.y0 || tag.y0 >= chip.y1;
    expect(clear).toBe(true);
  });

  it("keeps the war tag off the names of the regions round it (Lintel's tag clears Lantern Key)", () => {
    const at = warTagAt(vis('LTL'), 104);
    const tag = { x0: at.x - 52, y0: at.y - 8.5, x1: at.x + 52, y1: at.y + 8.5 };
    for (const n of labelBoxes('LNK')) {
      const clear = tag.x1 <= n.x0 || tag.x0 >= n.x1 || tag.y1 <= n.y0 || tag.y0 >= n.y1;
      expect(clear).toBe(true);
    }
  });

  it('keeps every win-preview check on the map', () => {
    for (const r of REGIONS) {
      const { x, y } = winChipAt(vis(r.id));
      expect(x - WIN_CHIP_HALF).toBeGreaterThanOrEqual(0);
      expect(x + WIN_CHIP_HALF).toBeLessThanOrEqual(MAP_W);
      expect(y - WIN_CHIP_HALF, r.id).toBeGreaterThanOrEqual(TOP);
    }
  });
});
