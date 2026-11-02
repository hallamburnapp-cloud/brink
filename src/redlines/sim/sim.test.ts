import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng.ts';
import { FIXTURE_CONTENT } from '../engine/testkit.ts';
import { BOTS, BOT_NAMES, GATED_BOTS, farPromiseTarget } from './bots.ts';
import { GATES, evaluateGates } from './gates.ts';
import { brokenInvariants } from './invariants.ts';
import { playGame } from './play.ts';
import { simulate } from './simulate.ts';
import { answerPhone, endWeek, newGame, promise } from '../engine/run.ts';
import { holdInfo } from '../engine/board.ts';
import { pieceDistance } from '../engine/world.ts';
import { loadRedlinesContent } from '../content/load.ts';

const c = FIXTURE_CONTENT;

describe('the simulator', () => {
  const res = simulate(c, { games: 150, bots: ['passive', 'far-promise', 'sensible'], prefix: 'U' });
  it('plays every game to an ending, deterministically', () => {
    for (const rows of Object.values(res.games)) for (const g of rows!) expect(g.ending).not.toBe('STALL');
    const again = playGame(c, BOTS.sensible, 'U3');
    expect(again).toEqual(res.games.sensible![3]);
  });
  it('the passive bot loses most games', () => {
    const p = res.stats.passive!;
    expect((p.war + p.frozen) / p.games).toBeGreaterThan(0.7);
  });
  it('the solved opening does not beat sensible play', () => {
    const f = res.stats['far-promise']!;
    const s = res.stats.sensible!;
    expect(f.treaty / f.games).toBeLessThanOrEqual(s.treaty / s.games);
    expect(s.treaty / s.games).toBeGreaterThan(0.2);
  });
  it('every debrief has at least six hidden lines', () => {
    for (const st of Object.values(res.stats)) expect(st!.minHidden).toBeGreaterThanOrEqual(6);
  });
  it('the gates read the statistics', () => {
    const gates = evaluateGates(res.stats);
    expect(gates.map((g) => g.id)).toEqual(['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G10']);
    expect(gates.find((g) => g.id === 'G10')!.pass).toBe(true);
    expect(gates.find((g) => g.id === 'G1')!.pass).toBe(true);
    expect(gates.find((g) => g.id === 'G7')!.pass).toBe(true);
    // (G2's half is judged on the shipped pack by npm run sim:redlines; the fixture pack's lines and calls differ.)
  });
  it('sitting still and selling a far promise both sit well under sensible play (G8, G9)', () => {
    const more = simulate(c, { games: 120, bots: ['sensible', 'no-orders', 'seller'], prefix: 'U' });
    const g8 = more.gates.find((g) => g.id === 'G8')!;
    const g9 = more.gates.find((g) => g.id === 'G9')!;
    expect(g8.pass).toBe(true);
    expect(g9.pass).toBe(true);
    expect(more.stats['no-orders']!.idleShare).toBeGreaterThan(0.8);
  });
  it('the far promise is two or more moves from both pieces, and the far-promise bot never walks towards it', () => {
    for (let i = 0; i < 20; i++) {
      const s = newGame(c, `fp-${i}`);
      const far = farPromiseTarget(s);
      expect(far).not.toBeNull();
      expect(holdInfo(s, far!).ok).toBe(false);
      for (const p of s.pieces) expect(pieceDistance(p.kind, p.at, far!)).toBeGreaterThanOrEqual(2);
    }
    for (let i = 0; i < 20; i++) {
      let s = newGame(c, `fw-${i}`);
      let far: string | null = null;
      const rng = new Rng(`fw-${i}`);
      for (let w = 0; w < 6 && s.phase !== 'ended'; w++) {
        if (s.phase === 'phone') {
          s = answerPhone(c, s, BOTS['far-promise'].answer(c, s, rng));
          continue;
        }
        const before = s;
        s = BOTS['far-promise'].act(c, s, rng);
        if (s.week === 1) far = s.promises.find((p) => !p.inherited)?.region ?? null;
        if (far && before.promises.some((p) => p.region === far && p.since === 1)) {
          for (const p of s.pieces) {
            const was = before.pieces.find((q) => q.kind === p.kind)!.at;
            expect(pieceDistance(p.kind, p.at, far)).toBeGreaterThanOrEqual(pieceDistance(p.kind, was, far));
          }
        }
        s = endWeek(c, s);
      }
    }
  });
  it('G2 is the ruling: the far-promise opening at most half the sensible bot\'s treaties', () => {
    expect(GATES.farShare).toBe(0.5);
    const at = (far: number, sensible: number) => evaluateGates({ 'far-promise': { treaty: far, games: 100 } as never, sensible: { treaty: sensible, games: 100, frozen: 0, medianTreatyWeek: 5 } as never }).find((g) => g.id === 'G2')!.pass;
    expect(at(20, 40)).toBe(true);
    expect(at(21, 40)).toBe(false);
  });
  it('G11 and G12 are the second review\'s ruling: the shark at most 60%, no one-rule bot over 45%', () => {
    expect(GATES.sharkMax).toBe(0.6);
    expect(GATES.oneRuleMax).toBe(0.45);
    const g = (shark: number, still: number, summit: number) =>
      evaluateGates({ shark: { bot: 'shark', treaty: shark, games: 100 } as never, 'shark-still': { bot: 'shark-still', treaty: still, games: 100 } as never, 'summit-only': { bot: 'summit-only', treaty: summit, games: 100 } as never }).filter((x) => x.id === 'G11' || x.id === 'G12');
    expect(g(60, 45, 10).every((x) => x.pass)).toBe(true);
    expect(g(61, 10, 10).find((x) => x.id === 'G11')!.pass).toBe(false);
    expect(g(50, 10, 46).find((x) => x.id === 'G12')!.pass).toBe(false);
    expect(GATED_BOTS).toEqual(expect.arrayContaining(['shark', 'summit-only', 'shark-still']));
  });
  it('the shark and its one-rule cousins play every game to an ending, from what is on the sheet', () => {
    const r = simulate(c, { games: 40, bots: ['shark', 'summit-only', 'shark-still'], prefix: 'SH' });
    for (const name of ['shark', 'summit-only', 'shark-still'] as const) for (const x of r.games[name]!) expect(x.ending).not.toBe('STALL');
    // The one that never moves a piece never moves one.
    for (let i = 0; i < 10; i++) {
      const g = playGame(c, BOTS['shark-still'], `still-${i}`);
      expect(g.ending).not.toBe('STALL');
    }
  });
  it('the careful hand plays every game to an ending and is reported, never gated', () => {
    const r = simulate(c, { games: 60, bots: ['careful', 'sensible'], prefix: 'K' });
    for (const g of r.games.careful!) expect(g.ending).not.toBe('STALL');
    expect(r.gates.map((g) => g.id)).not.toContain('careful');
    expect(r.stats.careful!.games).toBe(60);
  });
});

