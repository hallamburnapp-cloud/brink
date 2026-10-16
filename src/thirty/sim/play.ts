/**
 * One game, start to ending, under a bot. The record it returns is what the statistics and the gates
 * read. A game that does not end within the action budget is a stall (the gates forbid any).
 */
import { Rng } from '../../engine/rng.ts';
import type { PieceId, ThirtyContent } from '../content/types.ts';
import { choose, newGame, pick, tapRegion } from '../engine/run.ts';
import { TENSE, WAR } from '../engine/rules.ts';
import type { EndingKind, GameState } from '../engine/types.ts';
import { nightSteps } from '../engine/words.ts';
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
  /** It felt close: the gauge passed CLOSE_CALL at least once, or a region went red before the end (ENGINE.md item 15). */
  closeCall: boolean;
  /** DANGER at the end of each day, in order. */
  curve: number[];
  /** The first day a region reached WAR by any step but the ending's own push, or null (what the player could see coming). */
  firstRedDay: number | null;
  /** A WAR ending decided by the engine pushing a crisis red on the final night (the 'war' step). */
  endedByPush: boolean;
  /** Days the choice lowered DANGER, and how many of those nights gave back at least as much. */
  dropDays: number;
  nightWins: number;
  /** Night steps in the last ten days: red spreading against trouble flaring at random. */
  lateSpread: number;
  lateFlare: number;
  /** TENSE regions on the final map. */
  finalTense: number;
  /** Per piece: days held at a choice, and days it changed the outcome (the chip glowed). */
  heldDays: Record<PieceId, number>;
  firedDays: Record<PieceId, number>;
}

export function playGame(content: ThirtyContent, bot: Bot, seed: string, botSeed = `${bot.name}:${seed}`): GameRecord {
  const rng = new Rng(botSeed);
  let s: GameState = newGame(content, seed);
  let actions = 0;
  // Pieces that act as a card arrives (the Hotline, the directors) are on the card, not in the day's trace.
  const arrivals: Record<PieceId, number> = {};
  while (s.phase !== 'over' && actions++ < ACTION_BUDGET) {
    if (s.phase === 'choose' && s.card) {
      const seen = new Set<PieceId>();
      for (const st of s.card.arrival) {
        const id = st.kind === 'heat' ? st.piece : st.kind === 'piece' ? st.piece : undefined;
        if (id && !seen.has(id)) {
          seen.add(id);
          arrivals[id] = (arrivals[id] ?? 0) + 1;
        }
      }
    }
    const r = s.phase === 'offer' ? pick(content, s, bot.pick(content, s, rng)) : act(content, s, bot.option(content, s, rng));
    if (!r.ok) throw new Error(`${bot.name} on ${seed} day ${s.day}: ${r.reason}`);
    s = r.state;
  }
  return record(content, bot, seed, s, arrivals);
}

function act(content: ThirtyContent, s: GameState, option: string) {
  const card = content.cards[s.card!.id];
  return card.map ? tapRegion(content, s, option) : choose(content, s, option as 'left' | 'right');
}

export function record(content: ThirtyContent, bot: Bot, seed: string, s: GameState, arrivals: Readonly<Record<PieceId, number>> = {}): GameRecord {
  const curve = s.log.map((t) => t.dangerAfter);
  const peak = Math.max(s.peak, ...curve);
  let firstRedDay: number | null = null;
  let dropDays = 0;
  let nightWins = 0;
  let lateSpread = 0;
  let lateFlare = 0;
  const heldDays: Record<PieceId, number> = {};
  const firedDays: Record<PieceId, number> = {};
  // The team at each day is the team before that day's offer: replay the picks alongside the log.
  const team: PieceId[] = [];
  const picks = [...s.picks];
  for (const t of s.log) {
    while (picks.length && picks[0].day < t.day) {
      const p = picks.shift()!;
      if (p.taken) team.push(p.taken);
    }
    for (const id of team) heldDays[id] = (heldDays[id] ?? 0) + 1;
    for (const id of new Set(t.fired)) firedDays[id] = (firedDays[id] ?? 0) + 1;
    for (const st of t.steps) {
      if (st.kind === 'heat' && st.to === WAR && st.why !== 'war' && firstRedDay === null) firstRedDay = t.day;
    }
    const drop = t.dangerBefore - t.dangerAfterChoice;
    if (drop > 0) {
      dropDays++;
      if (t.dangerAfter - t.dangerAfterChoice >= drop) nightWins++;
    }
    if (t.day > 20) {
      for (const st of nightSteps(t)) {
        if (st.kind !== 'heat') continue;
        if (st.why === 'spread') lateSpread++;
        else if (st.why === 'flare') lateFlare++;
      }
    }
  }
  for (const [id, n] of Object.entries(arrivals)) firedDays[id] = (firedDays[id] ?? 0) + n;
  const last = s.log[s.log.length - 1];
  const endedByPush = s.ending?.kind === 'WAR' && !!last && last.steps.some((st) => st.kind === 'heat' && st.why === 'war');
  return {
    firstRedDay,
    endedByPush,
    dropDays,
    nightWins,
    lateSpread,
    lateFlare,
    finalTense: Object.values(s.heats).filter((h) => h === TENSE).length,
    heldDays,
    firedDays,
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
    closeCall: peak > CLOSE_CALL || firstRedDay !== null,
    curve,
  };
}
