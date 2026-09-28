import { beforeEach, describe, expect, it } from 'vitest';
import { fixture } from '../engine/fixture';
import { createRun } from '../engine/run';
import {
  DAILY_EPOCH,
  dailyDateKey,
  dailyHistory,
  dailyNumber,
  dailyPlayed,
  dailyRecordFromRun,
  dailySeat,
  dailySeed,
  dailyStreak,
  getDailyRecord,
  markDailyShared,
  msUntilNextDaily,
  saveDailyRecord,
  type DailyRecord,
} from './daily';
import { __setStorageForTests } from './storage';

const at = (iso: string) => new Date(iso);
const DAY = 86_400_000;

function rec(dateKey: string, extra: Partial<DailyRecord> = {}): DailyRecord {
  const d = at(`${dateKey}T12:00:00Z`);
  return { dateKey, number: dailyNumber(d), seed: dailySeed(d), seat: dailySeat(d), ending: 'standdown_quiet', kind: 'standdown', days: 14, act: 5, playedAt: d.getTime(), ...extra };
}

describe('daily determinism', () => {
  it('epoch day is Daily #1 with a fixed seed and seat', () => {
    const d = at(`${DAILY_EPOCH}T00:00:00Z`);
    expect(dailyDateKey(d)).toBe('2026-09-28');
    expect(dailyNumber(d)).toBe(1);
    expect(dailySeed(d)).toBe('daily-2026-09-28');
    expect(dailySeat(d)).toBe('republic');
  });
  it('gives the same seed and seat at any time of the same UTC day', () => {
    const a = at('2026-10-05T00:00:01Z');
    const b = at('2026-10-05T23:59:59Z');
    expect(dailySeed(a)).toBe(dailySeed(b));
    expect(dailySeat(a)).toBe(dailySeat(b));
    expect(dailyNumber(a)).toBe(dailyNumber(b));
  });
  it('uses UTC, not local time, for the date key', () => {
    // 23:30 in UTC-5 is 04:30 the next day in UTC.
    expect(dailyDateKey(at('2026-09-28T23:30:00-05:00'))).toBe('2026-09-29');
    expect(dailyDateKey(at('2026-09-29T01:00:00+03:00'))).toBe('2026-09-28');
  });
  it('rotates seats republic -> federation -> coalition on consecutive days', () => {
    expect(dailySeat(at('2026-09-28T12:00:00Z'))).toBe('republic');
    expect(dailySeat(at('2026-09-29T12:00:00Z'))).toBe('federation');
    expect(dailySeat(at('2026-09-30T12:00:00Z'))).toBe('coalition');
    expect(dailySeat(at('2026-10-01T12:00:00Z'))).toBe('republic');
    expect(dailySeat(at('2026-10-02T12:00:00Z'))).toBe('federation');
  });
  it('numbers days correctly across month and year boundaries', () => {
    expect(dailyNumber(at('2026-09-30T12:00:00Z'))).toBe(3);
    expect(dailyNumber(at('2026-10-01T12:00:00Z'))).toBe(4);
    expect(dailyNumber(at('2026-10-31T23:59:59Z'))).toBe(34);
    expect(dailyNumber(at('2026-11-01T00:00:00Z'))).toBe(35);
    expect(dailyNumber(at('2026-12-31T12:00:00Z'))).toBe(95);
    expect(dailyNumber(at('2027-01-01T12:00:00Z'))).toBe(96);
    // Every day is exactly one more than the day before, for a year.
    let t = Date.UTC(2026, 8, 28);
    for (let i = 0; i < 400; i++, t += DAY) expect(dailyNumber(new Date(t + DAY))).toBe(dailyNumber(new Date(t)) + 1);
  });
  it('does not blow up before the epoch and still rotates seats', () => {
    expect(dailyNumber(at('2026-09-27T12:00:00Z'))).toBe(0);
    expect(dailySeat(at('2026-09-27T12:00:00Z'))).toBe('coalition');
  });
  it('counts down to the next UTC midnight', () => {
    expect(msUntilNextDaily(at('2026-09-28T23:00:00Z'))).toBe(3_600_000);
    expect(msUntilNextDaily(at('2026-09-28T00:00:00Z'))).toBe(DAY);
    expect(msUntilNextDaily(at('2026-09-28T23:59:59.500Z'))).toBe(500);
  });
});

