/**
 * One game, start to end, with a bot at the controls (reference bots.py `play`). Each turn the bot
 * picks a send, may swap once and pick again, and sends; after turns 2, 4, 6 ... it shops. The log
 * keeps what the gates and the time model need, one row per turn.
 */
import {
  clearPins,
  effective,
  must,
  newGame,
  nextTurn,
  price,
  send,
  swap,
  type Ending,
  type GameState,
  type SendRecord,
  type StaffId,
} from '../engine';
import type { Bot, BotName } from './bots';
import { bestSend, openingSpread, type SpreadSample } from './choose';
import { pinGroup, seatIds } from './drive';
import { makeBot } from './roster';

/** A game still going after this many turns is a stall (gate G17). The reference uses the same cap. */
export const MAX_TURNS = 60;

export interface TurnRow {
  turn: number;
  target: number;
  score: number;
  result: 'win' | 'miss';
  /** Regions won (0 on a miss). */
  won: number;
  /** Regions the outcome recoloured: the ones won, the crisis lost to war, or none (a CEASEFIRE). */
  recoloured: number;
  /** After the turn, war's own spread included. */
  gold: number;
  red: number;
  grey: number;
  pins: number;
  swaps: number;
  /** Seats that fire on the send (an idle Deputy and the Herald do not). */
  firing: number;
  /** Per-region pops in the cascade (Governor, Harbourmaster, Sovereign, once per matching pin). */
  pops: number;
  finalPush: boolean;
  onCrisis: boolean;
  /** War spread by itself after this turn. */
  spread: boolean;
  /** Turns a shop followed: was any offer affordable when it opened (before any sale)? */
  shopAffordable?: boolean;
  /** Turns a shop followed: staff in the line-up leaving the shop that were not there before. */
  bought?: number;
}

export interface GameLog {
  bot: BotName;
  seed: string;
  end: Ending | 'STALL';
  turns: number;
  gold: number;
  red: number;
  grey: number;
  /** The final line-up, left to right. */
  seats: StaffId[];
  shops: number;
  log: TurnRow[];
  /** The choice on each turn's opening deal. */
  spread: SpreadSample[];
}

/** Watches a game as it is played (the replay export in replay.ts). */
export interface PlayObserver {
  /** A turn was dealt: phase 'choose', nothing pinned. */
  dealt?(s: GameState): void;
  /** The turn was sent: phase 'outcome', 'shop' (offers on the table) or 'over'. */
  sent?(s: GameState): void;
  /** The bot left the shop. */
  shopped?(s: GameState): void;
}

export interface PlayOptions {
  maxTurns?: number;
  /** Play the scripted first game (seed FIRST-WORLD). */
  firstWorld?: boolean;
  observer?: PlayObserver;
}

function turnRow(rec: SendRecord, seats: readonly StaffId[], swaps: number): TurnRow {
  return {
    turn: rec.turn,
    target: Number(rec.target),
    score: Number(rec.score),
    result: rec.result,
    won: rec.regions,
    recoloured: rec.result === 'win' ? rec.regions : rec.lost ? 1 : 0,
    gold: rec.gold,
    red: rec.red,
    grey: rec.grey,
    pins: rec.pins.length,
    swaps,
    firing: effective(seats).filter((x) => x !== null && x !== 'HERALD').length,
    pops: rec.trace.filter((e) => e.kind === 'regionStaff').length,
    finalPush: rec.finalPush,
    onCrisis: rec.onCrisis,
    spread: rec.spread !== null,
  };
}

/** Play one turn from phase 'choose' to the sent state, and log it. */
function playTurn(s: GameState, bot: Bot, log: TurnRow[]): GameState {
  let swaps = 0;
  let move = bot.pick(s, false);
  if (move.kind === 'swap' && s.deal.swapsLeft > 0) {
    // The engine refuses a swap with nothing to swap in; the bot then plays on as if it had swapped.
    const r = swap(pinGroup(s, move.keep));
    if (r.ok) swaps = 1;
    s = must(clearPins(r.state));
    move = bot.pick(s, true);
  }
  const pins = move.kind === 'send' ? move.pins : bestSend(s).pins;
  const seats = seatIds(s);
  s = must(send(pinGroup(s, pins)));
  log.push(turnRow(s.lastSend!, seats, swaps));
  return s;
}

export function playGame(seed: string, botName: BotName, opts: PlayOptions = {}): GameLog {
  const maxTurns = opts.maxTurns ?? MAX_TURNS;
  const bot = makeBot(botName, seed);
  let s = newGame(seed, { firstWorld: opts.firstWorld });
  const log: TurnRow[] = [];
  const spread: SpreadSample[] = [];
  const watch: PlayObserver = opts.observer ?? {};
  let stalled = false;
  for (;;) {
    watch.dealt?.(s);
    spread.push(openingSpread(s));
    s = playTurn(s, bot, log);
    watch.sent?.(s);
    if (s.phase === 'shop') {
      const row = log[log.length - 1];
      row.shopAffordable = s.shop!.offers.some((id) => id !== null && s.coins >= price(id));
      const before = new Set(seatIds(s));
      s = bot.shop(s);
      row.bought = seatIds(s).filter((id) => !before.has(id)).length;
      watch.shopped?.(s);
    }
    if (s.phase === 'over') break;
    if (s.turn >= maxTurns) {
      stalled = true;
      break;
    }
    s = must(nextTurn(s));
  }
  const count = (kind: 'gold' | 'red' | 'grey') => Object.values(s.owner).filter((o) => o === kind).length;
  return {
    bot: botName,
    seed,
    end: stalled ? 'STALL' : s.ending!,
    turns: s.turn,
    gold: count('gold'),
    red: count('red'),
    grey: count('grey'),
    seats: seatIds(s),
    shops: s.shopVisits,
    log,
    spread,
  };
}
