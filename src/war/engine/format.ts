/**
 * Number display. Scores are BigInt and can pass a googol, so every formatter takes a bigint
 * (or a safe integer) and never goes through floating point.
 *
 * The Big Board's crisis total is a 28 pt split-flap 124 px wide: 7 glyphs at most (commas
 * and points count). formatShort() keeps to a glyph budget: full digits while they fit,
 * then 3 significant figures with K / M / B / T ('10.6B', '1.24M'), then e-notation from 1e15
 * ('1.23e15'), and GOOGOL at 1e100 and above.
 */

const GOOGOL = 10n ** 100n;
const UNITS: ReadonlyArray<readonly [number, string]> = [
  [12, 'T'],
  [9, 'B'],
  [6, 'M'],
  [3, 'K'],
];

const toBig = (n: bigint | number): bigint => (typeof n === 'bigint' ? n : BigInt(Math.trunc(n)));

/** 10920 -> '10,920'. */
export function formatInt(n: bigint | number): string {
  const v = toBig(n);
  const neg = v < 0n;
  const digits = (neg ? -v : v).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return neg ? `-${grouped}` : grouped;
}

/** Round a non-negative integer to `sig` significant figures: returns [digits, exponent of the last digit]. */
function roundSig(v: bigint, sig: number): { mantissa: bigint; exp: number } {
  const len = v.toString().length;
  if (len <= sig) return { mantissa: v, exp: 0 };
  const drop = len - sig;
  const div = 10n ** BigInt(drop);
  let mantissa = v / div;
  if ((v % div) * 2n >= div) mantissa += 1n; // half up
  return { mantissa, exp: drop };
}

/** mantissa x 10^exp shown with a unit of 10^unitExp, keeping every significant digit. */
function withUnit(mantissa: bigint, exp: number, unitExp: number, suffix: string): string {
  const digits = mantissa.toString();
  const pointAt = digits.length + exp - unitExp; // digits before the decimal point
  if (pointAt >= digits.length) return digits + '0'.repeat(pointAt - digits.length) + suffix;
  return `${digits.slice(0, pointAt)}.${digits.slice(pointAt)}${suffix}`;
}

function shortForm(v: bigint, sig: number): string {
  let { mantissa, exp } = roundSig(v, sig);
  if (exp > 0 && mantissa.toString().length > sig) {
    // Rounding carried (999.6 -> 1000): the mantissa is an exact power of ten, so drop a zero.
    mantissa /= 10n;
    exp += 1;
  }
  const magnitude = mantissa.toString().length - 1 + exp; // power of ten of the leading digit
  if (magnitude >= 15) {
    const d = mantissa.toString();
    const m = d.length > 1 ? `${d[0]}.${d.slice(1)}` : d;
    return `${m}e${magnitude}`;
  }
  const unit = UNITS.find(([u]) => magnitude >= u);
  if (!unit) return mantissa.toString() + '0'.repeat(exp);
  return withUnit(mantissa, exp, unit[0], unit[1]);
}

/**
 * Fit a whole number into `maxGlyphs` glyphs (default 7, the Big Board total).
 * 452 -> '452', 10920 -> '10,920', 10559856944 -> '10.6B', 1240000 -> '1.24M'.
 */
export function formatShort(n: bigint | number, maxGlyphs = 7): string {
  const v = toBig(n);
  if (v < 0n) return `-${formatShort(-v, maxGlyphs - 1)}`;
  if (v >= GOOGOL) return 'GOOGOL';
  const full = formatInt(v);
  if (full.length <= maxGlyphs) return full;
  for (let sig = 3; sig >= 1; sig--) {
    const s = shortForm(v, sig);
    if (s.length <= maxGlyphs) return s;
  }
  return shortForm(v, 1);
}

/** Momentum in tenths for display: 40 -> '4', 45 -> '4.5', 12345 -> '1,234.5'. */
export function formatM10(m10: bigint | number): string {
  const v = toBig(m10);
  const neg = v < 0n;
  const a = neg ? -v : v;
  const whole = formatInt(a / 10n);
  const tenth = a % 10n;
  const s = tenth === 0n ? whole : `${whole}.${tenth}`;
  return neg ? `-${s}` : s;
}

/** Momentum for a small box: the exact value while it fits, else the whole part shortened. */
export function formatM10Short(m10: bigint | number, maxGlyphs = 5): string {
  const exact = formatM10(m10);
  if (exact.length <= maxGlyphs) return exact;
  return formatShort(toBig(m10) / 10n, maxGlyphs);
}

/** Funds: '◆11' for prices and balloons; spaced: '◆ 11' for the coin. */
export function formatFunds(n: number, opts: { spaced?: boolean } = {}): string {
  return `◆${opts.spaced ? ' ' : ''}${formatInt(n)}`;
}
