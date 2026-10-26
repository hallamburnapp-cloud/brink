import { describe, expect, it } from 'vitest';
import { covered, placeSlip, SHEET } from './slips';

describe('where a slip goes', () => {
  it('sits under its place when nothing it must leave clear is there', () => {
    const pos = placeSlip({ x: 195, y: 200 }, 252, 88);
    expect(pos).toEqual({ left: 195 - 126, top: 230 });
  });

  it('stays inside the sheet', () => {
    const pos = placeSlip({ x: 20, y: 470 }, 252, 88);
    expect(pos.left).toBe(SHEET.x0);
    expect(pos.top + 88).toBeLessThanOrEqual(SHEET.y1);
  });

  it('moves beside the counter when a place it can move to lies under the slip (the MOVE slip)', () => {
    // The brigade at Edda Vale can move to Morrow Downs, right under where the slip would sit.
    const edv = { x: 92, y: 264 };
    const moves = [{ x: 38, y: 204 }, { x: 104, y: 199 }, { x: 30, y: 266 }, { x: 40, y: 332 }, { x: 110, y: 326 }];
    const pos = placeSlip(edv, 168, 70, moves);
    expect(covered(pos, 168, 70, moves)).toBe(0);
    // The fleet at Ashkettle: Brindle Coast is under it, Morrow Downs to its right.
    const ask = { x: 40, y: 332 };
    const fleetMoves = [{ x: 60, y: 405 }, { x: 110, y: 326 }];
    const p2 = placeSlip(ask, 168, 70, fleetMoves);
    expect(covered(p2, 168, 70, fleetMoves)).toBe(0);
  });

  it('takes the least covering spot when none is clear', () => {
    const everywhere = Array.from({ length: 40 }, (_, i) => ({ x: 20 + (i % 8) * 50, y: 60 + Math.floor(i / 8) * 90 }));
    const pos = placeSlip({ x: 195, y: 300 }, 252, 88, everywhere);
    expect(pos.left).toBeGreaterThanOrEqual(SHEET.x0);
    expect(covered(pos, 252, 88, everywhere)).toBeLessThanOrEqual(6);
  });
});
