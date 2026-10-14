import { describe, expect, it } from 'vitest';
import { emphasis, markTerms, parseChip, parseRich } from './chip';
import { clampBalloonX, dragOrder, fitFrame, slotAt } from './layout';

describe('seat chips', () => {
  it('colours the effect and greys the qualifier', () => {
    expect(parseChip('×2·4', 'mom')).toEqual([
      { text: '×2', tone: 'mom' },
      { text: '·4', tone: 'muted' },
    ]);
    expect(parseChip('+8M·3', 'mom')).toEqual([
      { text: '+8', tone: 'mom' },
      { unit: 'M', tone: 'mom' },
      { text: '·3', tone: 'muted' },
    ]);
  });

  it('sets the unit letter after a number apart, so +30I never reads as +301', () => {
    expect(parseChip('+30I', 'inf')).toEqual([
      { text: '+30', tone: 'inf' },
      { unit: 'I', tone: 'inf' },
    ]);
    expect(parseChip('+135I', 'inf')).toEqual([
      { text: '+135', tone: 'inf' },
      { unit: 'I', tone: 'inf' },
    ]);
    expect(parseChip('★×2M', 'mom')).toEqual([
      { glyph: 'star', tone: 'plain' },
      { text: '×2', tone: 'mom' },
      { unit: 'M', tone: 'mom' },
    ]);
    // Letters that are not a unit after a number stay text.
    expect(parseChip('COPY', 'muted')).toEqual([{ text: 'COPY', tone: 'muted' }]);
    expect(parseChip('1st×2', 'plain')).toEqual([{ text: '1st×2', tone: 'plain' }]);
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

  it('splits a coach line into plain and emphasised runs', () => {
    expect(emphasis('Reach *300* in *4 sweeps*, or the world tips.')).toEqual([
      { text: 'Reach ', em: false },
      { text: '300', em: true },
      { text: ' in ', em: false },
      { text: '4 sweeps', em: true },
      { text: ', or the world tips.', em: false },
    ]);
    expect(emphasis('Tap a lit region.')).toEqual([{ text: 'Tap a lit region.', em: false }]);
  });

  it('marks Ports and Capitals in a rule with the anchor and star the map draws', () => {
    expect(markTerms('Each Port that scores: +15 Influence.')).toBe('Each Port\u2009⚓ that scores: +15 Influence.');
    expect(markTerms('All Ports count as joined to each other.')).toBe('All Ports\u2009⚓ count as joined to each other.');
    expect(markTerms('Every region counts as a Capital.')).toBe('Every region counts as a Capital\u2009★.');
    expect(markTerms('Capitals score twice.')).toBe('Capitals\u2009★ score twice.');
    expect(markTerms(markTerms('1 region becomes a Capital.'))).toBe('1 region becomes a Capital\u2009★.');
    expect(markTerms('+4 Momentum.')).toBe('+4 Momentum.');
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

  it('on a desktop fits the live area alone, centred with a margin of room', () => {
    const f = fitFrame(1440, 900, undefined, true);
    const liveTop = f.top + 47 * f.scale;
    const liveBottom = f.top + 807 * f.scale;
    expect(f.scale).toBeGreaterThan(900 / 844);
    expect(liveTop).toBeCloseTo(900 - liveBottom, 5);
    expect(liveTop).toBeGreaterThanOrEqual(12);
    expect(f.left).toBeCloseTo((1440 - 390 * f.scale) / 2, 5);
    // A narrow desktop window: the width decides, and the console still clears the edges.
    const narrow = fitFrame(400, 900, undefined, true);
    expect(narrow.left).toBeGreaterThanOrEqual(12 - 1e-6);
    expect(narrow.top + 47 * narrow.scale).toBeGreaterThan(0);
  });

  it('keeps the live area clear of large insets', () => {
    const f = fitFrame(390, 844, { top: 60, bottom: 40, left: 0, right: 0 });
    expect(f.top + 47 * f.scale).toBeGreaterThanOrEqual(60 - 1e-6);
    expect(f.top + 807 * f.scale).toBeLessThanOrEqual(844 - 40 + 1e-6);
  });

  it('maps seat drags to slots and reorders around the dragged seat', () => {
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
