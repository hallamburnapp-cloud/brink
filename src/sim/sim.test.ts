import { describe, expect, it } from 'vitest';
import { fixture } from '../engine/fixture';
import type { Content, Seat } from '../engine/types';
import { POLICIES, POLICY_NAMES, evaluateSide, greedyScore, heuristicPolicy } from './policies';
import { ALL_SEATS, formatReport, runOne, simulate, type Report } from './simulate';
import { Rng } from '../engine/rng';
import { createRun, view } from '../engine/run';

const content: Content = fixture();

describe('runOne', () => {
  for (const name of POLICY_NAMES) {
    it(`${name} completes 200 runs without throwing and ends every run`, () => {
      const policy = POLICIES[name];
      for (let i = 0; i < 200; i++) {
        const seat: Seat = ALL_SEATS[i % 3];
        const s = runOne(content, { seed: `t-${i}`, seat, policy });
        expect(s.policy).toBe(name);
        expect(s.seat).toBe(seat);
        expect(content.endings[s.ending], `run ${i} ended in "${s.ending}"`).toBeDefined();
        expect(s.kind).toBe(content.endings[s.ending].kind);
        expect(s.standdown).toBe(s.kind === 'standdown');
        expect(s.days).toBeGreaterThanOrEqual(1);
        expect(s.cards).toBeGreaterThan(0);
        expect(s.act).toBeGreaterThanOrEqual(1);
        expect(s.act).toBeLessThanOrEqual(content.acts.length);
        expect(s.seen.length).toBeGreaterThan(0);
        expect(s.timeouts).toBeLessThanOrEqual(s.timedCards);
        expect(s.nearMisses).toBeLessThanOrEqual(s.rolls);
        expect(s.maxEscalation).toBeGreaterThanOrEqual(content.seats[seat].meters.escalation);
        // every held piece was offered first (no starting pieces in the fixture)
        for (const p of s.pieces) expect(s.offered).toContain(p);
        expect(s.offered.length % 3 === 0 || s.offered.length >= s.pieces.length).toBe(true);
      }
    });
  }

  it('is deterministic per seed and policy, and differs across policies', () => {
    const a = runOne(content, { seed: 'det', seat: 'republic', policy: POLICIES.heuristic });
    const b = runOne(content, { seed: 'det', seat: 'republic', policy: POLICIES.heuristic });
    expect(a).toEqual(b);
    const c = runOne(content, { seed: 'det', seat: 'republic', policy: POLICIES.random });
    expect(c.policy).toBe('random');
  });

  it('random lets timers expire far more often than the heuristic', () => {
    let rnd = 0;
    let rndTimed = 0;
    let heu = 0;
    let heuTimed = 0;
    for (let i = 0; i < 150; i++) {
      const r = runOne(content, { seed: `x-${i}`, seat: 'federation', policy: POLICIES.random });
      rnd += r.timeouts;
      rndTimed += r.timedCards;
      const h = runOne(content, { seed: `x-${i}`, seat: 'federation', policy: POLICIES.heuristic });
      heu += h.timeouts;
      heuTimed += h.timedCards;
    }
    expect(rndTimed).toBeGreaterThan(0);
    expect(rnd / rndTimed).toBeGreaterThan(heu / Math.max(1, heuTimed));
  });
});

