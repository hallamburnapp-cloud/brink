import { describe, expect, it } from 'vitest';
import { formatFunds, formatInt, formatM10, formatM10Short, formatShort } from './format';

describe('formatInt', () => {
  it('groups thousands with commas', () => {
    expect(formatInt(0n)).toBe('0');
    expect(formatInt(452)).toBe('452');
    expect(formatInt(10_920n)).toBe('10,920');
    expect(formatInt(10_559_856_944n)).toBe('10,559,856,944');
    expect(formatInt(-1350)).toBe('-1,350');
  });
});

describe('formatShort (the Big Board: 7 glyphs at most)', () => {
  it('keeps full digits while they fit', () => {
    expect(formatShort(180n)).toBe('180');
    expect(formatShort(10_920n)).toBe('10,920');
    expect(formatShort(999_999n)).toBe('999,999');
  });

  it('uses 3 significant figures with M, B, T', () => {
    expect(formatShort(1_000_000n)).toBe('1.00M');
    expect(formatShort(1_240_000n)).toBe('1.24M');
    expect(formatShort(415_461_382n)).toBe('415M');
    expect(formatShort(600_000_000n)).toBe('600M');
    expect(formatShort(10_559_856_944n)).toBe('10.6B');
    expect(formatShort(8_651_450_444n)).toBe('8.65B');
    expect(formatShort(1_200_000_000_000n)).toBe('1.20T');
  });

  it('carries when rounding reaches the next unit', () => {
    expect(formatShort(999_600_000n)).toBe('1.00B');
    expect(formatShort(9_999_999n)).toBe('10.0M');
  });

  it('switches to e-notation from 1e15 and reads GOOGOL from 1e100', () => {
    expect(formatShort(10n ** 15n)).toBe('1.00e15');
    expect(formatShort(123_456n * 10n ** 20n)).toBe('1.23e25');
    expect(formatShort(9n * 10n ** 99n)).toBe('9.00e99');
    // One short of a googol rounds to 1e100 and drops a figure to stay within 7 glyphs.
    expect(formatShort(10n ** 100n - 1n)).toBe('1.0e100');
    expect(formatShort(10n ** 100n)).toBe('GOOGOL');
  });

  it('never exceeds the glyph budget', () => {
    let v = 1n;
    for (let i = 0; i < 99; i++) {
      for (const m of [1n, 2n, 5n, 9n]) {
        expect(formatShort(v * m).length).toBeLessThanOrEqual(7);
        expect(formatShort(v * m, 5).length).toBeLessThanOrEqual(5);
      }
      v *= 10n;
    }
  });

  it('fits smaller boxes with K', () => {
    expect(formatShort(10_920n, 5)).toBe('10.9K');
    expect(formatShort(273n, 5)).toBe('273');
  });
});

describe('formatM10', () => {
  it('shows the multiplier from tenths with one decimal', () => {
    expect(formatM10(20n)).toBe('2.0');
    expect(formatM10(40n)).toBe('4.0');
    expect(formatM10(45n)).toBe('4.5');
    expect(formatM10(13_814n)).toBe('1,381.4');
    expect(formatM10(290_105_960n)).toBe('29,010,596.0');
  });

  it('shortens for the MULTIPLIER box', () => {
    expect(formatM10Short(45n)).toBe('4.5');
    expect(formatM10Short(400n)).toBe('40.0');
    expect(formatM10Short(13_814n, 7)).toBe('1,381.4');
    expect(formatM10Short(1_399_680n, 7)).toBe('139,968');
    expect(formatM10Short(290_105_960n)).toBe('29.0M');
  });
});

describe('formatFunds', () => {
  it('prefixes the coin glyph', () => {
    expect(formatFunds(3)).toBe('◆3');
    expect(formatFunds(11, { spaced: true })).toBe('◆ 11');
  });
});
