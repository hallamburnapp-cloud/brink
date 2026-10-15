import { describe, expect, it } from 'vitest';
import { clampBalloonX, dragOrder, fitFrame, slotAt } from './layout';
import { markTerms, parseRich, ruleParts } from './rich';

describe('rich text', () => {
  it('turns ◆ ⚓ ★ and → into glyphs in running text', () => {
    expect(parseRich('SELL ◆4')).toEqual([{ text: 'SELL ' }, { glyph: 'diamond' }, { text: '4' }]);
    expect(parseRich('NEXT TURN →')).toEqual([{ text: 'NEXT TURN ' }, { glyph: 'arrow' }]);
    expect(parseRich('★ ⚓')).toEqual([{ glyph: 'star' }, { text: ' ' }, { glyph: 'anchor' }]);
  });

  it('picks out a rule\'s effect in the colour of the box it feeds', () => {
    expect(ruleParts('+20 points.')).toEqual({ before: '', effect: '+20 points', tone: 'points', after: '.' });
    expect(ruleParts('×1.5 multiplier for each port pinned.')).toEqual({
      before: '',
      effect: '×1.5 multiplier',
      tone: 'multiplier',
      after: ' for each port pinned.',
    });
    expect(ruleParts('+1 multiplier for every 3 regions you hold.').effect).toBe('+1 multiplier');
    expect(ruleParts('Copies the staff to its right.')).toEqual({ before: 'Copies the staff to its right.', effect: null, tone: null, after: '' });
  });

  it('marks capitals and ports with the star and anchor the map draws', () => {
    expect(markTerms('×2 multiplier for each capital pinned.')).toBe('×2 multiplier for each capital ★ pinned.');
    expect(markTerms('Every pin counts as a capital and port.')).toBe('Every pin counts as a capital ★ and port ⚓.');
    expect(markTerms(markTerms('each port pinned'))).toBe('each port ⚓ pinned');
    expect(markTerms('+4 multiplier.')).toBe('+4 multiplier.');
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
    const f = fitFrame(1440, 900, undefined, 'desk');
    const liveTop = f.top + 47 * f.scale;
    const liveBottom = f.top + 807 * f.scale;
    expect(f.scale).toBeGreaterThan(900 / 844);
    expect(liveTop).toBeCloseTo(900 - liveBottom, 5);
    expect(liveTop).toBeGreaterThanOrEqual(12);
  });

  it('in a phone browser fits the live area edge to edge', () => {
    const safari = fitFrame(390, 664, undefined, 'browser');
    expect(safari.scale).toBeCloseTo(664 / 760, 5);
    expect(safari.top + 47 * safari.scale).toBeCloseTo(0, 5);
    expect(safari.top + 807 * safari.scale).toBeCloseTo(664, 5);
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
