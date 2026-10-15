/** Small statistics for the simulator's tables. */

export function median(xs: readonly number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

/** The value at rank floor(p x n) of the sorted sample. */
export function quantile(xs: readonly number[], p: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

export function share(count: number, total: number): number {
  return total ? count / total : 0;
}

export function pct(x: number, digits = 1): string {
  return `${(100 * x).toFixed(digits)}%`;
}
