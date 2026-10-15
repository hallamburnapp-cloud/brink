import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng';
import { STAFF_IDS, type StaffId } from '../content/staff';
import { IDS, INDEX, idsMask } from './board';
import { groupMasks, groups, legal, pinnable } from './groups';
import { Scorer, effective, featuresOf, goldCount, maskFeatures, scorePins } from './score';
import type { Owner } from './types';

const OWNERS: Owner[] = ['grey', 'gold', 'red'];

function randomCase(rng: Rng) {
  const owner = Object.fromEntries(IDS.map((r) => [r, rng.pick(OWNERS)]));
  const seats = rng.shuffle([...STAFF_IDS]).slice(0, rng.int(6));
  const pins = rng.shuffle([...IDS]).slice(0, 1 + rng.int(5));
  return { owner, seats, pins, crisis: rng.pick(IDS), old: 10 + rng.int(51) };
}

describe('the fast scorer', () => {
  it('equals the traced scorer on 3,000 random positions (the reference selftest)', () => {
    const rng = new Rng('selftest');
    for (let i = 0; i < 3000; i++) {
      const c = randomCase(rng);
      const exact = scorePins(c.pins, c.seats, c.owner, c.crisis, c.old).score;
      const fast = new Scorer(c.seats, goldCount(c.owner), c.old).score(featuresOf(c.pins, c.owner, c.crisis));
      expect(fast, `${c.pins.join(' ')} / ${c.seats.join(' ')}`).toBe(exact);
    }
  });

  it('falls back to exact BigInt arithmetic past the safe-integer range', () => {
    const old = 1_000_000_000_000;
    const scorer = new Scorer(['OLDHAND', 'SOVEREIGN', 'HARBOUR', 'GOVERNOR', 'STRATEGIST'], 30, old);
    const f = { points: 50, pins: 5, capitals: 5, ports: 5, gold: 5, crisis: true };
    let m10 = (50n * BigInt(old)) / 10n;
    for (let i = 0; i < 5; i++) m10 *= 2n;
    for (let i = 0; i < 10; i++) m10 = (m10 * 15n) / 10n;
    m10 *= 3n;
    m10 *= 2n;
    const expected = (50n * m10) / 10n;
    expect(expected > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(scorer.score(f)).toBe(expected);
  });

  it('reads features from region masks the same as from lists', () => {
    const rng = new Rng('masks');
    for (let i = 0; i < 200; i++) {
      const c = randomCase(rng);
      const goldMask = idsMask(IDS.filter((r) => c.owner[r] === 'gold'));
      expect(maskFeatures(idsMask(c.pins), goldMask, 1 << INDEX[c.crisis])).toEqual(featuresOf(c.pins, c.owner, c.crisis));
    }
  });
});

describe('the Deputy and the Herald', () => {
  it('a Deputy fires as the staff to its right, nothing at the far right', () => {
    expect(effective(['DEPUTY', 'DUTY'])).toEqual(['DUTY', 'DUTY']);
    expect(effective(['DUTY', 'DEPUTY'])).toEqual(['DUTY', null]);
    expect(effective(['DEPUTY', 'HERALD'])).toEqual(['HERALD', 'HERALD']);
  });

  it('a Deputy copying the Herald does nothing; the Herald never fires', () => {
    const owner = Object.fromEntries(IDS.map((r) => [r, 'grey' as Owner]));
    const res = scorePins(['LNK', 'TRN'], ['DEPUTY', 'HERALD'] as StaffId[], owner, 'SHL', 10, { trace: true });
    expect(res.trace!.map((e) => e.kind)).toEqual(['pin', 'pin', 'slam']);
  });

  it('a Deputy copying the Old Hand multiplies by the same value', () => {
    const owner = Object.fromEntries(IDS.map((r) => [r, 'grey' as Owner]));
    const res = scorePins(['LNK'], ['DEPUTY', 'OLDHAND'] as StaffId[], owner, 'SHL', 14, { trace: true });
    expect(res.m10).toBe(19n); // 10 x 1.4 = 14, x 1.4 = 19.6 floored
    expect(res.trace!.filter((e) => e.kind === 'staff').map((e) => [e.seat, e.label, e.viaDeputy])).toEqual([
      [0, '×1.4', true],
      [1, '×1.4', false],
    ]);
  });

  it('the Surveyor counts gold held; the Strategist needs 4 or 5 pins (the crisis counts)', () => {
    const owner = Object.fromEntries(IDS.map((r, i) => [r, (i < 7 ? 'gold' : 'grey') as Owner]));
    expect(scorePins(['LNK'], ['SURVEYOR'], owner, 'SHL').m10).toBe(30n);
    const four = ['SHL', 'LNK', 'PBB', 'TRN'];
    expect(scorePins(four, ['STRATEGIST'], owner, 'SHL').m10).toBe(240n);
    expect(scorePins(four.slice(0, 3), ['STRATEGIST'], owner, 'SHL').m10).toBe(60n);
  });
});

describe('legal groups', () => {
  it('groups() lists exactly the legal pin sets (the reference selftest)', () => {
    const rng = new Rng('groups');
    for (let n = 0; n < 60; n++) {
      const crisis = rng.pick(IDS);
      const lit = rng.shuffle(IDS.filter((r) => r !== crisis)).slice(0, 10);
      const all = new Set(groups(lit, crisis).map((g) => g.join(' ')));
      expect(all.size).toBe(groupMasks(lit, crisis).length);
      const pool = [...pinnable(lit, crisis)].sort();
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const pair = [pool[i], pool[j]];
          expect(all.has(pair.join(' '))).toBe(legal(pair, lit, crisis));
          for (let k = j + 1; k < pool.length; k++) {
            const triple = [pool[i], pool[j], pool[k]];
            expect(all.has(triple.join(' '))).toBe(legal(triple, lit, crisis));
          }
        }
      }
    }
  });

  it('counts sea lanes as touching: Lintel–Shoal and Morrow Downs–Tern Isle', () => {
    expect(legal(['LTL', 'SHL'], ['LTL'], 'SHL')).toBe(true);
    expect(legal(['MRD', 'TRN'], ['MRD'], 'TRN')).toBe(true);
    expect(legal(['MRM', 'LTL'], ['MRM'], 'LTL')).toBe(false);
  });
});
