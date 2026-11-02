/**
 * The end: the ending's two typed lines, the dials in words, the closing card's lessons, and the debrief
 * (every hidden thought under the player's own orders, week by week). SPEC-SMALL "Sentences are true":
 * the treaty names a place they really pushed (lastBacked is set only on a real test), WORLD WAR names
 * the first place that fell on the tape (fellSeq). "The debrief teaches": two or three lessons drawn from
 * the game's own events, and the jumpiness dial named only when something let it show.
 */
import type { HiddenKind, RedlinesContent } from './content.ts';
import { fallOrder, fightingRegions, pressedRegions, tallyOf } from './board.ts';
import { RULES, scoreOf } from './rules.ts';
import type { Ending, EndingKind, Federation, GameState, RegionId } from './types.ts';
import { cap, fightingPhrase, fightingSentence, fill, listNames, numberWord } from './words.ts';
import { mapOrder, regionName } from './world.ts';

function dialWord(c: RedlinesContent, dial: 'appetite' | 'jumpiness', value: number): string {
  const w = c.strings.dials[dial];
  return value < RULES.dialLow ? w.low : value > RULES.dialHigh ? w.high : w.mid;
}

/**
 * "They were hungry and not easily scared." When nothing in the game let jumpiness show (no piece on their
 * doorstep, no alarm, no pull-back, no back-down), only appetite is named: "They were hungry. You never came
 * close enough to see whether they scare."
 */
export function dialsLine(c: RedlinesContent, fed: Pick<Federation, 'appetite' | 'jumpiness'>, jumpinessSeen = true): string {
  const a = dialWord(c, 'appetite', fed.appetite);
  if (!jumpinessSeen) return fill(c.strings.dials.lineOne, { a });
  return fill(c.strings.dials.line, { a, b: dialWord(c, 'jumpiness', fed.jumpiness) });
}

/** The place where the fighting began: the first fall on the tape still fighting, else the first fall at all. */
export function firstFallen(s: GameState): RegionId | null {
  const fighting = fightingRegions(s);
  const pool = fighting.length ? fighting : mapOrder(Object.keys(s.regions).filter((r) => s.regions[r].fellWeek !== undefined));
  if (!pool.length) return null;
  const order = (r: RegionId) => fallOrder(s.regions[r]) ?? Infinity;
  let best = pool[0];
  for (const r of pool) if (order(r) < order(best)) best = r;
  return best;
}

/** How many lessons the closing card carries at most. */
export const MAX_LESSONS = 3;

/**
 * The back-down the closing card speaks of, and how to say it truly (SPEC-SMALL "a lesson is drawn only from what
 * happened ... is never false"): the first real back-down whose place fell and stayed fallen ("the place fell anyway"),
 * else the first back-down, said as it went: a scared Federation that stood down too, a column that was only for
 * show, or a step climbed over a place that did not fall (or came back).
 */
export function backDownLesson(s: GameState): [HiddenKind, RegionId] | null {
  const T = tallyOf(s);
  const all = T.backDowns ?? [];
  if (!all.length) return T.backedDown > 0 && T.backedDownFirst ? ['lessonBackedDownHeld', T.backedDownFirst] : null;
  const stayedFallen = (r: RegionId, week: number) => {
    const rec = s.regions[r];
    return rec.state === 'fighting' && rec.fellWeek !== undefined && rec.fellWeek >= week;
  };
  const fell = all.find((b) => !b.feint && !b.eased && stayedFallen(b.region, b.week));
  if (fell) return ['lessonBackedDown', fell.region];
  // The held and feint lessons say they climbed a step for it: never of a back-down at the top of the ladder ("· still ALL-OUT").
  const first = all.find((b) => b.eased || !b.top);
  if (!first) return null;
  if (first.eased) return ['lessonBackedDownEased', first.region];
  if (first.feint) return ['lessonBackedDownFeint', first.region];
  return ['lessonBackedDownHeld', first.region];
}

/** A place that fell unanswered while something of yours could have reached it (the no-orders lesson needs one). */
function fellAnswerable(s: GameState): boolean {
  return Object.values(s.regions).some((r) => r.fellWeek !== undefined && r.fellReach && (r.fellBy === 'unanswered' || r.fellBy === 'waited'));
}

