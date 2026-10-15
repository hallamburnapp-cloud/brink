/**
 * The bots of the reference (docs/war/v2/reference/bots.py), ported to play the TypeScript engine
 * through its public actions only. Each bot picks a send (or a swap) on its turn and spends its
 * coins in the shop. The look-ahead shoppers (sensible, breaker) are in sensible.ts.
 *
 * random   a random touching group of 1-5 pinnable regions; never swaps; buys each affordable
 *          offer half the time and seats at random.
 * novice   a weak human: a random touching group of 3-5; never thinks about the crisis x2 or its
 *          staff; swaps only when it cannot make 3; buys the cheapest affordable offer into a free seat.
 * greedy   the best send every turn; swaps once, keeping its best group, when that misses. Never shops.
 * preview  greedy play; in the shop it follows only the preview number printed on each card and buys
 *          while the number goes up.
 */
import { Rng } from '../../engine/rng';
import {
  bestOnOpening,
  buy,
  must,
  previewNumber,
  price,
  RULES,
  sellValue,
  type GameState,
  type RegionId,
} from '../engine';
import { bestSend, randomGroup } from './choose';
import { arrangeSeats, seatIds } from './drive';

export type BotName = 'random' | 'novice' | 'greedy' | 'preview' | 'sensible' | 'breaker';

/** A bot's move on its turn: send these pins, or swap keeping these pins (then pick again). */
export type Pick = { kind: 'send'; pins: RegionId[] } | { kind: 'swap'; keep: RegionId[] };

export interface Bot {
  readonly name: BotName;
  /** The move for the current deal (phase 'choose'); `afterSwap` once the turn's swap is spent. */
  pick(s: GameState, afterSwap: boolean): Pick;
  /** Buy, sell, reroll and reseat (phase 'shop'); returns the state to leave the shop with. */
  shop(s: GameState): GameState;
}

const sendPins = (pins: RegionId[]): Pick => ({ kind: 'send', pins });

export class RandomBot implements Bot {
  readonly name: BotName = 'random';
  /** The bot's own stream, seeded as the reference seeds it (seed + ':bot'). */
  protected readonly rng: Rng;

  constructor(seed: string) {
    this.rng = new Rng(`${seed}:bot`);
  }

  pick(s: GameState, _afterSwap: boolean): Pick {
    return sendPins(randomGroup(s, this.rng));
  }

  shop(s: GameState): GameState {
    const offers = [...s.shop!.offers];
    for (let slot = 0; slot < offers.length; slot++) {
      const id = offers[slot];
      // The coin flip comes last, so it is drawn only for an offer the bot could buy.
      if (id && s.seats.length < RULES.seats && s.coins >= price(id) && this.rng.next() < 0.5) s = must(buy(s, slot));
    }
    return arrangeSeats(s, this.rng.shuffle(seatIds(s)));
  }
}

export class NoviceBot extends RandomBot {
  override readonly name: BotName = 'novice';

  override pick(s: GameState, afterSwap: boolean): Pick {
    let group: RegionId[] = [];
    for (let i = 0; i < 6; i++) {
      group = randomGroup(s, this.rng, 3, 5);
      if (group.length >= 3) return sendPins(group);
    }
    if (!afterSwap && s.deal.swapsLeft > 0) return { kind: 'swap', keep: [] };
    return sendPins(group);
  }

  override shop(s: GameState): GameState {
    while (s.seats.length < RULES.seats) {
      let cheapest = -1;
      const offers = s.shop!.offers;
      for (let slot = 0; slot < offers.length; slot++) {
        const id = offers[slot];
        if (!id || s.coins < price(id)) continue;
        if (cheapest < 0 || price(id) < price(offers[cheapest]!)) cheapest = slot;
      }
      if (cheapest < 0) break;
      s = must(buy(s, cheapest));
    }
    return s;
  }
}

export class GreedyBot implements Bot {
  readonly name: BotName = 'greedy';
  protected readonly rng: Rng;

  constructor(seed: string) {
    this.rng = new Rng(`${seed}:bot`);
  }

  pick(s: GameState, afterSwap: boolean): Pick {
    const best = bestSend(s);
    if (best.regions === 0 && !afterSwap && s.deal.swapsLeft > 0) return { kind: 'swap', keep: best.pins };
    return sendPins(best.pins);
  }

  shop(s: GameState): GameState {
    return s;
  }
}

export class PreviewBot extends GreedyBot {
  override readonly name: BotName = 'preview';

  /** Buy the offer (and, with a full table, the seat to replace) whose card number is highest, while it beats today's. */
  override shop(s: GameState): GameState {
    for (;;) {
      const base = bestOnOpening(s, seatIds(s));
      let best: { after: bigint; slot: number; replace?: number } | null = null;
      const offers = s.shop!.offers;
      for (let slot = 0; slot < offers.length; slot++) {
        const id = offers[slot];
        if (!id) continue;
        const options: Array<{ after: bigint; replace?: number }> = [];
        if (s.seats.length < RULES.seats) {
          if (s.coins >= price(id)) options.push({ after: previewNumber(s, slot)!.after });
        } else {
          s.seats.forEach((old, j) => {
            if (s.coins + sellValue(old.id) >= price(id)) options.push({ after: previewNumber(s, slot, j)!.after, replace: j });
          });
        }
        for (const o of options) if (o.after > base && (!best || o.after > best.after)) best = { ...o, slot };
      }
      if (!best) return s;
      s = must(buy(s, best.slot, best.replace));
    }
  }
}
