import { describe, expect, it } from 'vitest';
import { BAR_W, deltaText, gaugeRgb, needleX, numberX } from './gauge';
import { endingLines } from './endings';

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

  it('keeps the number inside the bar at either end', () => {
    expect(numberX(0)).toBeGreaterThan(0);
    expect(numberX(100)).toBeLessThan(BAR_W);
    expect(numberX(50)).toBe(needleX(50));
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

  it('scores a STAND-DOWN by its day and grades a HELD by its danger', () => {
    expect(endingLines({ kind: 'STAND-DOWN', day: 19, danger: 0 }).lines[1]).toContain('19');
    expect(endingLines({ kind: 'HELD', day: 30, danger: 11, clean: true }).title).toBe('You held, cleanly.');
    expect(endingLines({ kind: 'HELD', day: 30, danger: 64, clean: false }).title).toBe('You held.');
    expect(endingLines({ kind: 'HELD', day: 30, danger: 64, clean: false }).lines[0]).toContain('64');
  });
});
