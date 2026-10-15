import { describe, expect, it, vi } from 'vitest';
import { Timeline, type TimelineClock } from './timeline';

/** A clock the test moves by hand: frames run when the test steps time. */
function fakeClock() {
  let now = 0;
  let frames: Array<() => void> = [];
  let intervals: Array<{ cb: () => void; ms: number; next: number; id: number }> = [];
  let id = 1;
  const clock: TimelineClock = {
    now: () => now,
    raf(cb) {
      frames.push(cb);
      return id++;
    },
    cancelRaf() {},
    setInterval(cb, ms) {
      intervals.push({ cb, ms, next: now + ms, id });
      return id++;
    },
    clearInterval(which) {
      intervals = intervals.filter((i) => i.id !== which);
    },
  };
  /** Advance `ms` in 16 ms frames. */
  const step = (ms: number) => {
    for (let t = 0; t < ms; t += 16) {
      now += 16;
      const due = frames;
      frames = [];
      due.forEach((f) => f());
      for (const i of intervals) if (now >= i.next) {
        i.next += i.ms;
        i.cb();
      }
    }
  };
  return { clock, step };
}

const cues = [
  { t: 0, n: 'a' },
  { t: 100, n: 'b' },
  { t: 400, n: 'c' },
];

describe('Timeline', () => {
  it('fires each cue once its time has passed, then resolves as played out', async () => {
    const { clock, step } = fakeClock();
    const fired: string[] = [];
    const line = new Timeline(cues, 500, (c) => fired.push(c.n), 1, clock);
    const done = line.start();
    expect(fired).toEqual(['a']);
    step(120);
    expect(fired).toEqual(['a', 'b']);
    step(400);
    await done;
    expect(fired).toEqual(['a', 'b', 'c']);
    expect(line.playedOut).toBe(true);
  });

  it('runs at the playback rate: 4x plays a 500 ms line in 125 ms', async () => {
    const { clock, step } = fakeClock();
    const fired: string[] = [];
    const line = new Timeline(cues, 500, (c) => fired.push(c.n), 4, clock);
    const done = line.start();
    step(112);
    expect(fired).toEqual(['a', 'b', 'c']);
    step(32);
    await done;
    expect(line.playedOut).toBe(true);
  });

  it('stops dead on finish(): the rest never fire and it is not played out', async () => {
    const { clock, step } = fakeClock();
    const fired: string[] = [];
    const line = new Timeline(cues, 500, (c) => fired.push(c.n), 1, clock);
    const done = line.start();
    step(150);
    line.finish();
    await done;
    step(600);
    expect(fired).toEqual(['a', 'b']);
    expect(line.playedOut).toBe(false);
  });

  it('keeps going when a cue throws', async () => {
    const { clock, step } = fakeClock();
    const fired: string[] = [];
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const line = new Timeline(cues, 450, (c) => {
      if (c.n === 'b') throw new Error('boom');
      fired.push(c.n);
    }, 1, clock);
    const done = line.start();
    step(500);
    await done;
    quiet.mockRestore();
    expect(fired).toEqual(['a', 'c']);
  });
});
