import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng.ts';
import { BOTS } from '../sim/bots.ts';
import { closingLines, debrief, dialsLine } from './debrief.ts';
import { makePhone } from './phone.ts';
import { RULES } from './rules.ts';
import { answerPhone, endWeek, movePiece, movesFor, newGame, promise, withdraw } from './run.ts';
import { regionName } from './world.ts';
import { FIXTURE_CONTENT } from './testkit.ts';
import type { GameState } from './types.ts';

const c = FIXTURE_CONTENT;

function full(seed: string, bot = BOTS.sensible): GameState {
  const rng = new Rng(seed);
  let s = newGame(c, seed);
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 60) {
    if (s.phase === 'act') s = endWeek(c, bot.act(c, s, rng));
    else s = answerPhone(c, s, bot.answer(c, s, rng));
  }
  return s;
}

describe('the debrief', () => {
  it('has at least six hidden lines in every game, each a finished plain sentence', () => {
    for (const bot of [BOTS.passive, BOTS.sensible, BOTS['promise-everything']]) {
      for (let i = 0; i < 25; i++) {
        const s = full(`db-${bot.name}-${i}`, bot);
        expect(s.phase).toBe('ended');
        const entries = debrief(s);
        expect(entries.length).toBeGreaterThanOrEqual(6);
        for (const e of entries) {
          expect(e.week).toBeGreaterThanOrEqual(1);
          expect(e.week).toBeLessThanOrEqual(RULES.weeks);
          expect(e.what.length).toBeGreaterThan(0);
          expect(e.thought).not.toMatch(/\{\w+\}/);
          expect(e.thought).toMatch(/\.$/);
        }
      }
    }
  });
  it('writes its thoughts in week order; the lessons and the dials print once, on the closing card, never on a week\'s page', () => {
    const s = full('db-order');
    const weeks = debrief(s).map((e) => e.week);
    expect([...weeks]).toEqual([...weeks].sort((a, b) => a - b));
    expect(new Set(weeks).size).toBeLessThanOrEqual(s.log.length);
    expect(s.ending!.dials).toBe(dialsLine(c, s.fed, s.tally!.jumpinessSeen));
    const lessons = s.ending!.lessons!;
    expect(lessons.length).toBeLessThanOrEqual(3);
    // SPEC-SMALL "The debrief reads motives when they were formed": a lesson prints once, on the closing card.
    const pages = s.log.flatMap((w) => w.hidden);
    for (const l of [...lessons, s.ending!.dials]) expect(pages).not.toContain(l);
    expect(closingLines(c, s)).toEqual([...lessons, s.ending!.dials]);
  });
  it('writes at most one "they went for" and one feint line a week, and lessons drawn from the game', () => {
    let lessonsSeen = 0;
    for (const bot of [BOTS.passive, BOTS.sensible, BOTS['no-orders'], BOTS.seller]) {
      for (let i = 0; i < 15; i++) {
        const s = full(`db-cap-${bot.name}-${i}`, bot);
        for (const w of s.log) {
          expect(w.hidden.filter((h) => / was their choice that week because | went for /.test(h)).length).toBeLessThanOrEqual(1);
          expect(w.hidden.filter((h) => / was a feint\./.test(h)).length).toBeLessThanOrEqual(1);
        }
        lessonsSeen += s.ending!.lessons!.length;
        for (const l of s.ending!.lessons!) expect(l).not.toMatch(/\{\w+\}/);
      }
    }
    expect(lessonsSeen).toBeGreaterThan(20);
  });
  it('the player\'s own orders stand under the thoughts', () => {
    const s = full('db-what');
    const entries = debrief(s);
    expect(entries.some((e) => /^You /.test(e.what))).toBe(true);
  });
  it('writes the week\'s orders net of a promise withdrawn the same week (the note and the debrief agree)', () => {
    let s = newGame(c, 'db-net');
    s = { ...s, promises: [], influence: 30 };
    const a = promise(s, 'VSY');
    if (!a.ok) throw new Error(a.reason);
    const b = withdraw(a.state, 'VSY');
    if (!b.ok) throw new Error(b.reason);
    const d = promise(b.state, 'VSY');
    if (!d.ok) throw new Error(d.reason);
    const e = movePiece(d.state, 'fleet', movesFor(d.state, 'fleet')[0]);
    if (!e.ok) throw new Error(e.reason);
    expect(e.state.acts.map((x) => x.kind)).toEqual(['promise', 'withdraw', 'promise', 'move']);
    let r = endWeek(c, e.state);
    if (r.phase === 'phone') r = answerPhone(c, r, 'down');
    const orders = r.log[0].acts.filter((line) => /^You (promised|withdrew|moved)/.test(line));
    expect(orders).toEqual(['You promised to defend Vessary.', `You moved the fleet to ${regionName(movesFor(d.state, 'fleet')[0])}.`]);
    // Everything cancelled out reads as no orders at all.
    const w = withdraw(a.state, 'VSY');
    if (!w.ok) throw new Error(w.reason);
    let q = endWeek(c, w.state);
    if (q.phase === 'phone') q = answerPhone(c, q, 'down');
    expect(q.log[0].acts[0]).toBe(c.strings.acts.none);
    expect(q.tally?.idleWeeks).toBe(1);
  });
  it('names the dials in words, and only appetite when jumpiness never showed', () => {
    expect(dialsLine(c, { appetite: 0.75, jumpiness: 0.25 })).toBe('They were hungry and not easily scared.');
    expect(dialsLine(c, { appetite: 0.3, jumpiness: 0.5 })).toBe('They were careful and watchful.');
    expect(dialsLine(c, { appetite: 0.5, jumpiness: 0.7 })).toBe('They were steady and easily scared.');
    expect(dialsLine(c, { appetite: 0.75, jumpiness: 0.25 }, false)).toBe('They were hungry. You never came close enough to see whether they scare.');
  });
  it('never puts a conditional annotation on screen', () => {
    for (let i = 0; i < 20; i++) {
      const s = full(`db-plain-${i}`);
      const all = [...s.log.flatMap((w) => [...w.visible, ...w.hidden, ...w.acts]), ...s.ending!.lines, s.collision].join('\n');
      expect(/\bif they\b/i.test(all)).toBe(false);
    }
  });
  it('prints an answer as the act it was, never the form\'s forecast (the debrief\'s "what you did")', () => {
    const base = (seed: string) => {
      const s = newGame(c, seed);
      s.promises = [];
      s.pieces = [
        { kind: 'fleet', at: 'ASK' },
        { kind: 'brigade', at: 'EDV' },
      ];
      s.fed.lines = s.fed.lines.map((l) => ({ ...l, real: false }));
      return s;
    };
    const ring = (s: GameState, kind: 'fall-unpromised' | 'test' | 'summit' | 'trawler' | 'false-alarm' | 'bluff-crossed', region: string | null, round: 1 | 2 | 3 = 1): GameState => {
      const t = { ...s, phase: 'phone' as const, pendingTest: kind === 'test' ? region : null, pendingRound: round };
      t.phone = makePhone(c, t, new Rng('ring'), { kind, region, round, line: 'x' });
      return t;
    };
    const cases: Array<[GameState, 'back' | 'down' | 'wait', string]> = [
      [ring(base('a1'), 'fall-unpromised', 'VSY'), 'wait', 'You protested at Vessary.'],
      [ring(base('a2'), 'fall-unpromised', 'VSY'), 'down', 'You let Vessary go.'],
      [ring({ ...base('a3'), promises: [{ region: 'VSY', since: 1, inherited: false }] }, 'test', 'VSY'), 'back', 'You backed your promise at Vessary.'],
      [ring({ ...base('a4'), promises: [{ region: 'VSY', since: 1, inherited: false }] }, 'test', 'VSY'), 'down', 'You backed down at Vessary.'],
      [ring({ ...base('a5'), promises: [{ region: 'VSY', since: 1, inherited: false }] }, 'test', 'VSY'), 'wait', 'You asked for a week at Vessary.'],
      // The third WAIT is backing down, and prints as one.
      [ring({ ...base('a6'), promises: [{ region: 'VSY', since: 1, inherited: false }] }, 'test', 'VSY', 3), 'wait', 'You backed down at Vessary.'],
      [ring(base('a7'), 'summit', null), 'down', 'You refused their summit.'],
      [ring(base('a8'), 'false-alarm', 'KLP'), 'back', 'You went on alert over Kelpmouth.'],
    ];
    for (const [s, key, line] of cases) {
      const n = answerPhone(c, s, key);
      const w = n.log.find((x) => x.week === s.week)!;
      expect(w.acts).toContain(line);
      expect(w.acts.join(' ')).not.toMatch(/will likely|may fall|·/);
      expect(debrief(n).some((e) => e.what.includes(line))).toBe(n.log.some((x) => x.hidden.length > 0));
    }
    // The tape says the same act: PROTEST about a place nobody promised is a protest there, not "You let it go".
    const tapeOf = (s: GameState, key: 'down' | 'wait') => answerPhone(c, s, key).log.find((x) => x.week === s.week)!.visible;
    const protested = tapeOf(ring(base('t1'), 'fall-unpromised', 'VSY'), 'wait');
    expect(protested).toContain(c.strings.headlines.unpromisedProtested.replace('{region}', 'Vessary'));
    expect(protested).not.toContain(c.strings.headlines.unpromisedLet.replace('{region}', 'Vessary'));
    expect(tapeOf(ring(base('t2'), 'fall-unpromised', 'VSY'), 'down')).toContain(c.strings.headlines.unpromisedLet.replace('{region}', 'Vessary'));
  });
});
