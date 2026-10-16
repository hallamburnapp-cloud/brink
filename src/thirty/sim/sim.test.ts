import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng.ts';
import { loadThirtyContent } from '../content/load.ts';
import { newGame } from '../engine/run.ts';
import { fixture, quiet } from '../engine/testkit.ts';
import { expectedDanger, hawkBot, partners, randomBot, sensibleBot, stackScore } from './bots.ts';
import { evaluateGates, summarise } from './gates.ts';
import { playGame } from './play.ts';
import { gatesTable, outcomesTable } from './report.ts';
import { simulate } from './simulate.ts';
import { median, quantile } from './stats.ts';

const small = fixture();
const PACK = join(process.cwd(), 'content-thirty');
const { content: pack } = loadThirtyContent(PACK);

describe('the bots', () => {
  it('the sensible bot takes the option that lowers DANGER most, odds-weighted', () => {
    // plain-shl: CALM cools 1 (−3 from CRISIS), FORCE cools 2 and heats a neighbour (−5 +2 = −3 … tie broken by the hotter cooling).
    const s = quiet(small, 'shoal-risky', { SHL: 2 });
    // RISKY 70%: held −5, missed +7 and Lintel to crisis (+5): expected 0.7×0 + 0.3×17 = 5.1 > HOME's 5 → HOME.
    expect(sensibleBot.option(small, s, new Rng('b'))).toBe('right');
    const hot = quiet(small, 'shoal-risky', { SHL: 3 });
    // From WAR: held −7 (12→5), missed stays 12 + 5 = 17: expected 0.7×5 + 0.3×17 = 8.6 < 12 → RISKY.
    expect(sensibleBot.option(small, hot, new Rng('b'))).toBe('left');
    expect(expectedDanger({ odds: 70, dangerAfter: 5, dangerIfMissed: 17 } as never)).toBeCloseTo(8.6);
  });

  it('the sensible bot takes the piece that stacks with its team, else a seeded pick', () => {
    expect(stackScore(small, ['old-ambassador'], 'back-channel')).toBe(1);
    expect(stackScore(small, ['old-ambassador'], 'hawk-general')).toBe(0);
    expect(stackScore(small, ['old-ambassador'], 'hotline')).toBe(0.5);
    expect(stackScore(small, ['peace-movement'], 'hawk-general')).toBe(1);
    const s = { ...newGame(small, 'x'), phase: 'offer' as const, card: null, offer: ['hawk-general', 'back-channel', 'hotline'], team: ['old-ambassador'] };
    expect(sensibleBot.pick(small, s, new Rng('b'))).toBe(1);
    // Nothing held: a seeded pick leaning to the pieces with partners to stack with.
    const fresh = { ...s, team: [] };
    const picks = Array.from({ length: 300 }, (_, i) => sensibleBot.pick(small, fresh, new Rng(`p${i}`)));
    expect(new Set(picks).size).toBe(3);
    const count = (i: number) => picks.filter((p) => p === i).length;
    expect(count(1)).toBeGreaterThan(count(2));
    expect(partners(small, 'peace-movement')).toBe(5);
    expect(partners(small, 'old-ambassador')).toBe(2);
    expect(partners(small, 'cautious-intel')).toBe(2);
    expect(partners(small, 'hotline')).toBe(0);
  });

  it('the random bot may take no piece', () => {
    const s = { ...newGame(small, 'x'), phase: 'offer' as const, card: null, offer: ['hawk-general', 'back-channel', 'hotline'] };
    const picks = new Set(Array.from({ length: 40 }, (_, i) => randomBot.pick(small, s, new Rng(`r${i}`))));
    expect(picks.has(null)).toBe(true);
    expect(picks.size).toBe(4);
  });
});

describe('a game', () => {
  it('is reproducible from its seeds and ends', () => {
    const a = playGame(pack, sensibleBot, 'g1');
    const b = playGame(pack, sensibleBot, 'g1');
    expect(a).toEqual(b);
    const h = playGame(pack, hawkBot, 'g1');
    expect(['WAR', 'STAND-DOWN', 'HELD']).toContain(h.ending);
    expect(['WAR', 'STAND-DOWN', 'HELD']).toContain(a.ending);
    expect(a.curve.length).toBe(a.day);
    expect(a.peak).toBeGreaterThanOrEqual(Math.max(...a.curve));
    expect(a.offered.length).toBeGreaterThanOrEqual(a.team.length);
  });

  it('statistics helpers', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(10);
  });
});

describe('a small batch on the shipped pack', () => {
  const res = simulate(pack, { games: 120, bots: ['random', 'sensible'], prefix: 'V' });

  it('plays every game to an ending with no stalls, and prints the gates', () => {
    for (const s of Object.values(res.stats)) expect(s!.stalls).toBe(0);
    expect(res.gates.map((g) => g.id)).toEqual(['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8']);
    expect(gatesTable(res.gates, 'text')).toContain('G1');
    expect(outcomesTable(res.stats, 'md')).toContain('| random |');
  });

  it('the gates a small sample can judge hold: no piece over 70%, games run 20–30 days, nothing stalls', () => {
    const by = Object.fromEntries(res.gates.map((g) => [g.id, g]));
    expect(by.G5.pass).toBe(true);
    expect(by.G6.pass).toBe(true);
    expect(by.G7.pass).toBe(true);
    // The rest are judged at 2,000 games by tools/thirty-sim.ts (ENGINE.md "Results"); here only their direction.
    const s = res.stats.sensible!;
    expect(s.closeCalls / s.games).toBeGreaterThan(0.3);
    expect(s.standDown / s.games).toBeGreaterThan(0.05);
  });

  it('the sensible bot does better than random', () => {
    const r = res.stats.random!;
    const s = res.stats.sensible!;
    expect(s.held + s.standDown).toBeGreaterThan(r.held + r.standDown);
    expect(s.war).toBeLessThan(r.war);
  });

  it('the gates can be judged on one bot alone, and G9 needs the hawk', () => {
    const only = evaluateGates(pack, { random: summarise(pack, 'random', res.games.random!) });
    expect(only.map((g) => g.id)).toEqual(['G1', 'G7']);
    const hawk = simulate(pack, { games: 40, bots: ['hawk'], prefix: 'V' });
    expect(hawk.gates.map((g) => g.id)).toEqual(['G7', 'G9']);
    expect(hawk.stats.hawk!.feel.acted['hawk-general'].held).toBeGreaterThan(0);
  });
});
