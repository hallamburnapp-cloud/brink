import { describe, expect, it } from 'vitest';
import { MAP_H, MAP_W, REGIONS } from './data';
import { RING_COOLED, ringRadius } from './layers/overlays';

describe('the flashpoint ring', () => {
  it('marks one region: it rings an island disc, and on the mainland reaches at most half way to the nearest pin', () => {
    for (const r of REGIONS) {
      const rad = ringRadius(r.id);
      expect(rad).toBeGreaterThan(RING_COOLED);
      if (r.island) {
        expect(rad).toBe(27);
        continue;
      }
      const nearest = Math.min(...REGIONS.filter((o) => o.id !== r.id).map((o) => Math.hypot(o.x - r.x, o.y - r.y)));
      expect(rad).toBeLessThanOrEqual(Math.max(22, nearest / 2) + 1e-9);
      expect(rad).toBeLessThanOrEqual(32);
    }
  });

  it('stays on the plate, clear of the bearing strip, wherever the flashpoint falls', () => {
    for (const r of REGIONS) {
      const rad = ringRadius(r.id);
      expect(r.x - rad).toBeGreaterThanOrEqual(4);
      expect(r.x + rad).toBeLessThanOrEqual(MAP_W - 4);
      expect(r.y - rad).toBeGreaterThanOrEqual(8);
      expect(r.y + rad).toBeLessThanOrEqual(MAP_H - 4);
    }
  });
});
