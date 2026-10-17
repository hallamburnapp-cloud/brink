/**
 * The end: the ending's two typed lines, the dials in words, and the debrief (every hidden thought
 * under the player's own orders, week by week).
 */
import type { RedlinesContent } from './content.ts';
import { fightingRegions } from './board.ts';
import { RULES, scoreOf } from './rules.ts';
import type { Ending, EndingKind, Federation, GameState, RegionId } from './types.ts';
import { fightingPhrase, fightingSentence, fill } from './words.ts';
import { mapOrder, regionName } from './world.ts';

function dialWord(c: RedlinesContent, dial: 'appetite' | 'jumpiness', value: number): string {
  const w = c.strings.dials[dial];
  return value < RULES.dialLow ? w.low : value > RULES.dialHigh ? w.high : w.mid;
}

/** "They were hungry and not easily scared." */
export function dialsLine(c: RedlinesContent, fed: Pick<Federation, 'appetite' | 'jumpiness'>): string {
  return fill(c.strings.dials.line, { a: dialWord(c, 'appetite', fed.appetite), b: dialWord(c, 'jumpiness', fed.jumpiness) });
}

/** The place where the fighting began: the earliest fall still fighting, else the earliest fall at all. */
export function firstFallen(s: GameState): RegionId | null {
  const fighting = fightingRegions(s);
  const pool = fighting.length ? fighting : mapOrder(Object.keys(s.regions).filter((r) => s.regions[r].fellWeek !== undefined));
  if (!pool.length) return null;
  let best = pool[0];
  for (const r of pool) if ((s.regions[r].fellWeek ?? 99) < (s.regions[best].fellWeek ?? 99)) best = r;
  return best;
}

export function endingOf(c: RedlinesContent, s: GameState, kind: EndingKind): Ending {
  const fighting = fightingRegions(s).length;
  const week = s.week;
  const score = scoreOf({ kind, week, fighting });
  const E = c.strings.endings;
  const dials = dialsLine(c, s.fed);
  if (kind === 'treaty') {
    const B = c.strings.because;
    const held = s.lastBacked ? regionName(s.lastBacked) : null;
    const because = held && s.waysOut ? fill(B.heldAndWayOut, { region: held }) : held ? fill(B.held, { region: held }) : s.waysOut ? B.wayOut : B.quiet;
    return { kind, week, fighting, score, lines: [fill(E.treaty[0], { week, fighting: fightingPhrase(c, fighting) }), fill(E.treaty[1], { because })], because, dials };
  }
  if (kind === 'frozen') {
    const because = fightingSentence(c, fighting);
    return { kind, week, fighting, score, lines: [fill(E.frozen[0], { week }), fill(E.frozen[1], { fighting: because })], because, dials };
  }
  const region = firstFallen(s);
  const cause = c.strings.causes[(region && s.regions[region].fellBy) || 'unanswered'];
  return {
    kind,
    week,
    fighting,
    score,
    lines: [fill(E.war[0], { week }), fill(E.war[1], { region: region ? regionName(region) : '', cause })],
    because: cause,
    dials,
  };
}

/** The hidden thoughts per decision, for the ending screen: one entry per hidden line, under that week's orders. */
export function debrief(s: GameState): Array<{ week: number; what: string; thought: string }> {
  const out: Array<{ week: number; what: string; thought: string }> = [];
  for (const w of s.log) {
    const what = w.acts.join(' ');
    for (const thought of w.hidden) out.push({ week: w.week, what, thought });
  }
  return out;
}
