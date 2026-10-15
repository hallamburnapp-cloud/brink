/**
 * Numbers as the war room prints them, on top of the engine's formatters: a multiplier in whole
 * numbers while it is whole ('8', not '8.0': 'times how many' has no fractions until a staff makes
 * one), and a before → after pair in one shared form, so '3,931 → 13.3K' never sits beside
 * '3,931 → 4,139'.
 */
import { formatInt, formatM10Short, formatShort } from '../../engine';

/**
 * The multiplier from tenths: '8', '12', '1,381.4'. A decimal is never cut off: one that does not
 * fit `max` glyphs in full is printed in units, rounded ('1.38K'), so a sum like '36 × 1,165' that
 * does not add up can never be shown.
 */
export function formatMult(m10: bigint, max = 6): string {
  if (m10 % 10n === 0n) return formatShort(m10 / 10n, max);
  const exact = formatM10Short(m10, Number.MAX_SAFE_INTEGER);
  if (exact.length <= max) return exact;
  const whole = (m10 + 5n) / 10n;
  return whole >= 1000n ? unitForm(whole) : formatShort(whole, max);
}

/**
 * A before → after pair for a narrow line: both in full digits when both fit `max` glyphs,
 * otherwise both in units with three significant figures ('3.93K → 13.3K').
 */
export function formatPair(before: bigint, after: bigint, max = 5): [string, string] {
  const a = formatInt(before);
  const b = formatInt(after);
  if (a.length <= max && b.length <= max) return [a, b];
  return [unitForm(before), unitForm(after)];
}

const UNITS: ReadonlyArray<readonly [bigint, string]> = [
  [10n ** 12n, 'T'],
  [10n ** 9n, 'B'],
  [10n ** 6n, 'M'],
  [10n ** 3n, 'K'],
];

/** 950 -> '950', 3931 -> '3.93K', 13300 -> '13.3K', 1240000 -> '1.24M'; e-notation from 1e15. */
export function unitForm(v: bigint): string {
  if (v < 1000n) return formatInt(v);
  if (v >= 10n ** 15n) return formatShort(v, 7);
  for (const [i, [u, suffix]] of UNITS.entries()) {
    if (v < u) continue;
    // Three significant figures: the number of decimals depends on the whole part's digits.
    const whole = (v / u).toString().length;
    const decimals = Math.max(0, 3 - whole);
    const scale = 10n ** BigInt(decimals);
    const scaled = (v * scale * 2n + u) / (2n * u); // round half up
    const s = scaled.toString();
    // Rounding carried into a fourth digit (999.6K): that is 1.00 of the next unit up.
    if (s.length > 3 && i > 0) return `1.00${UNITS[i - 1][1]}`;
    if (decimals === 0) return `${s}${suffix}`;
    const cut = s.length - decimals;
    return `${s.slice(0, cut)}.${s.slice(cut)}${suffix}`;
  }
  return formatInt(v);
}
