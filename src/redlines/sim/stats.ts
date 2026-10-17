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
export function share(count: number, total: number): number {
  return total ? count / total : 0;
}
export function pct(x: number, digits = 1): string {
  return `${(100 * x).toFixed(digits)}%`;
}
export function counts<T extends string | number>(xs: readonly T[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of xs) out[String(x)] = (out[String(x)] ?? 0) + 1;
  return out;
}