describe('the invariants every game keeps', () => {
  it('no game of any bot breaks one, on the fixture pack and on the shipped pack', () => {
    const real = loadRedlinesContent(`${process.cwd()}/content-redlines`).content!;
    for (const pack of [c, real]) {
      for (const name of BOT_NAMES) {
        for (let i = 0; i < 40; i++) {
          const g = playGame(pack, BOTS[name], `inv-${i}`);
          expect(g.brokenFirst, `${name} inv-${i}`).toBeNull();
        }
      }
    }
  });
  it('catches a place quieted before its cause, and a place that fell and came back in one week', () => {
    let s = newGame(c, 'bad');
    s = endWeek(c, s);
    while (s.phase === 'phone') s = answerPhone(c, s, 'down');
    expect(brokenInvariants(s)).toEqual([]);
    const bad = JSON.parse(JSON.stringify(s));
    const w = bad.log[0];
    w.visible.push('Vessary has fallen.', 'Guns quiet at Vessary.');
    w.beats.push({ kind: 'fell', region: 'VSY', war: s.war + 1, step: 1, treaty: s.treaty }, { kind: 'recovered', region: 'VSY', war: s.war, step: 1, treaty: s.treaty });
    const found = brokenInvariants(bad).join(' | ');
    expect(found).toMatch(/no step down before it/);
    expect(found).toMatch(/fell and recovered in the same week/);
    const quiet = JSON.parse(JSON.stringify(s));
    quiet.log[0].visible.push('Vessary has fallen.');
    quiet.log[0].beats.push({ kind: 'fell', region: 'VSY', war: s.war + 1, step: 1, treaty: s.treaty });
    quiet.log[0].danger.war = s.war + 1;
    expect(brokenInvariants(quiet).join(' | ')).toMatch(/before a fall of the same week|a quiet week in a week VSY fell/);
    // The WAR count beside a line must be the sheet's.
    const war = JSON.parse(JSON.stringify(s));
    if (war.log[0].beats.length) war.log[0].beats[0].war += 3;
    expect(brokenInvariants(war).length).toBeGreaterThan(0);
    void promise;
  });
});
