import { describe, expect, it } from 'vitest';
import type { Content } from '../engine/types';
import { FALL_STAMP, fallenBar, starsFor } from '../engine/night';
import { bookingOf, guestBook } from './guestbook';
import { hotelStrip, hotelStripCells, isHotel, shareText, type ShareCardData } from './share';
import type { Stats } from './stats';

/** A trail snapshot in METERS order: public, military, allies, economy, escalation. */
function snap(guests: number, staff: number, building: number, money: number): number[] {
  return [guests, staff, building, money, 0];
}

const base: ShareCardData = {
  brand: 'BRINK',
  url: 'https://brink.example',
  seatName: 'The Brink',
  seatAccent: '#c9a24a',
  days: 0,
  endingName: 'The Swan Is the Review',
  endingEmoji: '🦢',
  endingKind: 'survival',
  momentLabel: 'The moment the swan sat down',
  moment: null,
  trail: [],
  seed: 'daily-2026-10-07',
  mode: 'daily',
  dailyNumber: 10,
  stars: 4,
  bookingName: 'The Swan',
  quote: 'Lovely staff. The swan was very well handled, and so was I.',
  byline: 'Room 412',
  clock: '6:00',
  dawn: true,
};

describe('the hotel strip', () => {
  it('colours each cell by the lowest bar at that moment', () => {
    const trail = Array.from({ length: 19 }, (_, i) => snap(65, 65 - 2 * i, 65, 60));
    const row = hotelStrip(trail, 9);
    expect(row).toHaveLength(9);
    expect(row[0]).toBe('🟩');
    expect(row[8]).toBe('🟨'); // the staff bar ends at 29: low, not in danger
    expect(hotelStrip([snap(60, 60, 60, 20)], 1)).toEqual(['🟧']);
  });

  it('shows the fall as one red cell and leaves the hours after it blank', () => {
    const trail = [snap(60, 60, 60, 60), snap(40, 60, 60, 60), snap(20, 60, 60, 60), snap(0, 60, 60, 60)];
    const row = hotelStrip(trail, 9);
    expect(row.filter((c) => c === '🟥')).toHaveLength(1);
    const red = row.indexOf('🟥');
    expect(row.slice(red + 1).every((c) => c === '⬜')).toBe(true);
    expect(row.slice(0, red).every((c) => c !== '⬜' && c !== '🟥')).toBe(true);
  });

  it('always shows a fall, whatever the sampling', () => {
    const trail = Array.from({ length: 40 }, (_, i) => snap(i === 39 ? 0 : 60, 60, 60, 60));
    expect(hotelStrip(trail, 9).at(-1)).toBe('🟥');
    const early = Array.from({ length: 40 }, (_, i) => snap(i >= 3 ? 0 : 60, 60, 60, 60));
    const row = hotelStrip(early, 9);
    expect(row.filter((c) => c === '🟥')).toHaveLength(1);
  });

  it('is blank for no trail and gives colours for the DOM', () => {
    expect(hotelStrip([], 9)).toEqual(new Array(9).fill('⬜'));
    expect(hotelStripCells([snap(70, 70, 70, 70)], 3)).toEqual(['#5cbf6f', '#5cbf6f', '#5cbf6f']);
  });
});