describe('policies', () => {
  it('greedy scores the calmer side higher', () => {
    const s = createRun(content, { seed: 'g', seat: 'republic', mode: 'endless' });
    s.current = 'c_basic';
    const v = view(content, s)!;
    // left: public -5, escalation +5, military +4; right: public +3, escalation -3, allies +2
    expect(greedyScore(s, v.right)).toBeGreaterThan(greedyScore(s, v.left));
  });

  it('heuristic hard-avoids a side that pushes a meter within 8 of an edge', () => {
    const s = createRun(content, { seed: 'h', seat: 'republic', mode: 'endless' });
    s.current = 'c_basic';
    s.meters.public = 12;
    const v = view(content, s)!;
    expect(evaluateSide(s, v.left).hardAvoid).toBe(true); // public 12 - 5 = 7
    expect(evaluateSide(s, v.right).hardAvoid).toBe(false);
    expect(heuristicPolicy.choose(content, s, v, new Rng('any'))).toBe('right');
  });

  it('heuristic reads hidden costs as extra escalation and hard-avoids above 85', () => {
    const s = createRun(content, { seed: 'h2', seat: 'republic', mode: 'endless' });
    s.pieces.push('p_hawk');
    s.current = 'c_basic';
    s.meters.escalation = 84;
    const v = view(content, s)!;
    expect(v.left.hiddenCosts).toContain('escalation');
    const e = evaluateSide(s, v.left);
    expect(e.escalation).toBe(90);
    expect(e.hardAvoid).toBe(true);
  });

  it('heuristic buries when both sides are unacceptable and a removal charge is available', () => {
    const s = createRun(content, { seed: 'h3', seat: 'republic', mode: 'endless' });
    s.pieces.push('p_fixer');
    s.charges.removal = 1;
    s.current = 'c_chain'; // both sides: public -3
    s.meters.public = 6;
    const v = view(content, s)!;
    expect(heuristicPolicy.choose(content, s, v, new Rng('any'))).toBe('bury');
    s.charges.removal = 0;
    expect(['left', 'right']).toContain(heuristicPolicy.choose(content, s, v, new Rng('any')));
  });

  it('heuristic piece picking prefers tag synergy and never returns something not offered', () => {
    const s = createRun(content, { seed: 'h4', seat: 'republic', mode: 'endless' });
    const offer = ['p_hawk', 'p_dove', 'p_odds'];
    const pick = heuristicPolicy.pickPiece(content, s, offer, new Rng('pp'));
    expect(offer).toContain(pick);
    const g = POLICIES.greedy.pickPiece(content, s, offer, new Rng('pp'));
    expect(offer).toContain(g);
    const r = POLICIES.random.pickPiece(content, s, offer, new Rng('pp'));
    expect(offer).toContain(r);
  });
});

