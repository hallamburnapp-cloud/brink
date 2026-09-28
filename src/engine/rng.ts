/**
 * Deterministic seeded RNG (xoshiro128**) with fully serialisable state.
 * A seed string is hashed with a 128-bit variant of FNV-1a + splitmix so
 * "replay this seed" reproduces every roll bit-for-bit.
 */
export type RngState = [number, number, number, number];

function fnv1a32(str: string, seed: number): number {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function splitmix32(a: number): () => number {
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0);
  };
}

export function seedToState(seed: string): RngState {
  const mix = splitmix32(fnv1a32(seed, 0x2545f491));
  const s: RngState = [mix(), mix(), mix(), mix()];
  // Avoid the all-zero state, which xoshiro cannot leave.
  if ((s[0] | s[1] | s[2] | s[3]) === 0) s[0] = 0x9e3779b9;
  return s;
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

export class Rng {
  state: RngState;
  constructor(seedOrState: string | RngState) {
    this.state = typeof seedOrState === 'string' ? seedToState(seedOrState) : ([...seedOrState] as RngState);
  }
  /** Uniform in [0, 1). */
  next(): number {
    const s = this.state;
    const result = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 11);
    return result / 4294967296;
  }
  /** Integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  /** Uniform in [lo, hi). */
  range(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }
  /** Bernoulli with probability p. Returns the roll too, for near-miss display. */
  roll(p: number): { success: boolean; roll: number } {
    const roll = this.next();
    return { success: roll < p, roll };
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }
  /** Weighted pick; weights <= 0 are never chosen. Returns index or -1. */
  weightedIndex(weights: readonly number[]): number {
    let total = 0;
    for (const w of weights) if (w > 0) total += w;
    if (total <= 0) return -1;
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i];
      if (w <= 0) continue;
      if (r < w) return i;
      r -= w;
    }
    return weights.length - 1;
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  /** Derive a child RNG deterministically (e.g. for a sub-system) without disturbing this stream. */
  fork(label: string): Rng {
    const s = this.state;
    return new Rng(`${label}:${s[0]}:${s[1]}:${s[2]}:${s[3]}`);
  }
  snapshot(): RngState {
    return [...this.state] as RngState;
  }
}

/** Stable, URL-safe short hash for seeds shown to players. */
export function shortHash(input: string, len = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let h = fnv1a32(input, 0x1234abcd);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += alphabet[h % alphabet.length];
    h = splitmix32(h)();
  }
  return out;
}

/** Generate a fresh human-readable seed from a non-deterministic source (UI only). */
export function randomSeed(entropy: number = Date.now() ^ Math.floor(Math.random() * 0xffffffff)): string {
  return shortHash(String(entropy), 6) + '-' + shortHash(String(entropy * 31 + 7), 4);
}