describe('daily records', () => {
  beforeEach(() => __setStorageForTests(null));

  it('stores one record per day and refuses a second attempt', () => {
    const now = at('2026-10-03T10:00:00Z');
    expect(dailyPlayed(now)).toBe(false);
    expect(getDailyRecord('2026-10-03')).toBeNull();
    expect(saveDailyRecord(rec('2026-10-03'))).toBe(true);
    expect(dailyPlayed(now)).toBe(true);
    expect(saveDailyRecord(rec('2026-10-03', { ending: 'nuclear_war', kind: 'nuclear' }))).toBe(false);
    expect(getDailyRecord('2026-10-03')?.ending).toBe('standdown_quiet');
    // A different day is fine.
    expect(saveDailyRecord(rec('2026-10-04'))).toBe(true);
  });
  it('marks a record as shared', () => {
    expect(markDailyShared('2026-10-03')).toBe(false);
    saveDailyRecord(rec('2026-10-03'));
    expect(markDailyShared('2026-10-03')).toBe(true);
    expect(getDailyRecord('2026-10-03')?.shared).toBe(true);
  });
  it('lists history most recent first with a limit', () => {
    saveDailyRecord(rec('2026-10-01'));
    saveDailyRecord(rec('2026-10-03'));
    saveDailyRecord(rec('2026-10-02'));
    expect(dailyHistory().map((r) => r.dateKey)).toEqual(['2026-10-03', '2026-10-02', '2026-10-01']);
    expect(dailyHistory(2).map((r) => r.dateKey)).toEqual(['2026-10-03', '2026-10-02']);
  });
  it('builds a record from a run, filing it under the seed day', () => {
    const content = fixture();
    const issued = at('2026-10-05T12:00:00Z');
    const state = createRun(content, { seed: dailySeed(issued), seat: dailySeat(issued), mode: 'daily' });
    state.ending = 'nuclear_war';
    state.phase = 'ended';
    state.act = 3;
    state.day = 9.5;
    // Finished just after midnight the next day.
    const r = dailyRecordFromRun(state, content, at('2026-10-06T00:05:00Z'));
    expect(r.dateKey).toBe('2026-10-05');
    expect(r.number).toBe(dailyNumber(issued));
    expect(r.seat).toBe(dailySeat(issued));
    expect(r.kind).toBe('nuclear');
    expect(r.days).toBe(9);
    expect(r.act).toBe(3);
    expect(saveDailyRecord(r)).toBe(true);
    expect(dailyPlayed(issued)).toBe(true);
  });
});

describe('dailyStreak', () => {
  beforeEach(() => __setStorageForTests(null));
  const today = at('2026-10-10T15:00:00Z');

  it('is zero with no records', () => {
    expect(dailyStreak(today)).toBe(0);
  });
  it('counts consecutive days ending today', () => {
    saveDailyRecord(rec('2026-10-08'));
    saveDailyRecord(rec('2026-10-09'));
    saveDailyRecord(rec('2026-10-10'));
    expect(dailyStreak(today)).toBe(3);
  });
  it('keeps the streak alive if today is not yet played', () => {
    saveDailyRecord(rec('2026-10-08'));
    saveDailyRecord(rec('2026-10-09'));
    expect(dailyStreak(today)).toBe(2);
  });
  it('resets on a gap', () => {
    saveDailyRecord(rec('2026-10-05'));
    saveDailyRecord(rec('2026-10-06'));
    saveDailyRecord(rec('2026-10-07'));
    // 08 missing
    saveDailyRecord(rec('2026-10-09'));
    saveDailyRecord(rec('2026-10-10'));
    expect(dailyStreak(today)).toBe(2);
    expect(dailyStreak(at('2026-10-08T12:00:00Z'))).toBe(3);
  });
  it('is zero when the last record is two or more days old', () => {
    saveDailyRecord(rec('2026-10-08'));
    expect(dailyStreak(today)).toBe(0);
  });
  it('spans a month boundary', () => {
    saveDailyRecord(rec('2026-09-30'));
    saveDailyRecord(rec('2026-10-01'));
    expect(dailyStreak(at('2026-10-01T20:00:00Z'))).toBe(2);
  });
});
