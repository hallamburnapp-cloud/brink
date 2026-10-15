/**
 * Targets and the region ladder (SPEC sections 5 and 6), in exact integer arithmetic.
 * target(t) = 64 x 1.5^(t-1), rounded to 2 significant figures (halves up): 64, 96, 140, 220 ...
 * A score wins one region per mark it reaches: T, 4T, 16T, then each mark double the last
 * (32T, 64T, 128T ...), with no cap.
 */
import { RULES } from './rules';

/** Round num/den (positive) to 2 significant figures, halves up; below 100, to a whole number. */
function nice(num: bigint, den: bigint): bigint {
  if (num < 100n * den) return (2n * num + den) / (2n * den);
  const digits = (num / den).toString().length;
  const mag = 10n ** BigInt(digits - 2);
  return ((2n * num + mag * den) / (2n * mag * den)) * mag;
}

/** The target of turn t (1-based). */
export function target(t: number): bigint {
  const k = BigInt(Math.max(0, t - 1));
  const { num, den } = RULES.targetRatio;
  return nice(RULES.target0 * num ** k, den ** k);
}

/** The multiple of the target after `m` on the ladder: 1 -> 4 -> 16 -> 32 -> 64 ... */
function nextMultiple(m: bigint): bigint {
  const rungs = RULES.ladder;
  if (m === 1n) return rungs[0];
  const i = rungs.indexOf(m);
  if (i >= 0 && i + 1 < rungs.length) return rungs[i + 1];
  return m * RULES.ladderThen;
}

/** The first `count` marks of the ladder for target T: [T, 4T, 16T, 32T ...]. */
export function marks(T: bigint, count: number): bigint[] {
  const out: bigint[] = [];
  for (let m = 1n; out.length < count; m = nextMultiple(m)) out.push(T * m);
  return out;
}

/** Regions a score wins against target T: 0 below the target, else the number of marks reached. */
export function regionsWon(score: bigint, T: bigint): number {
  let k = 0;
  for (let m = 1n; score >= T * m; m = nextMultiple(m)) k++;
  return k;
}

/** The score that wins one more region than `score` does (the readout's NEXT REGION AT). */
export function nextMark(score: bigint, T: bigint): bigint {
  let m = 1n;
  while (score >= T * m) m = nextMultiple(m);
  return T * m;
}
