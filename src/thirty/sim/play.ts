/**
 * One game, start to ending, under a bot. The record it returns is what the statistics and the gates
 * read. A game that does not end within the action budget is a stall (the gates forbid any).
 */
import { Rng } from '../../engine/rng.ts';
import type { PieceId, ThirtyContent } from '../content/types.ts';
import { choose, newGame, pick, tapRegion } from '../engine/run.ts';
import type { EndingKind, GameState } from '../engine/types.ts';
import type { Bot } from './bots.ts';

/** Days plus offers plus a margin: more actions than this is a stall. */
export const ACTION_BUDGET = 60;
/** SPEC: the median sensible game sees the gauge above this at least once. */
export const CLOSE_CALL = 60;

export interface GameRecord {
  seed: string;
  bot: string;
  ending: EndingKind | 'STALL';
  /** The day the game ended on (30 for HELD). */
  day: number;
  danger: number;
  peak: number;
  clean: boolean;
  team: PieceId[];
  /** Pieces offered over the game (for take rates). */
  offered: PieceId[];
  mapDays: number;
  riskyDays: number;
  /** The gauge passed CLOSE_CALL at least once. */
  closeCall: boolean;
  /** DANGER at the end of each day, in order. */
  curve: number[];
}

export function playGame(content: ThirtyContent, bot: Bot, seed: string, botSeed = `${bot.name}:${seed}`): GameRecord {
  const rng = new Rng(botSeed);
  let s: GameState = newGame(content, seed);
  let actions = 0;
  while (s.phase !== 'over' && actions++ < ACTION_BUDGET) {
    const r = s.phase === 'offer' ? pick(content, s, bot.pick(content, s, rng)) : act(content, s, bot.option(content, s, rng));
    if (!r.ok) throw new Error(`${bot.name} on ${seed} day ${s.day}: ${r.reason}`);
    s = r.state;
  }
  return record(content, bot, seed, s);
}

function act(content: ThirtyContent, s: GameState, option: string) {
  const card = content.cards[s.card!.id];
  return card.map ? tapRegion(content, s, option) : choose(content, s, option as 'left' | 'right');
}

export function record(content: ThirtyContent, bot: Bot, seed: string, s: GameState): GameRecord {
  const curve = s.log.map((t) => t.dangerAfter);
  const peak = Math.max(s.peak, ...curve);
  return {
    seed,
    bot: bot.name,
    ending: s.ending?.kind ?? 'STALL',
    day: s.ending?.day ?? s.day,
    danger: s.ending?.danger ?? curve[curve.length - 1] ?? 0,
    peak,
    clean: s.ending?.kind === 'HELD' && s.ending.clean,
    team: [...s.team],
    offered: s.picks.flatMap((p) => p.offer),
    mapDays: s.log.filter((t) => content.cards[t.card]?.map).length,
    riskyDays: s.log.filter((t) => t.tag === 'RISKY').length,
    closeCall: peak > CLOSE_CALL,
    curve,
  };
}
