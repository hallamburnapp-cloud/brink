/**
 * Subsets of a hand in the reference bot's order: size ascending, then lexicographic by index
 * (Python's itertools.combinations). The bots keep the FIRST best play they meet, so the
 * enumeration order decides ties and must match the reference exactly.
 */

const cache = new Map<string, readonly (readonly number[])[]>();

/** Index subsets of {0..n-1} with k elements, lexicographic. */
export function indexCombos(n: number, k: number): readonly (readonly number[])[] {
  const key = `${n}:${k}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out: number[][] = [];
  const pick: number[] = [];
  const walk = (start: number) => {
    if (pick.length === k) {
      out.push([...pick]);
      return;
    }
    for (let i = start; i <= n - (k - pick.length); i++) {
      pick.push(i);
      walk(i + 1);
      pick.pop();
    }
  };
  walk(0);
  cache.set(key, out);
  return out;
}

/** Every subset of `items` whose size is in `sizes` (in the order given), reference order. */
export function subsets<T>(items: readonly T[], sizes: readonly number[]): T[][] {
  const out: T[][] = [];
  for (const k of sizes) {
    if (k > items.length) continue;
    for (const idx of indexCombos(items.length, k)) out.push(idx.map((i) => items[i]));
  }
  return out;
}

/** Sizes 1..5: every legal pin count. */
export const ALL_SIZES: readonly number[] = [1, 2, 3, 4, 5];
