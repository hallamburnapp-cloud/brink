import { describe, expect, it } from 'vitest';
import { parseChip, parseRich } from './chip';
import { clampBalloonX, dragOrder, fitFrame, seatCentre, slotAt } from './layout';

describe('seat chips', () => {
  it('colours the effect and greys the qualifier', () => {
    expect(parseChip('×2·4', 'mom')).toEqual([
      { text: '×2', tone: 'mom' },
      { text: '·4', tone: 'muted' },
    ]);
    expect(parseChip('+8M·3', 'mom')).toEqual([
      { text: '+8M', tone: 'mom' },
      { text: '·3', tone: 'muted' },
    ]);
  });

  it('swaps the symbols the fonts lack for glyphs', () => {
    expect(parseChip('+15⚓', 'inf')).toEqual([{ text: '+15', tone: 'inf' }, { glyph: 'anchor', tone: 'inf' }]);
    expect(parseChip('+15≤4', 'inf')).toEqual([
      { text: '+15', tone: 'inf' },
      { glyph: 'atMost', tone: 'muted' },
      { text: '4', tone: 'muted' },
    ]);
    expect(parseChip('×1.5★sb', 'mom')).toEqual([
      { text: '×1.5', tone: 'mom' },
      { glyph: 'star', tone: 'plain' },
      { text: 'sb', tone: 'muted' },
    ]);
  });

  it('turns ◆ and → into glyphs in running text', () => {
    expect(parseRich('SELL ◆4')).toEqual([{ text: 'SELL ' }, { glyph: 'diamond' }, { text: '4' }]);
    expect(parseRich('NEXT CRISIS →')).toEqual([{ text: 'NEXT CRISIS ' }, { glyph: 'arrow' }]);
  });
});

describe('layout', () => {
  it('fits the 390 x 844 frame uniformly and centres it', () => {
    expect(fitFrame(390, 844)).toEqual({ scale: 1, left: 0, top: 0 });
    const wide = fitFrame(1440, 900);
    expect(wide.scale).toBeCloseTo(900 / 844, 5);
    expect(wide.left).toBeCloseTo((1440 - 390 * wide.scale) / 2, 5);
    const narrow = fitFrame(360, 900);
    expect(narrow.scale).toBeCloseTo(360 / 390, 5);
    expect(narrow.top).toBeGreaterThan(0);
  });

  it('keeps the live area clear of large insets', () => {
    const f = fitFrame(390, 844, { top: 60, bottom: 40, left: 0, right: 0 });
    expect(f.top + 47 * f.scale).toBeGreaterThanOrEqual(60 - 1e-6);
    expect(f.top + 807 * f.scale).toBeLessThanOrEqual(844 - 40 + 1e-6);
  });

  it('maps seat drags to slots and reorders around the dragged seat', () => {
    expect(seatCentre(0)).toEqual({ x: 49, y: 134 });
    expect(slotAt(49, 5)).toBe(0);
    expect(slotAt(260, 5)).toBe(3);
    expect(slotAt(380, 3)).toBe(2);
    expect(dragOrder(5, 0, 3)).toEqual([1, 2, 3, 0, 4]);
    expect(dragOrder(4, 3, 0)).toEqual([3, 0, 1, 2]);
  });

  it('keeps balloons inside the frame', () => {
    expect(clampBalloonX(20, 220)).toBe(8);
    expect(clampBalloonX(380, 220)).toBe(162);
  });
});