describe('the hotel share text', () => {
  it('is the brand and number, the booking and the stars, one row, the quote and the link', () => {
    const text = shareText({ ...base, trail: Array.from({ length: 19 }, () => snap(70, 70, 70, 70)) });
    const lines = text.split('\n');
    expect(lines[0]).toBe('BRINK #10 · THE SWAN · ★★★★☆');
    expect(lines[1]).toMatch(/^🟩{9} 🌅$/u);
    expect(lines[2]).toBe('“Lovely staff. The swan was very well handled, and so was I.” — Room 412');
    expect(lines[3]).toBe('https://brink.example');
    expect(lines).toHaveLength(4);
    expect(text).not.toMatch(/Seed|\d+%/);
  });

  it('names the clock when the night fell, and drops the number for practice', () => {
    const text = shareText({ ...base, mode: 'night', dailyNumber: undefined, stars: 1, dawn: false, clock: '4:40', trail: [snap(60, 60, 60, 60), snap(0, 60, 60, 60)] });
    const lines = text.split('\n');
    expect(lines[0]).toBe('BRINK · THE SWAN · ★☆☆☆☆');
    expect(lines[1]).toMatch(/🟥⬜* 🌑 4:40$/u);
  });

  it('adds the streak line for tonight only', () => {
    expect(shareText({ ...base, streak: 3, trail: [snap(60, 60, 60, 60)] }).split('\n')[1]).toBe('3 nights in a row');
    expect(shareText({ ...base, mode: 'night', streak: 3, trail: [snap(60, 60, 60, 60)] }).split('\n')[1]).not.toBe('3 nights in a row');
  });

  it('is selected by the stars', () => {
    expect(isHotel({ stars: undefined })).toBe(false);
    expect(isHotel({ stars: 3 })).toBe(true);
    const crisis = shareText({ ...base, stars: undefined, bookingName: undefined, quote: undefined });
    expect(crisis.split('\n')[0]).toBe('BRINK #10 🌅 Dawn');
  });
});

describe('stars and falls', () => {
  const m = (guests: number, staff: number, building: number, money: number) => ({ meters: { public: guests, military: staff, allies: building, economy: money, escalation: 0 } });
  it('bands the mean of the four bars (BALANCE.md: a careful night ends near 27) and makes any empty bar one star', () => {
    expect(starsFor(m(40, 40, 36, 36))).toBe(5);
    expect(starsFor(m(34, 34, 30, 30))).toBe(4);
    expect(starsFor(m(26, 26, 24, 24))).toBe(3);
    expect(starsFor(m(20, 20, 18, 18))).toBe(2);
    expect(starsFor(m(10, 10, 10, 10))).toBe(1);
    expect(starsFor(m(100, 100, 100, 0))).toBe(1);
  });
  it('names the bar that emptied and the stamp for it', () => {
    expect(fallenBar(m(100, 100, 100, 0))).toBe('economy');
    expect(fallenBar(m(50, 50, 50, 50))).toBeNull();
    expect(FALL_STAMP.economy).toBe('CLOSED BY THE OWNER');
    expect(FALL_STAMP.public).toBe('WALKOUT');
  });
});

describe('the guest book', () => {
  const content = {
    endingOrder: ['review_a_three', 'review_a_five', 'fall_guests', 'fallback_survival', 'special_other'],
    endings: {
      review_a_five: { id: 'review_a_five', kind: 'survival', stars: 5, name: 'Five', conditions: { flags_all: ['booking:a'], stars: { min: 4 } } },
      review_a_three: { id: 'review_a_three', kind: 'survival', stars: 3, name: 'Three', conditions: { flags_all: ['booking:a'] } },
      fall_guests: { id: 'fall_guests', kind: 'removed', stars: 1, name: 'Walkout' },
      fallback_survival: { id: 'fallback_survival', kind: 'survival', name: 'Fallback' },
      special_other: { id: 'special_other', kind: 'special', name: 'Other' },
    },
    bookingOrder: ['a', 'b'],
    bookings: { a: { id: 'a', name: 'A' }, b: { id: 'b', name: 'B' } },
  } as unknown as Content;
  const stats = { endingsSeen: { review_a_three: 2 } } as unknown as Stats;

  it('groups reviews by Booking, best first, and keeps the falls apart', () => {
    const book = guestBook(content, stats);
    expect(book.total).toBe(3);
    expect(book.seen).toBe(1);
    expect(book.sections.map((s) => s.booking.id)).toEqual(['a', 'b']);
    expect(book.sections[0].pages.map((p) => p.id)).toEqual(['review_a_five', 'review_a_three']);
    expect(book.sections[0].seen).toBe(1);
    expect(book.sections[1].pages).toEqual([]);
    expect(book.falls.map((p) => p.id)).toEqual(['fall_guests']);
    expect(bookingOf(content.endings.review_a_five)).toBe('a');
    expect(bookingOf(content.endings.fall_guests)).toBeNull();
  });
});
