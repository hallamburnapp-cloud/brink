/**
 * The Guest Book: every review the hotel can be given, by Booking, with how often each has
 * been written; the nights that ended early kept apart; the engine's fallbacks left out.
 */
import type { BookingDef, Content, EndingDef } from '../engine/types';
import { getStats, type Stats } from './stats';

export interface GuestBookPage {
  id: string;
  ending: EndingDef;
  seen: number;
}

export interface GuestBookSection {
  booking: BookingDef;
  pages: GuestBookPage[];
  seen: number;
}

export interface GuestBook {
  sections: GuestBookSection[];
  /** Endings for a bar on the floor: one star, stamped. */
  falls: GuestBookPage[];
  total: number;
  seen: number;
}

/** The Booking a review belongs to, from its `booking:` flag; null for the falls. */
export function bookingOf(e: EndingDef): string | null {
  const flags = [...(e.conditions?.flags_all ?? []), ...(e.conditions?.flags_any ?? [])];
  for (const f of flags) if (f.startsWith('booking:')) return f.slice('booking:'.length);
  return null;
}

export function guestBook(content: Content, stats: Stats = getStats()): GuestBook {
  const byBooking = new Map<string, GuestBookPage[]>();
  const falls: GuestBookPage[] = [];
  let total = 0;
  let seen = 0;
  for (const id of content.endingOrder) {
    if (id.startsWith('fallback_')) continue;
    const ending = content.endings[id];
    if (!ending) continue;
    const page: GuestBookPage = { id, ending, seen: stats.endingsSeen[id] ?? 0 };
    const b = bookingOf(ending);
    if (b) {
      if (!byBooking.has(b)) byBooking.set(b, []);
      byBooking.get(b)!.push(page);
    } else if (ending.kind === 'removed') {
      falls.push(page);
    } else {
      continue;
    }
    total++;
    if (page.seen > 0) seen++;
  }
  const sections: GuestBookSection[] = content.bookingOrder
    .filter((b) => !!content.bookings[b])
    .map((b) => {
      const pages = (byBooking.get(b) ?? []).sort((x, y) => (y.ending.stars ?? 0) - (x.ending.stars ?? 0) || x.ending.name.localeCompare(y.ending.name));
      return { booking: content.bookings[b], pages, seen: pages.filter((p) => p.seen > 0).length };
    });
  return { sections, falls, total, seen };
}
