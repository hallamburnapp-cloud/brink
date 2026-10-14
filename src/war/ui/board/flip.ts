/**
 * Which characters a split-flap tile passes through on its way to a new one (STYLE 5.2). Real
 * drums show every leaf between; the board shows a few of them, and only ones on the way, so a
 * flip never reads as a wrong number.
 */

const DIGITS = '0123456789';
/** Magnitude units in order: a unit tile steps up this ladder, never past its target. */
const UNITS = 'KMBT';

/**
 * The characters a tile shows on its way from `from` to `to`, ending on `to`: at most `flips`
 * steps. A digit counting up passes evenly through the digits between; a unit steps up the K, M,
 * B, T ladder. Anything else (a blank, a fall, a letter) flips straight to the new character, so
 * no flip ever shows a value outside the old and the new.
 */
export function flipPath(from: string, to: string, flips: number): string[] {
  if (from === to) return [];
  const between = (pool: string): string[] => {
    const a = pool.indexOf(from);
    const b = pool.indexOf(to);
    if (a < 0 || b <= a) return [];
    const steps = Math.min(Math.max(0, flips - 1), b - a - 1);
    const out: string[] = [];
    for (let i = 1; i <= steps; i++) out.push(pool[a + Math.round(((b - a) * i) / (steps + 1))]);
    return out;
  };
  const via = DIGITS.includes(to) ? between(DIGITS) : UNITS.includes(to) ? between(UNITS) : [];
  return [...via, to];
}
