/**
 * The phone time model, in seconds (reference timing.py; SPEC section 12). It is a model built on
 * the director's animation timings plus assumed human decision times, not a measurement.
 *
 * Send cascade: a fixed part, then per pin, per firing staff and per region pop, capped at 8 s (the
 * director speeds up long cascades). The outcome stamp and coins take 1.2 s, then the map recolours
 * one region at a time (0.8 s + 0.5 s a region, capped at 5 s).
 */
import type { TurnRow } from './play';

export interface TimeModel {
  intro: number;
  end: number;
  /** Ring drops and board flip; regions light up. */
  crisis: number;
  deal: number;
  /** Choosing: a fixed think plus per pin; a swap costs its own time. */
  think: number;
  perPin: number;
  swap: number;
  sendFixed: number;
  sendPin: number;
  sendStaff: number;
  sendPop: number;
  cascadeCap: number;
  outcome: number;
  mapFixed: number;
  mapRegion: number;
  mapCap: number;
  /** A shop visit; `shopBroke` when no offer is affordable (look, tap NEXT TURN). */
  shop: number;
  shopBroke: number;
  /** The coach's extra seconds by turn, and at the first shop. */
  coach: Readonly<Record<number, number>>;
  coachShop: number;
}

export const STANDARD: TimeModel = {
  intro: 0,
  end: 10,
  crisis: 1.3,
  deal: 1.2,
  think: 14.0,
  perPin: 2.5,
  swap: 7.0,
  sendFixed: 2.7,
  sendPin: 0.3,
  sendStaff: 0.25,
  sendPop: 0.15,
  cascadeCap: 8.0,
  outcome: 1.2,
  mapFixed: 0.8,
  mapRegion: 0.5,
  mapCap: 5.0,
  shop: 30.0,
  shopBroke: 8.0,
  coach: {},
  coachShop: 0,
};

/** A first game: the intro, plus the coach's scripted lines on turns 1-2 and at the first shop. */
export const FIRST: TimeModel = { ...STANDARD, intro: 25, coach: { 1: 15.0, 2: 6.0 }, coachShop: 15.0 };

/** A slow first-timer. */
export const SLOW: TimeModel = { ...FIRST, think: 20.0, perPin: 3.0, swap: 9.0, shop: 50.0, shopBroke: 12.0, intro: 40 };

/** A practised, fast player. */
export const FAST: TimeModel = { ...STANDARD, think: 8.0, perPin: 1.8, swap: 4.0, shop: 20.0, shopBroke: 5.0 };

/** Seconds for a game, from its turn log (summed in the reference's order, so the floats agree). */
export function seconds(log: readonly TurnRow[], m: TimeModel = STANDARD): number {
  let t = m.intro + m.end;
  let firstShop = true;
  for (const r of log) {
    t += m.crisis + m.deal + m.think + m.perPin * r.pins + m.swap * r.swaps;
    t += m.coach[r.turn] ?? 0;
    const cascade = m.sendFixed + m.sendPin * r.pins + m.sendStaff * r.firing + m.sendPop * r.pops;
    t += Math.min(m.cascadeCap, cascade) + m.outcome;
    t += Math.min(m.mapCap, m.mapFixed + m.mapRegion * r.recoloured);
    if (r.shopAffordable !== undefined) {
      t += r.shopAffordable ? m.shop : m.shopBroke;
      if (firstShop) {
        t += m.coachShop;
        firstShop = false;
      }
    }
  }
  return t;
}

export function minutes(log: readonly TurnRow[], m: TimeModel = STANDARD): number {
  return seconds(log, m) / 60;
}
