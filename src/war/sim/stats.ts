/**
 * Small statistics helpers with the reference's exact definitions (Python's statistics.median, and
 * calibrate.py's q()), so a number here means what the same number means in RESULTS.txt.
 */

const ascending = (a: number, b: number) => a - b;

/** The middle value; the mean of the middle two for an even count (statistics.median). NaN when empty. */
export function median(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  const v = [...xs].sort(ascending);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** The value at rank floor(p x n) of the sorted list (calibrate.py q()). NaN when empty. */
export function quantile(xs: readonly number[], p: number): number {
  if (xs.length === 0) return NaN;
  const v = [...xs].sort(ascending);
  return v[Math.min(v.length - 1, Math.floor(p * v.length))];
}

export function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

/** Share of `xs` for which `pred` holds, over `of` (default xs.length). 0 when the denominator is 0. */
export function share<T>(xs: readonly T[], pred: (x: T) => boolean, of: number = xs.length): number {
  if (of === 0) return 0;
  let k = 0;
  for (const x of xs) if (pred(x)) k++;
  return k / of;
}

/** Two standard errors of a share near `p` measured on `n` samples. */
export function twoSigma(p: number, n: number): number {
  return n > 0 ? 2 * Math.sqrt((p * (1 - p)) / n) : Infinity;
}

/**
 * An approximate 95% interval for the p-quantile of the population a sample came from, from the
 * order statistics (ranks n·p ± 2·sqrt(n·p·(1-p))).
 */
export function quantileInterval(xs: readonly number[], p: number): [number, number] {
  if (xs.length === 0) return [NaN, NaN];
  const v = [...xs].sort(ascending);
  const n = v.length;
  const spread = 2 * Math.sqrt(n * p * (1 - p));
  const lo = Math.max(0, Math.floor(n * p - spread));
  const hi = Math.min(n - 1, Math.ceil(n * p + spread));
  return [v[lo], v[hi]];
}

/** Occurrences of each value, most common first (ties by first seen). */
export function tally<K>(xs: Iterable<K>): Array<[K, number]> {
  const m = new Map<K, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
