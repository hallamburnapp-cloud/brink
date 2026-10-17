/**
 * One game, start to ending, under a bot. The record it returns is what the statistics and the gates
 * read. A game that does not end within the action budget is a stall (the gates forbid any).
 */
import { Rng } from '../../engine/rng.ts';
import type { RedlinesContent } from '../engine/content.ts';
import { answerPhone, endWeek, newGame } from '../engine/run.ts';
import type { EndingKind, GameState, Step } from '../engine/types.ts';
import type { Bot } from './bots.ts';

/** Eight weeks, each with at most three phone rounds, plus a margin. */
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
  while (s.phase !== 'ended' && actions++ < ACTION_BUDGET) {
    if (s.phase === 'act') {
      s = bot.act(content, s, rng);
      if (s.offer) offered++;
      s = endWeek(content, s);
    } else if (s.phase === 'phone') {
      phones++;
      const p = s.phone!;
      const isTest = p.kind === 'test' || p.kind === 'test-inherited' || p.kind === 'feint';
      if (isTest) tests++;
      const key = bot.answer(content, s, rng);
      if (isTest) {
        if (key === 'back') backed++;
        else if (key === 'down') backedDown++;
        else waited++;
        if (key !== 'back' && p.region && s.influence < 12) short++;
      }
      const next = answerPhone(content, s, key);
      if (next === s) throw new Error(`${bot.name} on ${seed} week ${s.week}: answer ${key} refused`);
      s = next;
    }
    warPeak = Math.max(warPeak, s.war);
    if (s.fed.step > stepPeak) stepPeak = s.fed.step;
  }
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
  };
}
