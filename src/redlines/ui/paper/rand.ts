/**
 * Seeded randomness for the paper look's cosmetic noise (island coasts, grease rings, pencil
 * wobble). Every mark is drawn from a seed, so the same view draws the same picture on every
 * update and a ring never jitters when its layer is rebuilt.
 */

/** mulberry32: a tiny seeded PRNG (the same one the other games' maps use). */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small stable hash (FNV-1a) so a region id or a word makes a seed. */
export function seedOf(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The handful of draws the generator's python used, over one seeded stream. */
export interface Rnd {
  random(): number;
  uniform(a: number, b: number): number;
  /** An integer in [0, n). */
  randrange(n: number): number;
  /** An integer in [a, b). */
  range(a: number, b: number): number;
}

export function rnd(seed: number | string): Rnd {
  const r = mulberry32(typeof seed === 'string' ? seedOf(seed) : seed);
  return {
    random: r,
    uniform: (a, b) => a + (b - a) * r(),
    randrange: (n) => Math.floor(r() * n),
    range: (a, b) => a + Math.floor(r() * (b - a)),
  };
}
