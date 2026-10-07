/**
 * Daily mode: one shared crisis per UTC day. Everyone gets the same seed and
 * the same seat, and each player gets exactly one attempt.
 */
import { SEATS, type Content, type RunState, type Seat } from '../engine/types';
import { isDawn, nightClock, shiftClock, starsFor } from '../engine/night';
import { load, save } from './storage';

/** Daily #1. */
export const DAILY_EPOCH = '2026-09-28';

const KEY = 'brink.daily';
const DAY_MS = 86_400_000;
const EPOCH_MS = Date.UTC(2026, 8, 28);

export interface DailyRecord {
  dateKey: string;
  number: number;
  seed: string;
  seat: Seat;
  ending: string;
  kind: string;
  days: number;
  act: number;
  playedAt: number;
  shared?: boolean;
  /** The night's meter trail, for the strip on the home screen. */
  trail?: number[][];
  /** The clock at the end ("6:00" at dawn). */
  clock?: string;
  dawn?: boolean;
  cards?: number;
  /** The hotel: the review's stars, tonight's Booking, the ending's name and the line people quote. */
  stars?: number;
  booking?: string;
  name?: string;
  quote?: string;
  byline?: string;
}

type DailyStore = Record<string, DailyRecord>;

function utcMidnight(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function keyOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' in UTC. */
export function dailyDateKey(now: Date = new Date()): string {
  return keyOf(utcMidnight(now));
}

/** Days since the epoch + 1, so the epoch day is Daily #1. */
export function dailyNumber(now: Date = new Date()): number {
  return Math.floor((utcMidnight(now) - EPOCH_MS) / DAY_MS) + 1;
}

export function dailySeed(now: Date = new Date()): string {
  return `daily-${dailyDateKey(now)}`;
}

/** Rotates republic -> federation -> coalition by daily number. Daily is free: no unlock gate. */
export function dailySeat(now: Date = new Date()): Seat {
  const n = dailyNumber(now) - 1;
  return SEATS[((n % SEATS.length) + SEATS.length) % SEATS.length];
}

function loadStore(): DailyStore {
  const raw = load<unknown>(KEY, {});
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: DailyStore = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v && typeof v === 'object' && typeof (v as DailyRecord).dateKey === 'string') out[k] = v as DailyRecord;
  }
  return out;
}

export function getDailyRecord(dateKey: string = dailyDateKey()): DailyRecord | null {
  return loadStore()[dateKey] ?? null;
}

/** One attempt per day: refuses (returns false) if a record for `rec.dateKey` already exists. */
export function saveDailyRecord(rec: DailyRecord): boolean {
  const store = loadStore();
  if (store[rec.dateKey]) return false;
  store[rec.dateKey] = rec;
  return save(KEY, store);
}

/** Flag an existing record as shared (the share card was generated). */
export function markDailyShared(dateKey: string = dailyDateKey()): boolean {
  const store = loadStore();
  const rec = store[dateKey];
  if (!rec) return false;
  rec.shared = true;
  return save(KEY, store);
}

export function dailyPlayed(now: Date = new Date()): boolean {
  return getDailyRecord(dailyDateKey(now)) !== null;
}

/** Consecutive recorded days ending today or (if today is not yet played) yesterday. */
export function dailyStreak(now: Date = new Date()): number {
  const store = loadStore();
  let day = utcMidnight(now);
  if (!store[keyOf(day)]) day -= DAY_MS;
  let n = 0;
  while (store[keyOf(day)]) {
    n++;
    day -= DAY_MS;
  }
  return n;
}

/** Most recent first. */
export function dailyHistory(limit = 30): DailyRecord[] {
  return Object.values(loadStore())
    .sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0))
    .slice(0, Math.max(0, limit));
}

/** Milliseconds until the next UTC midnight. */
export function msUntilNextDaily(now: Date = new Date()): number {
  return utcMidnight(now) + DAY_MS - now.getTime();
}

/**
 * Build the record for a finished Daily run. The date is taken from the seed
 * (`daily-YYYY-MM-DD`) so a run that straddles midnight is filed under the day
 * it was issued for.
 */
export function dailyRecordFromRun(state: RunState, content: Content, now: Date = new Date()): DailyRecord {
  const m = /^daily-(\d{4}-\d{2}-\d{2})$/.exec(state.seed);
  const dateKey = m ? m[1] : dailyDateKey(now);
  const ending = state.ending ? content.endings[state.ending] : undefined;
  return {
    dateKey,
    number: dailyNumber(new Date(`${dateKey}T00:00:00Z`)),
    seed: state.seed,
    seat: state.seat,
    ending: state.ending ?? 'unknown',
    kind: ending?.kind ?? 'special',
    days: Math.max(0, Math.floor(state.day)),
    act: state.act,
    playedAt: now.getTime(),
    trail: state.trail.slice(-60),
    clock: content.voice === 'hotel' ? shiftClock(content, state) : nightClock(state, ending?.kind),
    dawn: isDawn(ending?.kind),
    cards: state.cardsPlayed,
    stars: content.voice === 'hotel' ? starsFor(state) : undefined,
    booking: state.booking,
    name: ending?.name,
    quote: ending?.quote,
    byline: ending?.byline,
  };
}
