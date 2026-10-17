import { describe, expect, it } from 'vitest';
import { ALL_OUT, FIGHTING, MASSING, PUSHING, RULES, TESTING, clampStep, fallWeeksAt, pushesAt, scoreOf, spreadAt } from './rules.ts';

describe('the numbers the spec fixes', () => {
  it('eight weeks, three promises, eight ticks', () => {
    expect(RULES.weeks).toBe(8);
    expect(RULES.maxPromises).toBe(3);
    expect(RULES.warLimit).toBe(8);
  });
  it('the TREATY bar moves exactly as the spec says', () => {
    expect(RULES.willQuiet).toBe(5);
    expect(RULES.willWayOut).toBe(15);
    expect(RULES.willBloc).toBe(10);
    expect(RULES.maxBlocs).toBe(2);
    expect(RULES.willPerGain).toBe(5);
    expect(RULES.willHumiliated).toBe(10);
    expect(RULES.willSign).toBe(100);
  });
  it('the ladder: accidents one in twenty from MASSING', () => {
    expect(RULES.accidentChance).toBeCloseTo(1 / 20);
    expect(RULES.accidentFrom).toBe(MASSING);
  });
  it('the fall clock: 3 at TESTING, 2 at PUSHING, 1 from MASSING', () => {
    expect(fallWeeksAt(TESTING)).toBe(3);
    expect(fallWeeksAt(PUSHING)).toBe(2);
    expect(fallWeeksAt(MASSING)).toBe(1);
    expect(fallWeeksAt(FIGHTING)).toBe(1);
    expect(fallWeeksAt(ALL_OUT)).toBe(1);
  });
  it('backing: 12, 6 once believed, 24 from too far, one failure in three', () => {
    expect(RULES.backCost).toBe(12);
    expect(RULES.backCostBelieved).toBe(6);
    expect(RULES.believedAt).toBe(60);
    expect(RULES.backFarCost).toBe(24);
    expect(RULES.farFail).toBeCloseTo(1 / 3);
  });
  it('a way out costs 10 to 25', () => {
    for (const price of Object.values(RULES.wayOutPrice)) {
      expect(price).toBeGreaterThanOrEqual(10);
      expect(price).toBeLessThanOrEqual(25);
    }
  });
  it('influence: 30 to start, 8 a week, 1 per promise', () => {
    expect(RULES.influenceStart).toBe(30);
    expect(RULES.income).toBe(8);
    expect(RULES.upkeep).toBe(1);
  });
});

describe('scoreOf', () => {
  it('treaty: 100 − 10w − 5f, never below 10', () => {
    expect(scoreOf({ kind: 'treaty', week: 6, fighting: 1 })).toBe(35);
    expect(scoreOf({ kind: 'treaty', week: 3, fighting: 0 })).toBe(70);
    expect(scoreOf({ kind: 'treaty', week: 8, fighting: 11 })).toBe(10);
  });
  it('frozen: 9 − f, never below 1', () => {
    expect(scoreOf({ kind: 'frozen', week: 8, fighting: 0 })).toBe(9);
    expect(scoreOf({ kind: 'frozen', week: 8, fighting: 3 })).toBe(6);
    expect(scoreOf({ kind: 'frozen', week: 8, fighting: 11 })).toBe(1);
  });
  it('war: 0', () => {
    expect(scoreOf({ kind: 'war', week: 5, fighting: 12 })).toBe(0);
  });
  it('every frozen score is below every treaty score', () => {
    expect(scoreOf({ kind: 'frozen', week: 8, fighting: 0 })).toBeLessThan(scoreOf({ kind: 'treaty', week: 8, fighting: 11 }));
  });
});

describe('the ladder helpers', () => {
  it('clamps to the five words', () => {
    expect(clampStep(0)).toBe(1);
    expect(clampStep(6)).toBe(5);
    expect(clampStep(3)).toBe(3);
  });
  it('pushes and spread grow with the step', () => {
    expect(pushesAt(TESTING)).toBe(1);
    expect(pushesAt(ALL_OUT)).toBe(2);
    expect(spreadAt(TESTING)).toBe(0);
    expect(spreadAt(FIGHTING)).toBeGreaterThan(0);
    expect(spreadAt(ALL_OUT)).toBeGreaterThan(spreadAt(FIGHTING));
  });
});
