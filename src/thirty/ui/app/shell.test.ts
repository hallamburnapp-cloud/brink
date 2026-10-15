import { describe, expect, it } from 'vitest';
import { backStep, guardStep } from './back';
import { fitFrame, FRAME_H, FRAME_W, R } from './layout';
import { applySteps, heatSteps, rollOf, splitDay } from './steps';

describe('the four rects', () => {
  it('stack top to bottom without overlap, as the spec draws them', () => {
    expect(R.strip).toEqual([0, 47, 390, 56]);
    expect(R.map).toEqual([0, 103, 390, 400]);
    expect(R.team).toEqual([0, 507, 390, 40]);
    expect(R.card).toEqual([0, 551, 390, 256]);
    expect(R.strip[1] + R.strip[3]).toBeLessThanOrEqual(R.map[1]);
    expect(R.map[1] + R.map[3]).toBeLessThanOrEqual(R.team[1]);
    expect(R.team[1] + R.team[3]).toBeLessThanOrEqual(R.card[1]);
    expect(R.card[1] + R.card[3]).toBeLessThanOrEqual(R.home[1]);
  });
});

describe('fitting the frame', () => {
  it('fits the whole frame on a tall phone with no insets', () => {
    const f = fitFrame(390, 844);
    expect(f.scale).toBeCloseTo(1);
    expect(f.left).toBeCloseTo(0);
    expect(f.top).toBeCloseTo(0);
  });

  it('letterboxes a wide window, centred', () => {
    const f = fitFrame(1200, 844, undefined, 'device');
    expect(f.scale).toBeCloseTo(1);
    expect(f.left).toBeCloseTo((1200 - FRAME_W) / 2);
  });

  it('keeps the live area clear of large insets', () => {
    const insets = { top: 59, bottom: 34, left: 0, right: 0 };
    const f = fitFrame(390, 844, insets, 'device');
    expect(f.top + R.safeTop[3] * f.scale).toBeGreaterThanOrEqual(insets.top - 1e-6);
    expect(f.top + (FRAME_H - R.home[3]) * f.scale).toBeLessThanOrEqual(844 - insets.bottom + 1e-6);
  });

  it('fits only the live area in a phone browser and on a desk', () => {
    const live = FRAME_H - R.safeTop[3] - R.home[3];
    const b = fitFrame(390, live, undefined, 'browser');
    expect(b.scale).toBeCloseTo(1);
    expect(b.top).toBeCloseTo(-R.safeTop[3]);
    const d = fitFrame(1000, 900, undefined, 'desk');
    expect(d.scale).toBeLessThan(1000 / FRAME_W);
    expect(d.scale * live).toBeLessThanOrEqual(900);
  });
});

describe('the back button', () => {
  const base = { screen: 'game' as const, sheetOpen: false, explaining: false, chipOpen: false };

  it('opens the menu in a game, and closes what is open first', () => {
    expect(backStep(base)).toBe('menu');
    expect(backStep({ ...base, sheetOpen: true })).toBe('close-sheet');
    expect(backStep({ ...base, chipOpen: true })).toBe('close-chip');
    expect(backStep({ ...base, explaining: true })).toBe('skip-explain');
  });

  it('leaves from the bare title, but closes a sheet over it', () => {
    expect(backStep({ ...base, screen: 'title' })).toBe('leave');
    expect(backStep({ ...base, screen: 'title', sheetOpen: true })).toBe('close-sheet');
  });

  it('never navigates to let go of its entry: it releases it, and takes it up again', () => {
    expect(guardStep({ want: true, guarded: false, onOurEntry: false })).toBe('push');
    expect(guardStep({ want: false, guarded: true, onOurEntry: true })).toBe('release');
    expect(guardStep({ want: true, guarded: false, onOurEntry: true })).toBe('adopt');
    expect(guardStep({ want: true, guarded: true, onOurEntry: true })).toBeNull();
    expect(guardStep({ want: false, guarded: false, onOurEntry: true })).toBeNull();
  });
});

describe('reading the trace for the playback', () => {
  const steps = [
    { kind: 'danger' as const, at: 'start' as const, danger: 11 },
    { kind: 'heat' as const, region: 'SHL', from: 2 as const, to: 1 as const, why: 'choice' as const, danger: 8 },
    { kind: 'roll' as const, odds: 65, roll: 0.3, held: true, text: 'Held' },
    { kind: 'heat' as const, region: 'LTL', from: 0 as const, to: 1 as const, why: 'spread' as const, source: 'SHL', danger: 10 },
    { kind: 'piece' as const, piece: 'hotline', note: 'x' },
  ];

  it('keeps only the heat steps, in order, with their source', () => {
    expect(heatSteps(steps)).toEqual([
      { region: 'SHL', from: 2, to: 1, source: null },
      { region: 'LTL', from: 0, to: 1, source: 'SHL' },
    ]);
  });

  it('applies the steps to a map without changing the original', () => {
    const heats = { SHL: 2 as const, LTL: 0 as const, VSY: 0 as const };
    const after = applySteps(heats, heatSteps(steps));
    expect(after).toEqual({ SHL: 1, LTL: 1, VSY: 0 });
    expect(heats.SHL).toBe(2);
  });

  it('finds the roll, if there was one', () => {
    expect(rollOf({ steps })).toEqual({ text: 'Held', held: true });
    expect(rollOf({ steps: steps.filter((s) => s.kind !== 'roll') })).toBeNull();
  });

  it('splits the day at the choice checkpoint: the choice first, the night after', () => {
    const day = [steps[0], steps[1], steps[2], { kind: 'danger' as const, at: 'choice' as const, danger: 8 }, steps[3], { kind: 'danger' as const, at: 'pressure' as const, danger: 10 }];
    expect(splitDay(day)).toEqual({
      choice: [{ region: 'SHL', from: 2, to: 1, source: null }],
      night: [{ region: 'LTL', from: 0, to: 1, source: 'SHL' }],
    });
    // Without a checkpoint everything is the choice's.
    expect(splitDay(steps)).toEqual({ choice: heatSteps(steps), night: [] });
  });
});
