/**
 * The look-ahead shoppers of the reference (bots.py SensibleBot, BreakerBot).
 *
 * sensible  greedy play; shops by looking ahead: buys what most raises its mean log best-score on 10
 *           sample deals two turns ahead, per coin; sells to upgrade; rerolls up to twice; seats
 *           adders before multipliers and tries every Deputy seat.
 * breaker   sensible, but buys the Crown pieces (Herald, Sovereign, Deputy, Harbourmaster) on sight.
 */
import {
  buy,
  countOwner,
  crisisPool,
  dealFeatures,
  dealPool,
  must,
  price,
  reroll,
  RULES,
  Scorer,
  sellValue,
  target,
  type Features,
  type GameState,
  type StaffId,
} from '../engine';
import { GreedyBot, type BotName } from './bots';
import { arrangeSeats, seatIds } from './drive';

/** How a sensible player seats staff: flat adders first, then multipliers (weakest first). */
const RANK: Readonly<Record<Exclude<StaffId, 'DEPUTY'>, number>> = {
  QM: 0,
  DUTY: 1,
  SURVEYOR: 2,
  OLDHAND: 3,
  STRATEGIST: 4,
  GOVERNOR: 5,
  HARBOUR: 6,
  SOVEREIGN: 7,
  HERALD: 8,
};

/** The line-ups a sensible player would try for these staff: ranked, with the Deputy in every seat but the last. */
export function seatings(staff: readonly StaffId[]): StaffId[][] {
  const core = staff.filter((s): s is Exclude<StaffId, 'DEPUTY'> => s !== 'DEPUTY').sort((a, b) => RANK[a] - RANK[b]);
  if (!staff.includes('DEPUTY')) return [core];
  if (core.length === 0) return [['DEPUTY']];
  return core.map((_, i) => [...core.slice(0, i), 'DEPUTY', ...core.slice(i)]);
}

/** The Old Hand's value a planner assumes when it is not seated yet: x1.0 grown for 3 turns. */
const OLD_HAND_GUESS_M10 = RULES.oldHandStartM10 + 3 * RULES.oldHandStepM10;

export class SensibleBot extends GreedyBot {
  override readonly name: BotName = 'sensible';
  protected readonly samples = 10;
  protected readonly maxRerolls = 2;
  /** Gold held when the sample deals were drawn (the Surveyor's count in the look-ahead). */
  private held = 0;

  /** Feature sets of sample deals two turns ahead: crises on today's frontier, today's map. */
  protected sampleDeals(s: GameState): Features[][] {
    const { pool } = crisisPool(s.owner);
    const deals: Features[][] = [];
    for (let i = 0; i < this.samples; i++) {
      const crisis = this.rng.pick(pool);
      const lit = this.rng.shuffle(dealPool(s.owner, crisis)).slice(0, RULES.lit);
      deals.push(dealFeatures(lit, crisis, s.owner));
    }
    this.held = countOwner(s.owner, 'gold');
    return deals;
  }

  /** The mean log of (best score ÷ the target two turns ahead) over the sample deals, for the best seating of `staff`. */
  protected value(s: GameState, staff: readonly StaffId[], deals: readonly Features[][]): { value: number; seats: StaffId[] } {
    const T = Number(target(s.turn + 2));
    const old = s.seats.some((x) => x.id === 'OLDHAND') ? s.oldHandM10 : OLD_HAND_GUESS_M10;
    let best: { value: number; seats: StaffId[] } | null = null;
    for (const seats of seatings(staff)) {
      const scorer = new Scorer(seats, this.held, old);
      let sum = 0;
      for (const fs of deals) {
        let top = 0n;
        for (const f of fs) {
          const v = scorer.score(f);
          if (v > top) top = v;
        }
        sum += Math.log(Math.max(1, Number(top)) / T);
      }
      const value = sum / deals.length;
      if (!best || value > best.value) best = { value, seats };
    }
    return best!;
  }

  protected reseat(s: GameState, deals: readonly Features[][]): GameState {
    return arrangeSeats(s, this.value(s, seatIds(s), deals).seats);
  }

  override shop(s: GameState): GameState {
    const deals = this.sampleDeals(s);
    let rerolls = 0;
    for (;;) {
      for (;;) {
        const base = this.value(s, seatIds(s), deals).value;
        let best: { perCoin: number; slot: number; replace?: number } | null = null;
        const offers = s.shop!.offers;
        for (let slot = 0; slot < offers.length; slot++) {
          const id = offers[slot];
          if (!id) continue;
          const cost = price(id);
          if (s.seats.length < RULES.seats) {
            if (s.coins < cost) continue;
            const gain = this.value(s, [...seatIds(s), id], deals).value - base;
            if (gain > 0.05 && (!best || gain / cost > best.perCoin)) best = { perCoin: gain / cost, slot };
          } else {
            const seats = seatIds(s);
            for (let j = 0; j < seats.length; j++) {
              if (s.coins + sellValue(seats[j]) < cost) continue;
              const gain = this.value(s, [...seats.slice(0, j), ...seats.slice(j + 1), id], deals).value - base;
              if (gain > 0.15 && (!best || gain / cost > best.perCoin)) best = { perCoin: gain / cost, slot, replace: j };
            }
          }
        }
        if (!best) break;
        s = this.reseat(must(buy(s, best.slot, best.replace)), deals);
      }
      if (rerolls < this.maxRerolls && s.coins >= s.shop!.rerollCost + 5) {
        s = must(reroll(s));
        rerolls++;
        continue;
      }
      break;
    }
    return this.reseat(s, deals);
  }
}

/** The pieces of the Crown (SPEC Example 3). */
const CROWN_PIECES: readonly StaffId[] = ['HERALD', 'SOVEREIGN', 'DEPUTY', 'HARBOUR'];

export class BreakerBot extends SensibleBot {
  override readonly name: BotName = 'breaker';

  override shop(s: GameState): GameState {
    for (let round = 0; round < 3; round++) {
      for (let slot = 0; slot < RULES.offers; slot++) {
        // Read the live offers: a purchase empties its slot.
        const id = s.shop!.offers[slot];
        if (!id || !CROWN_PIECES.includes(id)) continue;
        if (s.seats.length >= RULES.seats) {
          // Make room by selling the cheapest staff that is not a Crown piece.
          let sellSeat = -1;
          s.seats.forEach((x, j) => {
            if (CROWN_PIECES.includes(x.id)) return;
            if (sellSeat < 0 || price(x.id) < price(s.seats[sellSeat].id)) sellSeat = j;
          });
          if (sellSeat < 0) continue;
          if (s.coins + sellValue(s.seats[sellSeat].id) >= price(id)) s = must(buy(s, slot, sellSeat));
        } else if (s.coins >= price(id)) {
          s = must(buy(s, slot));
        }
      }
      const pieces = s.seats.filter((x) => CROWN_PIECES.includes(x.id)).length;
      if (pieces < 4 && s.coins >= s.shop!.rerollCost + 6) {
        s = must(reroll(s));
        continue;
      }
      break;
    }
    return super.shop(s);
  }
}
