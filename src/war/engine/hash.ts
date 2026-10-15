/**
 * Stable hashes for determinism checks: the same seed and the same actions must give the same
 * trace (and state) in every browser. FNV-1a 32-bit over a canonical string, as 8 hex digits.
 */
import type { GameState, TraceEvent } from './types';

function fnv1a(text: string, h = 0x811c9dc5): number {
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Canonical JSON: object keys sorted, BigInt as 'n'-suffixed strings. */
export function canonical(value: unknown): string {
  if (typeof value === 'bigint') return JSON.stringify(`${value}n`);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const obj = value as Record<string, unknown>;
    return `{${keys.filter((k) => obj[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function hashText(text: string): string {
  return fnv1a(text).toString(16).padStart(8, '0');
}

/** Hash a send's trace (or several traces joined). */
export function hashTrace(events: readonly TraceEvent[]): string {
  return hashText(canonical(events));
}

/** Hash a whole game state (everything, including the rng streams). */
export function hashState(s: GameState): string {
  return hashText(canonical(s));
}
