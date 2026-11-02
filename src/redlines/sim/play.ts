/**
 * One game, start to ending, under a bot. The record it returns is what the statistics and the gates
 * read. A game that does not end within the action budget is a stall (the gates forbid any).
 */
import { Rng } from '../../engine/rng.ts';
import { fightingRegions, holdInfo, pressedRegions, weeksLeft } from '../engine/board.ts';
import type { RedlinesContent } from '../engine/content.ts';
import { answerPhone, canAnswer, endWeek, newGame } from '../engine/run.ts';
import type { EndingKind, GameState, RegionId, Step } from '../engine/types.ts';
import type { Bot } from './bots.ts';
import { brokenInvariants } from './invariants.ts';

/** Ten weeks, each with an act and a phone, plus a margin. */
export const ACTION_BUDGET = 60;

export interface GameRecord {
  seed: string;
  bot: string;
  ending: EndingKind | 'STALL';
  week: number;
  score: number;
  fighting: number;
  treaty: number;
  step: Step;
  warPeak: number;
  stepPeak: Step;
  /** Hidden lines over the whole game (the debrief). */
  hidden: number;
  phones: number;
  tests: number;
  backed: number;
  backedDown: number;
  waited: number;
  waysOutOffered: number;
  waysOutAccepted: number;
  appetite: number;
  jumpiness: number;
  influenceEnd: number;
  /** The weeks in which the bot had no influence to back a test it wanted to back. */
  short: number;
  /** Lines (tape, debrief, ending) that reached the player with a `{slot}` unfilled. */
  unfilled: number;
  /** Weeks played, and weeks in which the bot gave no orders at all. */
  weeks: number;
  idleWeeks: number;
  /** Tests of a solid promise the bot wanted to back and could not pay for (the careful hand "broke on influence"). */
  shortSolid: number;
  /** Rules the game broke (invariants.ts, the WAR count after every call, the clock against the real fall): must be 0. */
  broken: number;
  /** The first of them, in plain words, for the report. */
  brokenFirst: string | null;
}

const UNFILLED = /\{[a-z][a-zA-Z]*\}/;

/** Every line a game put in front of the player: the tape, the debrief, the acts, the ending, the collision, the phones. */
export function countUnfilled(s: GameState, phones: readonly string[]): number {
  const lines: string[] = [s.collision, ...s.headline, ...phones];
  for (const w of s.log) lines.push(...w.visible, ...w.hidden, ...w.acts);
  if (s.ending) lines.push(...s.ending.lines, s.ending.because, s.ending.dials, ...(s.ending.lessons ?? []));
  return lines.filter((l) => UNFILLED.test(l)).length;
}

export function playGame(content: RedlinesContent, bot: Bot, seed: string): GameRecord {
  const rng = new Rng(`${bot.name}:${seed}`);
  let s: GameState = newGame(content, seed);
  let actions = 0;
  let phones = 0;
  let tests = 0;
  let backed = 0;
  let backedDown = 0;
  let waited = 0;
  let offered = 0;
  let short = 0;
  let warPeak = 0;
  let stepPeak: Step = s.fed.step;
  let shortSolid = 0;
  const phoneLines: string[] = [];
  const broken: string[] = [];
  // The clock the sheet showed at SEND ORDERS (weeksLeft), checked against the falls the week then printed: a place
  // that falls by the clock had one week left. A place the phone's answer lost (or moved a piece away from) is the
  // answer's, and a place that was answered at SEND ORDERS (null: its clock paused) is not the clock's either.
  let clock: { week: number; left: Record<RegionId, number | null> } | null = null;
  const checkClock = (now: GameState) => {
    if (!clock || (now.week === clock.week && now.phase !== 'ended')) return;
    const w = now.log.find((l) => l.week === clock!.week);
    for (const b of w?.beats ?? []) {
      if ((b.kind !== 'fell' && b.kind !== 'waitedFell') || !b.region) continue;
      if (!(b.region in clock.left)) broken.push(`week ${clock.week}: ${b.region} fell by the clock but was not pressed at SEND ORDERS`);
      else {
        const left = clock.left[b.region];
        if (left !== null && left !== 1) broken.push(`week ${clock.week}: ${b.region} fell with ${left} weeks left on its clock`);
      }
    }
    clock = null;
  };
  const checkWar = (now: GameState, when: string) => {
    if (now.war !== fightingRegions(now).length) broken.push(`week ${now.week} ${when}: WAR ${now.war} with ${fightingRegions(now).length} fighting`);
  };
  while (s.phase !== 'ended' && actions++ < ACTION_BUDGET) {
    if (s.phase === 'act') {
      s = bot.act(content, s, rng);
      if (s.offer) offered++;
      clock = { week: s.week, left: Object.fromEntries(pressedRegions(s).map((r) => [r, weeksLeft(s, r)])) };
      s = endWeek(content, s);
      checkWar(s, 'after SEND ORDERS');
    } else if (s.phase === 'phone') {
      phones++;
      const p = s.phone!;
      phoneLines.push(p.text, p.advisers.hawk, p.advisers.dove, p.advisers.intel, ...p.options.flatMap((o) => [o.label, o.cost]));
      const isTest = p.kind === 'test' || p.kind === 'test-inherited' || p.kind === 'feint';
      if (isTest) tests++;
      const key = bot.answer(content, s, rng);
      if (isTest) {
        if (key === 'back') backed++;
        else if (key === 'down') backedDown++;
        else waited++;
        if (key !== 'back' && p.region && s.influence < 12) short++;
        if (key !== 'back' && p.region && holdInfo(s, p.region).ok && !canAnswer(s, 'back').ok) shortSolid++;
      }
      const next = answerPhone(content, s, key);
      if (next === s) throw new Error(`${bot.name} on ${seed} week ${s.week}: answer ${key} refused`);
      // What the answer touched is the answer's: the place it was about, and a place a piece left to go there.
      if (clock) {
        if (p.region) clock.left[p.region] = null;
        for (const piece of s.pieces) if (next.pieces.find((q) => q.kind === piece.kind)?.at !== piece.at) clock.left[piece.at] = null;
      }
      s = next;
      checkWar(s, 'after the answer');
    }
    checkClock(s);
    warPeak = Math.max(warPeak, s.war);
    if (s.fed.step > stepPeak) stepPeak = s.fed.step;
  }
  broken.push(...brokenInvariants(s));
  return {
    seed,
    bot: bot.name,
    ending: s.ending?.kind ?? 'STALL',
    week: s.ending?.week ?? s.week,
    score: s.ending?.score ?? 0,
    fighting: s.war,
    treaty: s.treaty,
    step: s.fed.step,
    warPeak,
    stepPeak,
    hidden: s.log.reduce((a, w) => a + w.hidden.length, 0),
    phones,
    tests,
    backed,
    backedDown,
    waited,
    waysOutOffered: offered,
    waysOutAccepted: s.waysOut,
    appetite: s.fed.appetite,
    jumpiness: s.fed.jumpiness,
    influenceEnd: s.influence,
    short,
    unfilled: countUnfilled(s, phoneLines),
    weeks: s.log.length,
    idleWeeks: s.tally?.idleWeeks ?? 0,
    shortSolid,
    broken: broken.length,
    brokenFirst: broken[0] ?? null,
  };
}
