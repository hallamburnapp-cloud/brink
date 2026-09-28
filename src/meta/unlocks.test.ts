import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture } from '../engine/fixture';
import { createRun } from '../engine/run';
import type { Content, EndingDef, RunState } from '../engine/types';
import { emptyStats, type Stats } from './stats';
import { __setStorageForTests } from './storage';
import { UNLOCKS, __resetUnlocksForTests, chosenTags, evaluateUnlocks, isUnlocked, unlockDef, unlockProgress, unlockedForRun, unlockedIds, type UnlockCtx } from './unlocks';

const content: Content = fixture();

function run(extra: Partial<Parameters<typeof createRun>[1]> = {}): RunState {
  return createRun(content, { seed: 'unlock-test', seat: 'republic', mode: 'endless', ...extra });
}

/** Mark the run ended with `endingId` (must exist in the fixture) and build the ctx. */
function ctx(state: RunState, endingId: string | null = null, stats: Stats = emptyStats()): UnlockCtx {
  let ending: EndingDef | null = null;
  if (endingId) {
    ending = content.endings[endingId] ?? null;
    state.ending = endingId;
    state.phase = 'ended';
  }
  return { state, content, ending, stats };
}

const ALL_IDS = [
  'seat_federation',
  'seat_coalition',
  'defcon_4',
  'defcon_3',
  'defcon_2',
  'defcon_1',
  'arsenal',
  'false_alarm_survivor',
  'limited_striker',
  'late_hands',
  'cool_head',
  'low_survivor',
  'bankrupt',
  'no_backchannel_standdown',
  'five_endings',
  'unloved_peacemaker',
  'over_the_top',
  'the_switch',
  'two_standdowns',
  'smash_three',
  'broke_the_game',
];

describe('UNLOCKS table', () => {
  it('has the 21 unlocks with ids matching content', () => {
    expect(UNLOCKS.map((u) => u.id).sort()).toEqual([...ALL_IDS].sort());
    expect(new Set(UNLOCKS.map((u) => u.id)).size).toBe(21);
    for (const u of UNLOCKS) {
      expect(u.label.length).toBeGreaterThan(0);
      expect(u.hint.length).toBeGreaterThan(0);
    }
    expect(unlockDef('seat_federation')?.label).toBe('The Federation');
    expect(unlockDef('defcon_4')?.kind).toBe('difficulty');
    expect(unlockDef('arsenal')?.kind).toBe('piece');
    expect(unlockDef('nope')).toBeUndefined();
  });
});

