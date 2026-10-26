import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng.ts';
import { BOTS } from '../sim/bots.ts';
import { debrief, dialsLine } from './debrief.ts';
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
          expect(e.week).toBeLessThanOrEqual(8);
          expect(e.what.length).toBeGreaterThan(0);
          expect(e.thought).not.toMatch(/\{\w+\}/);
          expect(e.thought).toMatch(/\.$/);
        }
      }
    }
  });
  it('writes its thoughts in week order and ends with the lessons, then the dials', () => {
    const s = full('db-order');
    const weeks = debrief(s).map((e) => e.week);
    expect([...weeks]).toEqual([...weeks].sort((a, b) => a - b));
    expect(new Set(weeks).size).toBeLessThanOrEqual(s.log.length);
    const last = debrief(s).pop()!;
    expect(last.thought).toBe(s.ending!.dials);
    expect(last.thought).toBe(dialsLine(c, s.fed, s.tally!.jumpinessSeen));
    const lastWeek = s.log[s.log.length - 1].hidden;
    const lessons = s.ending!.lessons!;
    expect(lessons.length).toBeLessThanOrEqual(3);
    expect(lastWeek.slice(-1 - lessons.length, -1)).toEqual(lessons);
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
});
