/**
 * The goal bars' segments (SPEC section 10): filled from the left, with ghost segments showing what
 * the current pins would do before SEND (regions a win adds, red a win takes back, the region a
 * miss hands to war).
 */

/** 'on' filled; 'gain' a ghost the send would fill; 'loss' filled now, emptied by the send; 'off' empty. */
export type Seg = 'on' | 'gain' | 'loss' | 'off';

export function segments(total: number, filled: number, after: number | null): Seg[] {
  const now = clamp(filled, total);
  const next = after === null ? now : clamp(after, total);
  return Array.from({ length: total }, (_, i): Seg => {
    if (i < Math.min(now, next)) return 'on';
    if (i < now) return 'loss';
    if (i < next) return 'gain';
    return 'off';
  });
}

function clamp(n: number, total: number): number {
  return Math.max(0, Math.min(total, Math.floor(n)));
}

/** War at 8 or 9 of 10: the last segments pulse and the drone rises. */
export function warDanger(red: number, limit: number): boolean {
  return red >= limit - 2 && red < limit;
}
