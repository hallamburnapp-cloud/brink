import { describe, expect, it } from 'vitest';
import { backStep, guardStep } from './back';
import { DESK_MARGIN, fitFrame, FRAME_H, FRAME_W, toFramePoint } from './layout';

describe('fitting the frame', () => {
  it('fits the whole frame on the spec phone with no insets', () => {
    const f = fitFrame(390, 844);
    expect(f.scale).toBeCloseTo(1);
    expect(f.left).toBeCloseTo(0);
    expect(f.top).toBeCloseTo(0);
  });

  it('letterboxes a wide window, centred, and keeps a margin of desk on a desktop', () => {
    const f = fitFrame(1200, 844);
    expect(f.scale).toBeCloseTo(1);
    expect(f.left).toBeCloseTo((1200 - FRAME_W) / 2);
    const d = fitFrame(1000, 900, undefined, 'desk');
    expect(d.scale * FRAME_H).toBeLessThanOrEqual(900 - 2 * DESK_MARGIN + 1e-6);
    expect(d.top).toBeGreaterThanOrEqual(DESK_MARGIN - 1e-6);
  });

  it('keeps the whole sheet clear of the device insets (the calendar and the tape are at the edges)', () => {
    const insets = { top: 59, bottom: 34, left: 0, right: 0 };
    const f = fitFrame(390, 844, insets);
    expect(f.top).toBeGreaterThanOrEqual(insets.top - 1e-6);
    expect(f.top + FRAME_H * f.scale).toBeLessThanOrEqual(844 - insets.bottom + 1e-6);
  });

  it('maps a window point back to frame px', () => {
    const p = toFramePoint(110, 220, { scale: 0.5, left: 10, top: 20 });
    expect(p).toEqual({ x: 200, y: 400 });
  });
});

describe('the back button', () => {
  const base = { screen: 'game' as const, sheetOpen: false, explaining: false, acting: false, playing: false };

  it('opens the menu in a game, and closes what is open first', () => {
    expect(backStep(base)).toBe('menu');
    expect(backStep({ ...base, sheetOpen: true })).toBe('close-sheet');
    expect(backStep({ ...base, acting: true })).toBe('cancel-act');
    expect(backStep({ ...base, playing: true })).toBe('skip-playback');
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
