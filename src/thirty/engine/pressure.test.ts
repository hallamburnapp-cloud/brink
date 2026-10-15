import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng.ts';
import { pressure } from './pressure.ts';
import { RULES, flareAt, tensePressureAt } from './rules.ts';
import { isHome } from './world.ts';
import { fixture, quiet, withHeats, withTeam } from './testkit.ts';
import type { GameState } from './types.ts';
import { Working } from './working.ts';

const content = fixture();

function night(s: GameState, seed = 'p'): Working {
  const w = new Working(s);
  pressure(w, new Rng(seed));
  return w;
}

/** Run the night under many seeds and collect the heat changes. */
function nights(s: GameState, n = 200) {
  const out: Array<ReturnType<Working['changes']>> = [];
  for (let i = 0; i < n; i++) out.push(night(s, `n-${i}`).changes());
  return out;
}

describe('pressure (SPEC: each WAR region heats one CALM or TENSE neighbour; each CRISIS one in three)', () => {
  it('a WAR region heats exactly one neighbour at CALM or TENSE, never one at CRISIS or WAR', () => {
    // SHL at war; neighbours PBB (0), LNK (1), LTL (2).
    const s = withHeats(quiet(content, 'plain-shl'), { SHL: 3, LNK: 1, LTL: 2 });
    const seen = new Set<string>();
    for (const all of nights(s)) {
      const changes = all.filter((x) => x.source === 'SHL');
      expect(changes).toHaveLength(1);
      expect(changes[0].why).toBe('spread');
      seen.add(changes[0].region);
    }
    expect([...seen].sort()).toEqual(['LNK', 'PBB']);
  });

  it('a WAR region with no neighbour to heat spreads nowhere', () => {
    const s = withHeats(quiet(content, 'plain-shl'), { SHL: 3, LNK: 2, LTL: 3, PBB: 2 });
    for (const c of nights(s, 50)) expect(c.filter((x) => x.source === 'SHL')).toEqual([]);
  });

  it('a CRISIS region heats a neighbour about one night in three (day 1), and leaves a CRISIS neighbour alone', () => {
    const s = withHeats(quiet(content, 'plain-shl'), { SHL: 2, LTL: 2 });
    const all = nights(s, 600).map((c) => c.filter((x) => x.why === 'pressure' && (x.source === 'SHL' || x.source === 'LTL')));
    const heated = all.filter((c) => c.length > 0);
    // Two CRISIS regions each roll one in three: P(at least one) = 5/9.
    expect(heated.length / all.length).toBeGreaterThan(0.45);
    expect(heated.length / all.length).toBeLessThan(0.65);
    // Shoal and Lintel border each other: neither is ever pushed to WAR by the other's pressure (RULES.crisisPressureReachesCrisis is off).
    expect(RULES.crisisPressureReachesCrisis).toBe(false);
    expect(all.some((c) => c.some((x) => x.to === 3))).toBe(false);
    expect(all.some((c) => c.some((x) => x.region === 'LNK' || x.region === 'PBB' || x.region === 'KLP' || x.region === 'TLM' || x.region === 'DNM'))).toBe(true);
  });

  it('tonight\'s new heats do not spread tonight', () => {
    // SHL at war heats LNK; LNK is then TENSE, not CRISIS, so it cannot roll; PBB is the other option.
    const s = withHeats(quiet(content, 'plain-shl'), { SHL: 3, LTL: 3, LNK: 1 });
    for (const c of nights(s, 50)) {
      const sources = new Set(c.filter((x) => x.source).map((x) => x.source));
      expect([...sources].every((x) => x === 'SHL' || x === 'LTL')).toBe(true);
    }
  });

  it('the slide: flares turn calm regions TENSE at a rate that rises through the month; TENSE regions boil over late', () => {
    expect(flareAt(1)).toBeCloseTo(RULES.flareStart);
    expect(flareAt(30)).toBeCloseTo(RULES.flareEnd);
    expect(flareAt(15)).toBeGreaterThan(RULES.flareStart);
    expect(flareAt(15)).toBeLessThan((RULES.flareStart + RULES.flareEnd) / 2);
    expect(tensePressureAt(1)).toBe(RULES.tensePressureStart);
    expect(tensePressureAt(30)).toBeCloseTo(RULES.tensePressureEnd);
    const late = { ...withHeats(quiet(content, 'plain-shl'), {}), day: 30 };
    const flares = nights(late, 200).map((c) => c.filter((x) => x.why === 'flare').length);
    const mean = flares.reduce((a, b) => a + b, 0) / flares.length;
    expect(mean).toBeGreaterThan(RULES.flareEnd - 0.5);
    expect(mean).toBeLessThan(RULES.flareEnd + 0.5);
    for (const c of nights(late, 20)) for (const x of c.filter((y) => y.why === 'flare')) expect([x.from, x.to]).toEqual([0, 1]);
    const tense = { ...withHeats(quiet(content, 'plain-shl'), { SHL: 1 }), day: 30 };
    const boils = nights(tense, 600).filter((c) => c.some((x) => x.region === 'SHL' && x.why === 'pressure' && x.to === 2));
    expect(boils.length / 600).toBeGreaterThan(RULES.tensePressureEnd - 0.04);
    expect(boils.length / 600).toBeLessThan(RULES.tensePressureEnd + 0.04);
    // Day 1: no boil.
    const early = withHeats(quiet(content, 'plain-shl'), { SHL: 1 });
    expect(nights(early, 100).some((c) => c.some((x) => x.region === 'SHL'))).toBe(false);
  });

  it('a guarded region turns pressure away', () => {
    // SHL at war can only spread to PBB (LNK and LTL are in crisis).
    const s = withHeats(quiet(content, 'plain-shl'), { SHL: 3, LNK: 2, LTL: 2 });
    s.guarded.PBB = s.day + 6;
    for (const c of nights(s, 50)) expect(c.filter((x) => x.region === 'PBB')).toEqual([]);
    s.guarded.PBB = s.day - 1;
    expect(night(s).changes().filter((x) => x.source === 'SHL')).toEqual([{ region: 'PBB', from: 0, to: 1, why: 'spread', source: 'SHL' }]);
  });

  it('the Spin Doctor keeps home from heating', () => {
    // NWK at war; its neighbours WNM, FRM (CRISIS) and VSY (home, CALM).
    const s = withTeam(withHeats(quiet(content, 'plain-shl'), { NWK: 3, WNM: 2, FRM: 2 }), ['spin-doctor']);
    for (const c of nights(s, 50)) expect(c.filter((x) => x.source === 'NWK')).toEqual([]);
    const without = withHeats(quiet(content, 'plain-shl'), { NWK: 3, WNM: 2, FRM: 2 });
    expect(night(without).changes().filter((x) => x.source === 'NWK')).toEqual([{ region: 'VSY', from: 0, to: 1, why: 'spread', source: 'NWK' }]);
  });

  it('Launch on Warning: war never spreads from a warned region', () => {
    const s = withTeam(withHeats(quiet(content, 'plain-shl'), { SHL: 3 }), ['launch-on-warning']);
    s.warned = ['SHL'];
    const w = night(s);
    expect(w.changes()).toEqual([]);
    expect(w.steps).toContainEqual({ kind: 'piece', piece: 'launch-on-warning', note: 'War does not spread from Shoal' });
    // Without the piece the mark is inert.
    const inert = withHeats(quiet(content, 'plain-shl'), { SHL: 3 });
    inert.warned = ['SHL'];
    expect(night(inert).changes().filter((x) => x.source === 'SHL')).toHaveLength(1);
  });

  it('pressure alone never makes war under the shipped numbers: WAR comes from choices', () => {
    const s = withHeats(quiet(content, 'plain-shl'), { SHL: 3, LTL: 2, LNK: 2, PBB: 2, KLP: 2, TLM: 2, DNM: 2 });
    for (const c of nights({ ...s, day: 30 }, 100)) for (const x of c) expect(x.to).toBeLessThan(3);
  });

  it('a flare never lands on a guarded region or on the Spin Doctor\'s home', () => {
    const s = withTeam(withHeats(quiet(content, 'plain-shl'), {}), ['spin-doctor']);
    for (const r of ['SHL', 'LNK', 'PBB']) s.guarded[r] = 40;
    for (const c of nights({ ...s, day: 30 }, 100)) {
      for (const x of c) {
        expect(isHome(x.region)).toBe(false);
        expect(['SHL', 'LNK', 'PBB']).not.toContain(x.region);
      }
    }
  });
});
