import { describe, expect, it } from 'vitest';
import { Rng } from '../../engine/rng.ts';
import { BOTS } from '../sim/bots.ts';
import { debrief, dialsLine } from './debrief.ts';
import { answerPhone, endWeek, newGame } from './run.ts';
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
  it('writes a thought for every week played, in order, and ends with the dials', () => {
    const s = full('db-order');
    const weeks = debrief(s).map((e) => e.week);
    expect([...weeks]).toEqual([...weeks].sort((a, b) => a - b));
    expect(new Set(weeks).size).toBe(s.log.length);
    const last = debrief(s).pop()!;
    expect(last.thought).toBe(s.ending!.dials);
    expect(last.thought).toBe(dialsLine(c, s.fed));
  });
  it('the player\'s own orders stand under the thoughts', () => {
    const s = full('db-what');
    const entries = debrief(s);
    expect(entries.some((e) => /^You /.test(e.what))).toBe(true);
  });
  it('names the dials in words', () => {
    expect(dialsLine(c, { appetite: 0.75, jumpiness: 0.25 })).toBe('They were hungry and not easily scared.');
    expect(dialsLine(c, { appetite: 0.3, jumpiness: 0.5 })).toBe('They were careful and watchful.');
    expect(dialsLine(c, { appetite: 0.5, jumpiness: 0.7 })).toBe('They were steady and easily scared.');
  });
  it('never puts a conditional annotation on screen', () => {
    for (let i = 0; i < 20; i++) {
      const s = full(`db-plain-${i}`);
      const all = [...s.log.flatMap((w) => [...w.visible, ...w.hidden, ...w.acts]), ...s.ending!.lines, s.collision].join('\n');
      expect(/\bif they\b/i.test(all)).toBe(false);
    }
  });
});
