import { describe, expect, it } from 'vitest';
import type { Colour, Owner } from './contract';
import { COLOURS } from './data';
import { GOLD_FILL, greyTint, HATCH_COVER, hex, luminance, ownerTone, stripedLuminance, toneLuminance, WAR_FILL, WAR_HATCH } from './palette';

const L = (owner: Owner, c: Colour, lit: boolean, ceased = false) => toneLuminance(ownerTone(owner, c, lit, ceased));
/** WCAG contrast ratio between two luminances. */
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

describe('ownership colours (SPEC 8)', () => {
  it('uses the spec’s gold and red: #F2D27A at 85% and #E0483C at 75% over the table, hatched #7A1E17', () => {
    expect(ownerTone('gold', 'CAP', true).fill).toEqual(GOLD_FILL);
    expect(ownerTone('red', 'CAP', true)).toEqual({ fill: WAR_FILL, hatch: WAR_HATCH });
    expect(WAR_HATCH).toEqual(hex('#7A1E17'));
    expect(HATCH_COVER).toBeCloseTo(1 / 3);
  });

  it('orders the owners by brightness on every bloc, lit and dark: gold > grey > hatched red', () => {
    for (const c of COLOURS) {
      for (const lit of [true, false]) {
        const gold = L('gold', c, lit);
        const grey = L('grey', c, lit);
        const red = L('red', c, lit);
        expect(gold, `${c} lit=${lit}`).toBeGreaterThan(grey);
        expect(grey, `${c} lit=${lit}`).toBeGreaterThan(red);
        // Far enough apart to tell in sunlight and in greyscale, not just in a meter.
        expect(contrast(gold, grey)).toBeGreaterThan(2);
        expect(contrast(grey, red)).toBeGreaterThan(1.2);
        // A ceasefire's faded red stays the darkest.
        expect(L('red', c, lit, true)).toBeLessThan(red);
      }
    }
  });

  it('keeps grey one brightness whatever the bloc (only its tint changes)', () => {
    for (const lit of [true, false]) {
      const ls = COLOURS.map((c) => L('grey', c, lit));
      expect(Math.max(...ls) - Math.min(...ls)).toBeLessThan(0.004);
    }
    // ...and a lit grey region is clearly brighter than a dark one.
    for (const c of COLOURS) expect(contrast(L('grey', c, true), L('grey', c, false))).toBeGreaterThan(1.4);
  });

  it('tints grey with its bloc at low saturation (never mistakable for gold)', () => {
    for (const c of COLOURS) {
      const [r, g, b] = greyTint(c);
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      expect(spread).toBeLessThan(40);
    }
  });

  it('measures striped luminance as the area-weighted mix of fill and stripes', () => {
    expect(stripedLuminance([255, 255, 255], [0, 0, 0], 0.25)).toBeCloseTo(0.75);
    expect(luminance([255, 255, 255])).toBeCloseTo(1);
  });
});
