/**
 * What the end card says (SPEC section 9), from the engine's end view: the lines under the title,
 * the best send for the console's readout band, and the biggest turn. Nothing reads as broken when
 * nothing was won: a best send that missed says what it needed ('6 · NEEDED 64'), not '0.0x', and a
 * game with no region won has no 'biggest turn'.
 */
import { formatInt, type EndView } from '../../engine';

export interface EndCopy {
  lines: string[];
  /** The best send: the score, and how it measured up ('39× THE TARGET' or 'NEEDED 64'). */
  best: { value: string; note: string; won: boolean } | null;
  /** '7 regions', or null when no send won. */
  biggest: string | null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** 'n×' of the target: whole from 10x, one decimal (floored) below. */
export function timesText(score: bigint, target: bigint): string {
  if (score >= 10n * target) return `${formatInt(score / target)}×`;
  const tenths = (score * 10n) / target;
  return `${tenths / 10n}.${tenths % 10n}×`;
}

export function endCopy(e: EndView): EndCopy {
  const lines: string[] = [];
  if (e.ending === 'WORLD UNITED') lines.push(`Turn ${e.turn} · war peaked at ${e.peakWar}`);
  else if (e.ending === 'CEASEFIRE') {
    // The push forgave two misses; its third stopped the war where it stood.
    lines.push('The final push missed three times.');
    lines.push(`War held ${plural(e.red, 'region', 'regions')} when it stopped.`);
  }
  else {
    lines.push(`War took ${plural(e.red, 'region', 'regions')}. You held ${e.gold} of 30.`);
    if (e.nearMiss.length) lines.push(`Only ${plural(e.nearMiss.length, 'free region was', 'free regions were')} left to win.`);
  }
  const b = e.best;
  const best = b
    ? b.score >= b.target
      ? { value: formatInt(b.score), note: `${timesText(b.score, b.target)} THE TARGET`, won: true }
      : { value: formatInt(b.score), note: `NEEDED ${formatInt(b.target)}`, won: false }
    : null;
  const biggest = e.biggestTurn && e.biggestTurn.regions > 0 ? plural(e.biggestTurn.regions, 'region', 'regions') : null;
  return { lines, best, biggest };
}
