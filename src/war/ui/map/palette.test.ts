import { describe, expect, it } from 'vitest';
import type { Owner } from './contract';
import {
  GOLD_FILL,
  greyTone,
  HATCH_COVER,
  hex,
  hsl,
  luminance,
  ownerTone,
  stripedLuminance,
  toneLuminance,
  WAR_FILL,
  WAR_HATCH,
  type PlateLevel,
} from './palette';

const LEVELS: PlateLevel[] = ['lit', 'rest', 'dark'];
const L = (owner: Owner, level: PlateLevel, ceased = false) => toneLuminance(ownerTone(owner, level, ceased));
/** WCAG contrast ratio between two luminances. */
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

describe('ownership colours (SPEC 8)', () => {
  it('uses the spec’s gold and red: #F2D27A at 85% and #E0483C at 75% over the table, hatched #7A1E17', () => {
    expect(ownerTone('gold', 'lit').fill).toEqual(GOLD_FILL);
    expect(ownerTone('red', 'lit')).toEqual({ fill: WAR_FILL, hatch: WAR_HATCH });
    expect(WAR_HATCH).toEqual(hex('#7A1E17'));
    expect(HATCH_COVER).toBeCloseTo(1 / 3);
  });

  it('orders the owners by brightness at every level: gold > grey > hatched red', () => {
    for (const level of LEVELS) {
      const gold = L('gold', level);
      const grey = L('grey', level);
      const red = L('red', level);
      expect(gold, level).toBeGreaterThan(grey);
      expect(grey, level).toBeGreaterThan(red);
      // Far enough apart to tell in sunlight and in greyscale, not just in a meter.
      expect(contrast(gold, grey)).toBeGreaterThan(2);
      expect(contrast(grey, red)).toBeGreaterThan(1.2);
      // A ceasefire's faded red stays the darkest.
      expect(L('red', level, true)).toBeLessThan(red);
    }
  });

  it('never dims gold: it is the same tone at every level', () => {
    for (const level of LEVELS) expect(ownerTone('gold', level).fill).toEqual(GOLD_FILL);
  });

  it('draws free regions in one neutral grey: no bloc hue, saturation 0.05 or less at every level', () => {
    for (const level of LEVELS) {
      const c = greyTone(level);
      const [, s] = hsl(c);
      expect(s, level).toBeLessThanOrEqual(0.05);
      expect(Math.max(...c) - Math.min(...c), level).toBeLessThanOrEqual(8);
      expect(ownerTone('grey', level).fill).toEqual(c);
    }
  });

  it('steps grey from dark through rest to lit, each clearly brighter than the last', () => {
    expect(contrast(L('grey', 'rest'), L('grey', 'dark'))).toBeGreaterThan(1.3);
    expect(contrast(L('grey', 'lit'), L('grey', 'rest'))).toBeGreaterThan(1.2);
    expect(contrast(L('grey', 'lit'), L('grey', 'dark'))).toBeGreaterThan(1.8);
  });

  it('measures striped luminance as the area-weighted mix of fill and stripes', () => {
    expect(stripedLuminance([255, 255, 255], [0, 0, 0], 0.25)).toBeCloseTo(0.75);
    expect(luminance([255, 255, 255])).toBeCloseTo(1);
  });
});
