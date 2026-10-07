/**
 * Small helpers for the hotel's screens: a byline as words, tomorrow's Booking, the countdown.
 */
import type { BookingDef, Content, Seat } from '../engine/types';
import { bookingForSeed } from '../engine/run';
import { dailySeed, msUntilNextDaily } from '../meta/daily';

/** "Room 412" for a byline stored as a speaker id; anything else passes through. */
export function bylineText(c: Content, id: string | undefined | null): string | undefined {
  if (!id) return undefined;
  return c.speakers[id]?.role ?? id;
}

/** Tomorrow's Booking, from tomorrow's seed: the same for everyone, so Home can promise it. */
export function tomorrowBooking(c: Content, seat: Seat, now: Date = new Date()): BookingDef | null {
  const tomorrow = new Date(now.getTime() + msUntilNextDaily(now) + 60_000);
  return bookingForSeed(c, dailySeed(tomorrow), seat, 5);
}

/** "7h 12m" until the next night. */
export function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
