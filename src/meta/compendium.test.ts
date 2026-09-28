import { beforeEach, describe, expect, it } from 'vitest';
import { fixture } from '../engine/fixture';
import { createRun } from '../engine/run';
import type { Content } from '../engine/types';
import { KIND_ORDER, compendium, markSeen } from './compendium';
import { __resetStatsForTests, emptyStats, getStats, recordRun } from './stats';
import { __setStorageForTests } from './storage';

const content: Content = fixture();
const AUTHORED = ['impeached', 'impeached_hawk', 'nuclear_war', 'resigned', 'launch', 'standdown_quiet', 'survival_cold'];

describe('compendium', () => {
  beforeEach(() => {
    __setStorageForTests(null);
    __resetStatsForTests();
  });

  it('lists every authored ending, excluding fallbacks, none seen at first', () => {
    const c = compendium(content);
    expect(c.total).toBe(AUTHORED.length);
    expect(c.seen).toBe(0);
    expect(c.percent).toBe(0);
    expect(c.entries.map((e) => e.id).sort()).toEqual([...AUTHORED].sort());
    expect(c.entries.some((e) => e.id.startsWith('fallback_'))).toBe(false);
    for (const e of c.entries) {
      expect(e.ending).toBe(content.endings[e.id]);
      expect(e.seen).toBe(0);
    }
  });

  it('sorts by kind order then name', () => {
    const c = compendium(content);
    const ranks = c.entries.map((e) => KIND_ORDER.indexOf(e.ending.kind));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(c.entries.map((e) => e.id)).toEqual(['launch', 'nuclear_war', 'impeached', 'impeached_hawk', 'standdown_quiet', 'survival_cold', 'resigned']);
  });

  it('reflects endings recorded from runs', () => {
    const s = createRun(content, { seed: 'c', seat: 'republic', mode: 'endless' });
    s.ending = 'nuclear_war';
    s.phase = 'ended';
    recordRun(s, content);
    recordRun(s, content);
    const c = compendium(content);
    expect(c.seen).toBe(1);
    expect(c.percent).toBe(Math.round((1 / AUTHORED.length) * 100));
    expect(c.entries.find((e) => e.id === 'nuclear_war')?.seen).toBe(2);
    expect(c.entries.find((e) => e.id === 'impeached')?.seen).toBe(0);
  });

  it('markSeen increments a single ending and persists', () => {
    markSeen('resigned');
    const s = markSeen('resigned');
    expect(s.endingsSeen).toEqual({ resigned: 2 });
    expect(getStats().endingsSeen).toEqual({ resigned: 2 });
    expect(compendium(content).entries.find((e) => e.id === 'resigned')?.seen).toBe(2);
    expect(compendium(content).seen).toBe(1);
  });

  it('accepts explicit stats and ignores fallback / unknown ids in them', () => {
    const stats = emptyStats();
    stats.endingsSeen = { fallback_nuclear: 3, nope: 1, launch: 1, survival_cold: 4 };
    const c = compendium(content, stats);
    expect(c.seen).toBe(2);
    expect(c.total).toBe(AUTHORED.length);
    expect(c.percent).toBe(29);
  });

  it('is empty-safe', () => {
    const c = compendium({ ...content, endingOrder: [], endings: {} });
    expect(c).toEqual({ total: 0, seen: 0, percent: 0, entries: [] });
  });
});
