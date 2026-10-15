import { describe, expect, it } from 'vitest';
import { BAR_W, deltaText, deltaX, gaugeRgb, needleX, numberEdges, numberPlace, numberX } from './gauge';
import { endingLines, heldGrade } from './endings';

describe('the DANGER gauge', () => {
  it('runs cool blue at 0 to red at 100', () => {
    const [r0, , b0] = gaugeRgb(0);
    expect(b0).toBeGreaterThan(r0);
    const [r100, , b100] = gaugeRgb(100);
    expect(r100).toBeGreaterThan(b100);
    // The blue only ever drains out of it, and the top is unmistakably red.
    let last = Infinity;
    for (let d = 0; d <= 100; d += 5) {
      const [, , b] = gaugeRgb(d);
      expect(b).toBeLessThanOrEqual(last + 1e-9);
      last = b;
    }
    const [r, g, b] = gaugeRgb(100);
    expect(r).toBeGreaterThan(3 * g);
    expect(r).toBeGreaterThan(4 * b);
  });

  it('clamps the value to the bar', () => {
    expect(gaugeRgb(-10)).toEqual(gaugeRgb(0));
    expect(gaugeRgb(140)).toEqual(gaugeRgb(100));
    expect(needleX(0)).toBe(0);
    expect(needleX(50)).toBe(BAR_W / 2);
    expect(needleX(100)).toBe(BAR_W);
    expect(needleX(130)).toBe(BAR_W);
  });

  it('keeps the number inside the bar at either end, its near edge on the needle there', () => {
    expect(numberX(0)).toBeGreaterThan(0);
    expect(numberX(100)).toBeLessThan(BAR_W);
    expect(numberX(50)).toBe(needleX(50));
    expect(numberPlace(0)).toEqual({ x: 0, anchor: 'start' });
    expect(numberPlace(100)).toEqual({ x: BAR_W, anchor: 'end' });
    expect(numberPlace(50).anchor).toBe('middle');
    expect(numberEdges(0)[0]).toBe(0);
    expect(numberEdges(100)[1]).toBe(BAR_W);
    for (let d = 0; d <= 100; d++) {
      const [l, r] = numberEdges(d);
      expect(l).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(BAR_W);
    }
  });

  it('floats the delta beside the number, inside the bar, at 0, 4, 96 and 100', () => {
    for (const [d, text] of [
      [0, '−14'],
      [4, '−2'],
      [50, '+9'],
      [96, '+4'],
      [100, '+14'],
    ] as const) {
      const x = deltaX(d, text);
      const half = (text.length * 7.4) / 2;
      expect(x - half).toBeGreaterThanOrEqual(0);
      expect(x + half).toBeLessThanOrEqual(BAR_W);
      const [l, r] = numberEdges(d);
      // Never over the number.
      expect(x - half >= r - 1e-6 || x + half <= l + 1e-6).toBe(true);
    }
    // Under 50 it sits to the right of the number, from 50 to the left.
    expect(deltaX(10, '−5')).toBeGreaterThan(numberX(10));
    expect(deltaX(70, '+5')).toBeLessThan(numberX(70));
  });

  it('writes the delta with a sign, or nothing', () => {
    expect(deltaText(-18)).toBe('−18');
    expect(deltaText(9)).toBe('+9');
    expect(deltaText(0)).toBe('');
  });
});

describe('the endings, in plain English', () => {
  it('names the region and the day for WAR', () => {
    const e = endingLines({ kind: 'WAR', day: 17, danger: 100, region: 'SHL' });
    expect(e.title).toBe('War.');
    expect(e.lines[0]).toContain('Shoal');
    expect(e.lines[0]).toContain('day 17');
    expect(e.lines[1]).toContain('16 days');
    expect(endingLines({ kind: 'WAR', day: 1, danger: 100, region: 'SHL' }).lines[1]).toBe('It was over before it began.');
    expect(endingLines({ kind: 'WAR', day: 2, danger: 100, region: 'SHL' }).lines[1]).toContain('1 day.');
  });

  it('agrees with the final map: a WAR ending names a red region, or none when there is none', () => {
    const war = { kind: 'WAR' as const, day: 21, danger: 100 as const, region: 'ASK' };
    const heats = (h: Record<string, 0 | 1 | 2 | 3>) => h;
    const step = (region: string, to: 0 | 1 | 2 | 3) => ({ kind: 'heat' as const, region, from: 2 as const, to, why: 'spread' as const, danger: 90 });
    const trace = (steps: ReturnType<typeof step>[]) => ({ day: 20, card: 'x', region: null, acted: null, choice: 'left' as const, tag: 'CALM' as const, dangerBefore: 0, dangerAfterChoice: 0, dangerAfter: 0, steps, fired: [], ending: null, offer: null });
    // The tipping region is red: it is named.
    expect(endingLines(war, { heats: heats({ ASK: 3, SHL: 1 }), log: [] }).lines[0]).toContain('began in Ashkettle on day 21');
    // The tipping region is only orange, another is red: the red one is named, the last to turn red first.
    const twoRed = { heats: heats({ ASK: 2, SHL: 3, FRM: 3 }), log: [trace([step('SHL', 3)]), trace([step('FRM', 3)])] };
    expect(endingLines(war, twoRed).lines[0]).toContain('The war in Frostmere could not be contained. On day 21');
    // No red at all: the story does not invent one.
    expect(endingLines(war, { heats: heats({ ASK: 2, SHL: 1 }), log: [] }).lines[0]).toBe('Too many crises at once. On day 21 the world went to war.');
  });

  it('scores a STAND-DOWN by its day and grades a HELD by its danger', () => {
    expect(endingLines({ kind: 'STAND-DOWN', day: 19, danger: 0 }).lines[1]).toContain('19');
    expect(endingLines({ kind: 'HELD', day: 30, danger: 11, clean: true }).title).toBe('You held, cleanly.');
    expect(endingLines({ kind: 'HELD', day: 30, danger: 64, clean: false }).title).toBe('You held.');
    expect(endingLines({ kind: 'HELD', day: 30, danger: 64, clean: false }).lines[0]).toContain('64');
    expect(endingLines({ kind: 'HELD', day: 30, danger: 88, clean: false }).title).toBe('You held, barely.');
    const g = (danger: number) => heldGrade({ danger, clean: danger < 20 });
    expect([g(0), g(19), g(20), g(69), g(70), g(99)]).toEqual(['clean', 'clean', 'held', 'held', 'barely', 'barely']);
  });
});