/**
 * The lessons of this game, most useful first: the things the player did (or never did) that the next game can
 * change, each filled with the game's own places, and each true of what happened. Up to MAX_LESSONS; none when nothing
 * stood out. "No orders" is drawn only when a place fell that something of yours could have reached, counting only the
 * idle weeks in which an order could have answered a hatched place.
 */
export function lessonsOf(c: RedlinesContent, s: GameState): string[] {
  const T = tallyOf(s);
  const out: Array<[HiddenKind, Record<string, string>]> = [];
  if (T.feintsBacked > 0 && T.feintBackedFirst) out.push(['lessonFeintBacked', { region: regionName(T.feintBackedFirst) }]);
  const down = backDownLesson(s);
  if (down) out.push([down[0], { region: regionName(down[1]) }]);
  if ((T.jumpySteps ?? 0) > 0 && T.jumpyFirst) out.push(['lessonJumpy', { piece: c.strings.pieces[T.jumpyFirst.piece], region: regionName(T.jumpyFirst.region) }]);
  if (T.farDrops > 0 && T.farDropFirst) out.push(['lessonFarDrop', { region: regionName(T.farDropFirst) }]);
  const idle = T.idleAnswerable ?? 0;
  if (idle >= 2 && fellAnswerable(s)) out.push(['lessonNoOrders', { n: numberWord(c, idle) }]);
  else if (T.moves === 0 && s.week >= 4) out.push(['lessonNoMoves', {}]);
  if (T.testsDashed >= 2 && T.testsSolid === 0) out.push(['lessonDashedTested', {}]);
  if (T.outOfReach > 0 && T.outOfReachFirst) out.push(['lessonOutOfReach', { region: regionName(T.outOfReachFirst) }]);
  if (T.backed >= 2 && T.backedDown === 0 && T.feintsBacked === 0) out.push(['lessonKeptWord', {}]);
  if (T.stoppedThenTalked > 0) out.push(['lessonStoppedThenTalked', {}]);
  return out
    .slice(0, MAX_LESSONS)
    .map(([kind, slots]) => cap(fill(c.debrief[kind]?.[0] ?? '', slots)))
    .filter(Boolean);
}

/** The closing card's lines: the lessons, then the dials (the dials line is always last). Printed once, on the card. */
export function closingLines(c: RedlinesContent, s: GameState): string[] {
  return [...lessonsOf(c, s), dialsLine(c, s.fed, tallyOf(s).jumpinessSeen)];
}

export function endingOf(c: RedlinesContent, s: GameState, kind: EndingKind): Ending {
  const fighting = fightingRegions(s).length;
  const week = s.week;
  const score = scoreOf({ kind, week, fighting });
  const E = c.strings.endings;
  const dials = dialsLine(c, s.fed, tallyOf(s).jumpinessSeen);
  const lessons = lessonsOf(c, s);
  if (kind === 'treaty') {
    const B = c.strings.because;
    // SPEC-SMALL "Sentences are true": "they could not take X" only of a place backed on a real test that never fell after.
    const held = s.lastBacked && s.regions[s.lastBacked]?.state !== 'fighting' ? regionName(s.lastBacked) : null;
    let because = held && s.waysOut ? fill(B.heldAndWayOut, { region: held }) : held ? fill(B.held, { region: held }) : s.waysOut ? B.wayOut : B.quiet;
    // SPEC-SMALL "The treaty is signed over a quiet map, or says what it leaves": the places still hatched at the signing.
    const pressed = pressedRegions(s);
    if (pressed.length) because = `${because} ${fill(B.leaves, { places: listNames(pressed) })}`;
    return { kind, week, fighting, score, lines: [fill(E.treaty[0], { week, fighting: fightingPhrase(c, fighting) }), fill(E.treaty[1], { because })], because, dials, lessons };
  }
  if (kind === 'frozen') {
    const because = fightingSentence(c, fighting);
    return { kind, week, fighting, score, lines: [fill(E.frozen[0], { week }), fill(E.frozen[1], { fighting: because })], because, dials, lessons };
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
    lessons,
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
