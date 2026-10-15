import { describe, expect, it } from 'vitest';
import { MAP_Y, showcaseAt } from '../common/layout';
import { ringLayout } from '../map';
import { REGIONS } from '../map/data';
import { BADGE_H } from '../map/layers/ring';

/** The showcase's dark plate is 164 pt tall (Readout's SHOWCASE_H). */
const HALF = 82;

describe('the showcase over the map', () => {
  it('never covers the crisis ring or its target chip, wherever the crisis falls', () => {
    for (const r of REGIONS) {
      for (const target of ['64', '12,000', '1,600,000']) {
        const c = showcaseAt(r.y).y - MAP_Y;
        const L = ringLayout(r.id, target);
        const ring = { y0: Math.min(L.y - L.r, L.badge.y - BADGE_H / 2), y1: Math.max(L.y + L.r, L.badge.y + BADGE_H / 2) };
        const clear = c + HALF <= ring.y0 || c - HALF >= ring.y1;
        expect(clear, `${r.id} ${target}: plate ${c - HALF}-${c + HALF}, ring ${ring.y0}-${ring.y1}`).toBe(true);
      }
    }
  });
});