describe('evaluateUnlocks', () => {
  beforeEach(() => {
    __setStorageForTests(null);
    __resetUnlocksForTests();
  });

  it('unlocks nothing for a run lost in act 1', () => {
    const s = run();
    s.meters.escalation = 100;
    expect(evaluateUnlocks(ctx(s, 'nuclear_war'))).toEqual(['the_switch']);
    expect(unlockedIds()).toEqual(['the_switch']);
  });

  it('seat_federation: reaching act 3', () => {
    const s = run();
    s.act = 3;
    const fresh = evaluateUnlocks(ctx(s, 'nuclear_war'));
    expect(fresh).toContain('seat_federation');
    expect(fresh).not.toContain('defcon_4');
    expect(fresh).not.toContain('seat_coalition');
  });

  it('seat_coalition: any stand-down or survival ending', () => {
    expect(evaluateUnlocks(ctx(run(), 'survival_cold'))).toContain('seat_coalition');
    __resetUnlocksForTests();
    expect(evaluateUnlocks(ctx(run(), 'standdown_quiet'))).toContain('seat_coalition');
    __resetUnlocksForTests();
    expect(evaluateUnlocks(ctx(run(), 'impeached'))).not.toContain('seat_coalition');
  });

  it('defcon ladder: act 4, stand-down, stand-down at <=3, stand-down at <=2', () => {
    const s4 = run();
    s4.act = 4;
    const a = evaluateUnlocks(ctx(s4, 'nuclear_war'));
    expect(a).toContain('defcon_4');
    expect(a).toContain('seat_federation');
    expect(a).not.toContain('defcon_3');
    __resetUnlocksForTests();

    const easy = run({ difficulty: 5 });
    const b = evaluateUnlocks(ctx(easy, 'standdown_quiet'));
    expect(b).toContain('defcon_3');
    expect(b).not.toContain('defcon_2');
    expect(b).not.toContain('defcon_1');
    __resetUnlocksForTests();

    const mid = run({ difficulty: 3 });
    const c = evaluateUnlocks(ctx(mid, 'standdown_quiet'));
    expect(c).toContain('defcon_3');
    expect(c).toContain('defcon_2');
    expect(c).not.toContain('defcon_1');
    __resetUnlocksForTests();

    const hard = run({ difficulty: 2 });
    const d = evaluateUnlocks(ctx(hard, 'standdown_quiet'));
    expect(d).toEqual(expect.arrayContaining(['defcon_3', 'defcon_2', 'defcon_1']));
    __resetUnlocksForTests();

    // Survival is not a stand-down.
    expect(evaluateUnlocks(ctx(run({ difficulty: 1 }), 'survival_cold'))).not.toContain('defcon_3');
  });

  it('arsenal: act 4 with a trail snapshot of military > 80', () => {
    const s = run();
    s.act = 4;
    s.trail = [
      [50, 60, 50, 50, 20],
      [50, 81, 50, 50, 25],
      [50, 70, 50, 50, 30],
    ];
    expect(evaluateUnlocks(ctx(s, 'nuclear_war'))).toContain('arsenal');
    __resetUnlocksForTests();
    s.trail[1][1] = 80;
    expect(evaluateUnlocks(ctx(s, 'nuclear_war'))).not.toContain('arsenal');
    __resetUnlocksForTests();
    s.trail[1][1] = 95;
    s.act = 3;
    expect(evaluateUnlocks(ctx(s, 'nuclear_war'))).not.toContain('arsenal');
  });

  it('false_alarm_survivor: saw an fp_intercept_fa card and did not end nuclear', () => {
    const s = run();
    s.seen.push('fp_intercept_fa_1');
    expect(evaluateUnlocks(ctx(s, 'impeached'))).toContain('false_alarm_survivor');
    __resetUnlocksForTests();
    expect(evaluateUnlocks(ctx(s, 'launch'))).not.toContain('false_alarm_survivor');
    __resetUnlocksForTests();
    const t = run();
    t.seen.push('fp_intercept_other');
    expect(evaluateUnlocks(ctx(t, 'impeached'))).not.toContain('false_alarm_survivor');
  });

  it('limited_striker: a limited_strike choice in an earlier act', () => {
    const c2: Content = { ...content, cards: { ...content.cards } };
    c2.cards.c_strike = {
      ...content.cards.c_basic,
      id: 'c_strike',
      timeout: 'left',
      left: { text: 'Limited strike', effects: { escalation: 10 }, tags: ['limited_strike', 'military'], base: 10 },
      right: { text: 'Hold', effects: {}, tags: [], base: 10 },
    };
    const s = run();
    s.history.push({ card: 'c_strike', side: 'left', act: 1, day: 2, applied: {}, leverage: 0 });
    s.act = 1;
    expect(evaluateUnlocks({ ...ctx(s, 'nuclear_war'), content: c2 })).not.toContain('limited_striker');
    s.act = 2;
    expect(evaluateUnlocks({ ...ctx(s, 'nuclear_war'), content: c2 })).toContain('limited_striker');
    __resetUnlocksForTests();
    // Timeout resolves to the card's timeout side.
    const t = run();
    t.history.push({ card: 'c_strike', side: 'timeout', act: 1, day: 2, applied: {}, leverage: 0 });
    t.act = 2;
    expect(chosenTags(c2, t.history[0])).toContain('limited_strike');
    expect(evaluateUnlocks({ ...ctx(t, 'nuclear_war'), content: c2 })).toContain('limited_striker');
    __resetUnlocksForTests();
    // The other side does not count; unknown cards are ignored.
    const u = run();
    u.history.push({ card: 'c_strike', side: 'right', act: 1, day: 2, applied: {}, leverage: 0 }, { card: 'missing', side: 'left', act: 1, day: 2, applied: {}, leverage: 0 });
    u.act = 2;
    expect(chosenTags(c2, u.history[1])).toEqual([]);
    expect(evaluateUnlocks({ ...ctx(u, 'nuclear_war'), content: c2 })).not.toContain('limited_striker');
  });

  it('late_hands: five timeouts and a safe ending', () => {
    const s = run();
    s.stats.timeouts = 5;
    expect(evaluateUnlocks(ctx(s, 'survival_cold'))).toContain('late_hands');
    __resetUnlocksForTests();
    s.stats.timeouts = 4;
    expect(evaluateUnlocks(ctx(s, 'survival_cold'))).not.toContain('late_hands');
    __resetUnlocksForTests();
    s.stats.timeouts = 9;
    expect(evaluateUnlocks(ctx(s, 'nuclear_war'))).not.toContain('late_hands');
  });

  it('cool_head: run ended in act 3+ with escalation never above 50', () => {
    const s = run();
    s.act = 3;
    s.trail = [
      [50, 50, 50, 50, 20],
      [50, 50, 50, 50, 50],
      [50, 50, 50, 50, 30],
    ];
    s.meters.escalation = 30;
    expect(evaluateUnlocks(ctx(s, 'impeached'))).toContain('cool_head');
    __resetUnlocksForTests();
    s.trail[1][4] = 51;
    expect(evaluateUnlocks(ctx(s, 'impeached'))).not.toContain('cool_head');
    __resetUnlocksForTests();
    s.trail[1][4] = 40;
    s.act = 2;
    expect(evaluateUnlocks(ctx(s, 'impeached'))).not.toContain('cool_head');
    __resetUnlocksForTests();
    // Not ended: no unlock even if the numbers fit.
    const live = run();
    live.act = 3;
    live.trail = [[50, 50, 50, 50, 20]];
    expect(evaluateUnlocks({ state: live, content, ending: null, stats: emptyStats() })).not.toContain('cool_head');
  });

  it('low_survivor: Launch on Warning held into act 3', () => {
    const s = run();
    s.pieces.push('launch_on_warning');
    s.act = 3;
    expect(evaluateUnlocks(ctx(s, 'nuclear_war'))).toContain('low_survivor');
    __resetUnlocksForTests();
    s.act = 2;
    expect(evaluateUnlocks(ctx(s, 'nuclear_war'))).not.toContain('low_survivor');
  });

  it('bankrupt: an ending triggered by economy hitting 0', () => {
    expect(evaluateUnlocks(ctx(run(), 'fallback_economy_0'))).toContain('bankrupt');
    __resetUnlocksForTests();
    expect(evaluateUnlocks(ctx(run(), 'fallback_economy_100'))).not.toContain('bankrupt');
    __resetUnlocksForTests();
    expect(evaluateUnlocks(ctx(run(), 'impeached'))).not.toContain('bankrupt');
  });

  it('no_backchannel_standdown: stand-down without back_channel', () => {
    const s = run();
    expect(evaluateUnlocks(ctx(s, 'standdown_quiet'))).toContain('no_backchannel_standdown');
    __resetUnlocksForTests();
    const t = run();
    t.pieces.push('back_channel');
    expect(evaluateUnlocks(ctx(t, 'standdown_quiet'))).not.toContain('no_backchannel_standdown');
    __resetUnlocksForTests();
    expect(evaluateUnlocks(ctx(run(), 'survival_cold'))).not.toContain('no_backchannel_standdown');
  });

  it('five_endings: five distinct endings in lifetime stats', () => {
    const four = emptyStats();
    four.endingsSeen = { a: 1, b: 1, c: 1, d: 1 };
    expect(evaluateUnlocks(ctx(run(), 'impeached', four))).not.toContain('five_endings');
    const five = emptyStats();
    five.endingsSeen = { a: 1, b: 1, c: 1, d: 1, e: 1 };
    expect(evaluateUnlocks(ctx(run(), 'impeached', five))).toContain('five_endings');
  });

  it('unloved_peacemaker: stand-down with public below 35', () => {
    const s = run();
    s.meters.public = 34;
    expect(evaluateUnlocks(ctx(s, 'standdown_quiet'))).toContain('unloved_peacemaker');
    __resetUnlocksForTests();
    s.meters.public = 35;
    expect(evaluateUnlocks(ctx(s, 'standdown_quiet'))).not.toContain('unloved_peacemaker');
    __resetUnlocksForTests();
    s.meters.public = 10;
    expect(evaluateUnlocks(ctx(s, 'survival_cold'))).not.toContain('unloved_peacemaker');
  });

  it('a perfect run unlocks everything at once', () => {
    const c2: Content = { ...content, cards: { ...content.cards } };
    c2.cards.c_strike = { ...content.cards.c_basic, id: 'c_strike', left: { text: 'S', effects: {}, tags: ['limited_strike'], base: 10 } };
    const s = run({ difficulty: 1 });
    s.act = 5;
    s.meters.public = 20;
    s.meters.escalation = 30;
    s.trail = [
      [50, 85, 50, 50, 40],
      [20, 60, 50, 50, 30],
    ];
    s.seen.push('fp_intercept_fa_x');
    s.history.push({ card: 'c_strike', side: 'left', act: 2, day: 5, applied: {}, leverage: 0 });
    s.stats.timeouts = 5;
    s.pieces.push('launch_on_warning');
    const stats = emptyStats();
    stats.endingsSeen = { a: 1, b: 1, c: 1, d: 1, e: 1 };
    const fresh = evaluateUnlocks({ ...ctx(s, 'standdown_quiet', stats), content: c2 });
    const expected = ALL_IDS.filter((id) => !['bankrupt', 'over_the_top', 'the_switch', 'two_standdowns', 'smash_three', 'broke_the_game'].includes(id));
    expect([...fresh].sort()).toEqual([...expected].sort());
    // bankrupt needs a loss to economy 0, which contradicts a stand-down.
    expect(unlockProgress()).toEqual({ total: 21, unlocked: 15 });
  });

  it('persists new unlocks and never reports them twice', () => {
    const s = run();
    s.act = 3;
    s.meters.escalation = 100;
    s.trail = [[50, 50, 50, 50, 100]];
    expect(evaluateUnlocks(ctx(s, 'nuclear_war'))).toEqual(['seat_federation', 'the_switch']);
    expect(isUnlocked('seat_federation')).toBe(true);
    expect(isUnlocked('seat_coalition')).toBe(false);
    expect(unlockedIds()).toEqual(['seat_federation', 'the_switch']);
    expect(unlockProgress()).toEqual({ total: 21, unlocked: 2 });
    expect(unlockedForRun()).toEqual(['seat_federation', 'the_switch']);
    // Same run again: nothing new.
    expect(evaluateUnlocks(ctx(s, 'nuclear_war'))).toEqual([]);
    // A later run adds to the list.
    const t = run();
    t.act = 4;
    const later = evaluateUnlocks(ctx(t, 'standdown_quiet'));
    expect([...later].sort()).toEqual(['cool_head', 'defcon_3', 'defcon_4', 'no_backchannel_standdown', 'seat_coalition']);
    expect(later).not.toContain('seat_federation');
    expect(unlockedIds()).toContain('seat_federation');
    expect(unlockedIds()).toContain('defcon_4');
    expect(unlockProgress().unlocked).toBe(7);
  });

  it('ignores junk in storage and unknown ids in progress', () => {
    __setStorageForTests({
      getItem: () => JSON.stringify(['seat_federation', 'seat_federation', 42, 'not_a_real_unlock']),
      setItem: () => {},
      removeItem: () => {},
    });
    expect(unlockedIds()).toEqual(['seat_federation', 'not_a_real_unlock']);
    expect(isUnlocked('seat_federation')).toBe(true);
    expect(unlockProgress()).toEqual({ total: 21, unlocked: 1 });
    __setStorageForTests({ getItem: () => '{"oops":true}', setItem: () => {}, removeItem: () => {} });
    expect(unlockedIds()).toEqual([]);
  });

  it('a throwing check never breaks evaluation', () => {
    const bad = { ...ctx(run(), 'nuclear_war') };
    // A ctx with no trail array would throw inside checks that iterate it.
    (bad.state as unknown as { trail: unknown }).trail = null;
    bad.state.act = 4;
    expect(() => evaluateUnlocks(bad)).not.toThrow();
    expect(evaluateUnlocks(bad)).toEqual([]);
    expect(unlockedIds()).toEqual(expect.arrayContaining(['seat_federation', 'defcon_4']));
  });

  it('reset clears persisted unlocks', () => {
    const s = run();
    s.act = 3;
    evaluateUnlocks(ctx(s, 'nuclear_war'));
    __resetUnlocksForTests();
    expect(unlockedIds()).toEqual([]);
    expect(isUnlocked('seat_federation')).toBe(false);
  });
});

describe('FEATURES.allUnlocked', () => {
  it('makes isUnlocked true for everything but leaves earned progress alone', async () => {
    vi.resetModules();
    vi.doMock('../config', () => ({ FEATURES: { allUnlocked: true } }));
    try {
      const storage = await import('./storage');
      const mod = await import('./unlocks');
      storage.__setStorageForTests(null);
      expect(mod.isUnlocked('seat_coalition')).toBe(true);
      expect(mod.isUnlocked('defcon_1')).toBe(true);
      expect(mod.unlockedIds()).toEqual([]);
      expect(mod.unlockedForRun()).toBe('all');
      expect(mod.unlockProgress()).toEqual({ total: 21, unlocked: 0 });
    } finally {
      vi.doUnmock('../config');
      vi.resetModules();
    }
  });
});
