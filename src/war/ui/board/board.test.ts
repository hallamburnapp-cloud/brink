import { describe, expect, it } from 'vitest';
import { segments, warDanger } from './bars';
import { flipPath } from './flip';
import { rollSteps } from './odometer';

describe('the goal bars', () => {
  it('fills from the left', () => {
    expect(segments(5, 2, null)).toEqual(['on', 'on', 'off', 'off', 'off']);
    expect(segments(3, 0, null)).toEqual(['off', 'off', 'off']);
    expect(segments(3, 9, null)).toEqual(['on', 'on', 'on']);
  });

  it('ghosts what the pins would win, and what a miss would hand to war', () => {
    // GOLD 1 -> 3 (WINS 2): two ghost segments after the filled one.
    expect(segments(6, 1, 3)).toEqual(['on', 'gain', 'gain', 'off', 'off', 'off']);
    // WAR 3 -> 4 on a miss: the next segment is a ghost.
    expect(segments(5, 3, 4)).toEqual(['on', 'on', 'on', 'gain', 'off']);
  });

  it('marks the red a win would take back', () => {
    expect(segments(5, 4, 2)).toEqual(['on', 'on', 'loss', 'loss', 'off']);
  });

  it('pulses at 8 and 9 of 10, not before or at the end', () => {
    expect([7, 8, 9, 10].map((r) => warDanger(r, 10))).toEqual([false, true, true, false]);
  });
});

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
});

describe('the odometer', () => {
  it('rolls up in steps that stay between the old and the new value, ending on the new one', () => {
    const steps = rollSteps(180n, 452n, 400);
    expect(steps.at(-1)).toEqual({ at: 400, value: 452n, text: '452' });
    const v = steps.map((s) => s.value);
    for (let i = 0; i < v.length; i++) {
      expect(v[i] > 180n && v[i] <= 452n).toBe(true);
      if (i) expect(v[i] > v[i - 1]).toBe(true);
    }
    for (let i = 1; i < steps.length; i++) expect(steps[i].at).toBeGreaterThan(steps[i - 1].at);
  });

  it('never shows the same text twice, and lands at once when there is nothing to roll', () => {
    const texts = rollSteps(0n, 10_559_856_944n, 540).map((s) => s.text);
    expect(new Set(texts).size).toBe(texts.length);
    expect(texts.at(-1)).toBe('10.6B');
    expect(rollSteps(300n, 300n, 400)).toEqual([{ at: 400, value: 300n, text: '300' }]);
  });
});
