import { describe, expect, it } from 'vitest';
import { flipPath } from './flip';
import { layoutOf, rollSteps } from './odometer';

describe('split-flap paths', () => {
  it('counts a digit up through the digits between, never past it', () => {
    expect(flipPath('1', '4', 3)).toEqual(['2', '3', '4']);
    expect(flipPath('1', '9', 3)).toEqual(['4', '6', '9']);
    expect(flipPath('1', '2', 3)).toEqual(['2']);
    expect(flipPath('4', '4', 3)).toEqual([]);
  });

  it('flips straight to the new character when it falls, starts blank or is a letter', () => {
    expect(flipPath('7', '2', 3)).toEqual(['2']);
    expect(flipPath(' ', '8', 3)).toEqual(['8']);
    expect(flipPath('3', ' ', 3)).toEqual([' ']);
    expect(flipPath('2', 'B', 3)).toEqual(['B']);
  });

  it('steps a unit up the K, M, B, T ladder', () => {
    expect(flipPath('K', 'B', 3)).toEqual(['M', 'B']);
    expect(flipPath('B', 'M', 3)).toEqual(['M']);
  });
});

describe('the Big Board odometer', () => {
  const values = (from: bigint, to: bigint, ms: number) => rollSteps(from, to, ms).map((s) => s.value);

  it('rolls up in steps that stay between the old and the new total, ending on the new one', () => {
    const steps = rollSteps(180n, 452n, 400);
    expect(steps.at(-1)).toEqual({ at: 400, value: 452n, text: '452' });
    const v = steps.map((s) => s.value);
    for (let i = 0; i < v.length; i++) {
      expect(v[i] > 180n && v[i] <= 452n).toBe(true);
      if (i) expect(v[i] > v[i - 1]).toBe(true);
    }
    expect(steps.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < steps.length; i++) expect(steps[i].at).toBeGreaterThan(steps[i - 1].at);
  });

  it('never shows the same text twice or a unit past the final one', () => {
    const steps = rollSteps(0n, 10_559_856_944n, 540);
    const texts = steps.map((s) => s.text);
    expect(new Set(texts).size).toBe(texts.length);
    expect(texts.at(-1)).toBe('10.6B');
    for (const t of texts) expect(/[T]|e/.test(t)).toBe(false);
    expect(values(0n, 10_559_856_944n, 540).every((v) => v <= 10_559_856_944n)).toBe(true);
  });

  it('lands at once when there is nothing to roll', () => {
    expect(rollSteps(300n, 300n, 400)).toEqual([{ at: 400, value: 300n, text: '300' }]);
    expect(rollSteps(0n, 5n, 0)).toEqual([{ at: 0, value: 5n, text: '5' }]);
  });
});

describe('the board total row', () => {
  it('knows when a number changes scale, so tiles never mix place values', () => {
    expect(layoutOf('180')).toBe('0');
    expect(layoutOf('1,350')).toBe('0');
    expect(layoutOf('5.80B')).toBe('B2');
    expect(layoutOf('9.71B')).toBe('B2');
    expect(layoutOf('10.2B')).toBe('B1');
    expect(layoutOf('600M')).toBe('M0');
    // The same layout: a right-to-left cascade only ever shows less than the new value.
    expect(layoutOf('90')).toBe(layoutOf('130'));
    expect(layoutOf('9.71B')).not.toBe(layoutOf('10.2B'));
  });
});
