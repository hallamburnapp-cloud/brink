/**
 * Runs timed cues against the clock at a playback rate: each cue fires once its time (schedule ms)
 * has passed. Frames drive it; a slow interval keeps cues firing when frames stop (a hidden tab).
 */
export interface TimelineClock {
  now(): number;
  raf(cb: () => void): number;
  cancelRaf(id: number): void;
  setInterval(cb: () => void, ms: number): number;
  clearInterval(id: number): void;
}

export const browserClock: TimelineClock = {
  now: () => performance.now(),
  raf: (cb) => requestAnimationFrame(() => cb()),
  cancelRaf: (id) => cancelAnimationFrame(id),
  setInterval: (cb, ms) => window.setInterval(cb, ms),
  clearInterval: (id) => window.clearInterval(id),
};

export class Timeline<C extends { t: number }> {
  private idx = 0;
  private t0 = 0;
  private raf = 0;
  private timer = 0;
  private done = false;
  private complete = false;
  private resolve: (() => void) | null = null;

  constructor(
    private readonly cues: readonly C[],
    private readonly end: number,
    private readonly exec: (c: C) => void,
    private readonly rate: number,
    private readonly clock: TimelineClock = browserClock,
  ) {}

  start(): Promise<void> {
    this.t0 = this.clock.now();
    return new Promise((res) => {
      this.resolve = res;
      if (this.done) {
        res();
        return;
      }
      this.tick();
      if (!this.done) this.timer = this.clock.setInterval(() => this.tick(), 50);
    });
  }

  /** Real milliseconds since the line started. */
  elapsed(): number {
    return this.clock.now() - this.t0;
  }

  /** Every cue ran and the line reached its end (it was not cut short by finish()). */
  get playedOut(): boolean {
    return this.complete;
  }

  /** Stop now without running the remaining cues. */
  finish(): void {
    if (this.done) return;
    this.done = true;
    this.clock.cancelRaf(this.raf);
    this.clock.clearInterval(this.timer);
    this.resolve?.();
  }

  private tick = (): void => {
    if (this.done) return;
    const el = (this.clock.now() - this.t0) * this.rate;
    while (this.idx < this.cues.length && this.cues[this.idx].t <= el) {
      const c = this.cues[this.idx++];
      try {
        this.exec(c);
      } catch (e) {
        console.error('[war] cue failed', c, e);
      }
      if (this.done) return;
    }
    if (this.idx >= this.cues.length && el >= this.end) {
      this.complete = true;
      this.finish();
      return;
    }
    this.clock.cancelRaf(this.raf);
    this.raf = this.clock.raf(this.tick);
  };
}
