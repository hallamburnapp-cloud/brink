import { beforeEach, describe, expect, it } from 'vitest';
import { fixture } from '../engine/fixture';
import { createRun } from '../engine/run';
import type { Content, RunState } from '../engine/types';
import { __resetStatsForTests, emptyStats, favouriteAdvisor, getStats, mostFatalDoctrine, recordOffer, recordRun } from './stats';
import { __setStorageForTests } from './storage';

const content: Content = fixture();

function ended(endingId: string, extra: Partial<RunState> = {}): RunState {
  const s = createRun(content, { seed: 'stats', seat: 'republic', mode: 'endless' });
  Object.assign(s, extra);
  s.ending = endingId;
  s.phase = 'ended';
  return s;
}

describe('stats', () => {
  beforeEach(() => {
    __setStorageForTests(null);
    __resetStatsForTests();
  });

  it('starts empty and tolerates corrupt storage', () => {
    expect(getStats()).toEqual(emptyStats());
    __setStorageForTests({ getItem: () => '{"runs":"three","endingsSeen":[1,2],"kinds":{"nuclear":2,"x":-1}}', setItem: () => {}, removeItem: () => {} });
    const s = getStats();
    expect(s.runs).toBe(0);
    expect(s.endingsSeen).toEqual({});
    expect(s.kinds).toEqual({ nuclear: 2 });
    expect(s.seats).toEqual({});
  });

  it('records a lost run', () => {
    const before = Date.now();
    const s = recordRun(ended('nuclear_war', { day: 9.5, act: 3, pieces: ['p_hawk', 'p_hotline'], stats: { rolls: 4, nearMisses: 2, timeouts: 3, falseAlarms: 1, trueWarnings: 0 } }), content, ['p_hawk', 'p_dove', 'p_hotline']);
    expect(s.runs).toBe(1);
    expect(s.bestDays).toBe(9);
    expect(s.totalDays).toBe(9);
    expect(s.endingsSeen).toEqual({ nuclear_war: 1 });
    expect(s.kinds).toEqual({ nuclear: 1 });
    expect(s.piecesPicked).toEqual({ p_hawk: 1, p_hotline: 1 });
    expect(s.lossesWithPiece).toEqual({ p_hawk: 1, p_hotline: 1 });
    expect(s.piecesOffered).toEqual({ p_hawk: 1, p_dove: 1, p_hotline: 1 });
    expect(s.seats).toEqual({ republic: 1 });
    expect(s.standdowns).toBe(0);
    expect(s.timeouts).toBe(3);
    expect(s.nearMisses).toBe(2);
    expect(s.falseAlarms).toBe(1);
    expect(s.lastPlayedAt).toBeGreaterThanOrEqual(before);
    // Persisted.
    expect(getStats()).toEqual(s);
  });

  it('accumulates across runs and counts stand-downs', () => {
    recordRun(ended('nuclear_war', { day: 4, pieces: ['p_hawk'] }), content);
    const s = recordRun(ended('standdown_quiet', { day: 15, seat: 'federation', pieces: ['p_dove', 'p_hotline'] }), content);
    expect(s.runs).toBe(2);
    expect(s.bestDays).toBe(15);
    expect(s.totalDays).toBe(19);
    expect(s.standdowns).toBe(1);
    expect(s.kinds).toEqual({ nuclear: 1, standdown: 1 });
    expect(s.seats).toEqual({ republic: 1, federation: 1 });
    // Only losses count towards lossesWithPiece.
    expect(s.lossesWithPiece).toEqual({ p_hawk: 1 });
    expect(s.piecesPicked).toEqual({ p_hawk: 1, p_dove: 1, p_hotline: 1 });
    expect(Object.keys(s.endingsSeen).sort()).toEqual(['nuclear_war', 'standdown_quiet']);
  });

  it('counts removed endings as losses and leaves starting pieces out of picks', () => {
    const c2: Content = { ...content, seats: { ...content.seats, republic: { ...content.seats.republic, starting_pieces: ['p_spin'] } } };
    const s = recordRun(ended('impeached', { pieces: ['p_spin', 'p_hawk'] }), c2);
    expect(s.kinds).toEqual({ removed: 1 });
    expect(s.piecesPicked).toEqual({ p_hawk: 1 });
    expect(s.lossesWithPiece).toEqual({ p_hawk: 1 });
  });

  it('records an ending unknown to content as special', () => {
    const s = recordRun(ended('mystery'), content);
    expect(s.endingsSeen).toEqual({ mystery: 1 });
    expect(s.kinds).toEqual({ special: 1 });
  });

  it('recordOffer accumulates offered pieces', () => {
    recordOffer(['p_hawk', 'p_dove']);
    const s = recordOffer(['p_hawk']);
    expect(s.piecesOffered).toEqual({ p_hawk: 2, p_dove: 1 });
    expect(getStats().piecesOffered).toEqual({ p_hawk: 2, p_dove: 1 });
  });

  it('favouriteAdvisor returns the most-picked advisor by display name', () => {
    expect(favouriteAdvisor(getStats(), content)).toBeNull();
    const s = emptyStats();
    s.piecesPicked = { p_hawk: 2, p_dove: 5, p_hotline: 9, p_odds: 7 };
    // p_hotline (doctrine) and p_odds (asset) are not advisors.
    expect(favouriteAdvisor(s, content)).toBe(content.pieces.p_dove.name);
    s.piecesPicked = { p_hotline: 9 };
    expect(favouriteAdvisor(s, content)).toBeNull();
  });

  it('mostFatalDoctrine normalises losses by picks with a minimum of 3 picks', () => {
    const s = emptyStats();
    s.piecesPicked = { p_hotline: 2, p_excl_a: 4, p_excl_b: 10, p_hawk: 10 };
    s.lossesWithPiece = { p_hotline: 2, p_excl_a: 3, p_excl_b: 5, p_hawk: 10 };
    // p_hotline: 2 picks (below minimum) though 100% fatal; p_excl_a: 3/4; p_excl_b: 5/10; p_hawk is an advisor.
    expect(mostFatalDoctrine(s, content)).toBe(content.pieces.p_excl_a.name);
    // Once it clears the minimum, a 3/3 record beats 3/4.
    s.piecesPicked.p_hotline = 3;
    s.lossesWithPiece.p_hotline = 3;
    expect(mostFatalDoctrine(s, content)).toBe(content.pieces.p_hotline.name);
    // No losses at all: nothing to report.
    expect(mostFatalDoctrine({ ...s, lossesWithPiece: {} }, content)).toBeNull();
    expect(mostFatalDoctrine(emptyStats(), content)).toBeNull();
  });

  it('reset clears everything', () => {
    recordRun(ended('nuclear_war'), content);
    __resetStatsForTests();
    expect(getStats()).toEqual(emptyStats());
  });
});