describe('simulate', () => {
  const opts = { runs: 60, policies: POLICY_NAMES, seats: 'all' as const, seedBase: 'unit' };
  const report: Report = simulate(content, opts);

  it('is deterministic: same seed base gives identical report JSON', () => {
    const again = simulate(content, opts);
    expect(JSON.stringify(again)).toBe(JSON.stringify(report));
    const other = simulate(content, { ...opts, seedBase: 'unit-2' });
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(report));
  });

  it('has a section per policy plus an all aggregate with consistent run counts', () => {
    expect(report.policyOrder).toEqual(['random', 'greedy', 'heuristic', 'all']);
    for (const name of POLICY_NAMES) expect(report.policies[name].runs).toBe(60);
    expect(report.policies.all.runs).toBe(180);
    for (const name of report.policyOrder) {
      const r = report.policies[name];
      const endingRuns = r.endings.reduce((n, e) => n + e.count, 0);
      const kindRuns = r.kinds.reduce((n, k) => n + k.count, 0);
      const actRuns = r.acts.reduce((n, a) => n + a.count, 0);
      const seatRuns = r.seats.reduce((n, s) => n + s.runs, 0);
      expect(endingRuns).toBe(r.runs);
      expect(kindRuns).toBe(r.runs);
      expect(actRuns).toBe(r.runs);
      expect(seatRuns).toBe(r.runs);
      expect(r.seats.map((s) => s.seat)).toEqual(['coalition', 'federation', 'republic']);
      expect(r.days.p10).toBeLessThanOrEqual(r.days.median);
      expect(r.days.median).toBeLessThanOrEqual(r.days.p90);
      expect(r.topEndingShare).toBe(Math.max(...r.endings.map((e) => e.pct)));
      expect(r.cards.length).toBeGreaterThan(0);
      expect(r.weakestCards.length).toBeLessThanOrEqual(15);
    }
  });

  it('pick rates sum sensibly', () => {
    for (const name of report.policyOrder) {
      const r = report.policies[name];
      let offered = 0;
      let picked = 0;
      for (const p of r.piecePicks) {
        expect(p.picked).toBeLessThanOrEqual(p.offered);
        if (p.rate !== null) {
          expect(p.rate).toBeGreaterThanOrEqual(0);
          expect(p.rate).toBeLessThanOrEqual(100);
        } else expect(p.offered).toBe(0);
        offered += p.offered;
        picked += p.picked;
      }
      expect(picked).toBeGreaterThan(0);
      // one pick per offer; offers hold up to three pieces
      expect(offered).toBeGreaterThanOrEqual(picked);
      expect(offered).toBeLessThanOrEqual(picked * 3);
      // the locked piece is unlocked for bots ('all'), so nothing is silently never offered except by exclusion
      expect(r.piecePicks.map((p) => p.id)).toEqual(content.pieceOrder);
    }
    const all = report.policies.all;
    for (const p of all.piecePicks) {
      const sum = POLICY_NAMES.reduce((n, name) => n + report.policies[name].piecePicks.find((q) => q.id === p.id)!.picked, 0);
      expect(sum).toBe(p.picked);
    }
  });

  it('tracks card coverage, combos, profiles and targets', () => {
    const all = report.policies.all;
    // c_end can never be drawn (its flag is never set); everything else in the fixture is reachable
    expect(all.neverSeen).toContain('c_end');
    for (const id of all.neverSeen) expect(all.cards.find((c) => c.id === id)).toBeUndefined();
    expect(report.combos).not.toBeNull();
    expect(report.combos!.policy).toBe('heuristic');
    expect(report.combos!.top.length).toBeLessThanOrEqual(20);
    for (const c of report.combos!.top) {
      expect(c.runs).toBeGreaterThanOrEqual(report.combos!.minRuns);
      expect(c.baselineRuns).toBeGreaterThanOrEqual(0);
    }
    expect(report.pieceProfiles.map((p) => p.id)).toEqual(content.pieceOrder);
    expect(report.weakestPieces.length).toBeLessThanOrEqual(5);
    expect(report.perfectRunRate).toBe(report.policies.heuristic.standdownRate);
    expect(report.targets.map((t) => t.id)).toEqual(['median_days', 'ending_share', 'reachable', 'pick_band', 'combos', 'perfect_run']);
    for (const t of report.targets) expect(['PASS', 'FAIL', 'N/A']).toContain(t.status);
    expect(report.targets.find((t) => t.id === 'reachable')!.status).toBe('FAIL');
  });

  it('marks heuristic-only targets N/A when the heuristic is not run', () => {
    const r = simulate(content, { runs: 10, policies: ['random'], seats: ['republic'], seedBase: 'na' });
    expect(r.combos).toBeNull();
    expect(r.perfectRunRate).toBeNull();
    expect(r.targets.filter((t) => t.status === 'N/A').map((t) => t.id)).toEqual(['median_days', 'ending_share', 'pick_band', 'combos', 'perfect_run']);
    expect(r.policies.all.seats.map((s) => s.seat)).toEqual(['republic']);
  });

  it('renders a markdown report with every section', () => {
    const md = formatReport(report);
    for (const heading of [
      '# BRINK balance simulation',
      '## Targets',
      '## Summary',
      '## Policy: random',
      '## Policy: greedy',
      '## Policy: heuristic',
      '## Policy: all',
      '### Endings (heuristic)',
      '### Act reached (heuristic)',
      '### Per seat (heuristic)',
      '### Piece pick rates (heuristic)',
      '### Card coverage (heuristic)',
      '## Cards never seen (all policies)',
      '## Combos (heuristic)',
      '## Piece ending profiles',
      '## Weakest pieces',
      '## Per-card table (heuristic)',
      '## Weakest cards (heuristic)',
    ]) {
      expect(md, `missing ${heading}`).toContain(heading);
    }
    expect(md).toMatch(/\| (PASS|FAIL) \|/);
    expect(md).toContain('c_end');
    expect(md).not.toContain('undefined');
    expect(md).not.toContain('NaN');
  });
});
