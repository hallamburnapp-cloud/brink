/**
 * The finger on the sheet (SPEC-SMALL "Act"): press and hold a place for HOLD_MS to put down the
 * slip (PROMISE TO DEFEND, or WITHDRAW); tap a counter to pick it up, then tap a place to move it.
 * The state machine is here with the timer injected, so it has tests; the pointer events are the
 * screen's.
 */
export const HOLD_MS = 450;
/** A finger that drifts further than this is not holding. */
export const SLOP_PX = 12;

export interface GestureHooks<R, P> {
  /** The region under a frame point, or null. */
  hit(x: number, y: number): R | null;
  /** The counter under a frame point, or null. */
  counterAt(x: number, y: number): P | null;
  /** The finger has come down on a place: lift it in graphite. */
  onHoldStart(region: R): void;
  /** The finger has lifted or drifted: the place goes back down. */
  onHoldEnd(): void;
  /** Held long enough: the slip. */
  onHold(region: R): void;
  /** A plain tap: on a counter, on a place, or on nothing. */
  onTap(region: R | null, counter: P | null): void;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(id: unknown): void;
}

export class HoldGesture<R, P> {
  private timer: unknown = null;
  private start: { x: number; y: number; region: R | null; counter: P | null } | null = null;
  private fired = false;

  constructor(private hooks: GestureHooks<R, P>) {}

  get active(): boolean {
    return this.start !== null;
  }

  down(x: number, y: number): void {
    this.cancel();
    const counter = this.hooks.counterAt(x, y);
    const region = counter ? null : this.hooks.hit(x, y);
    this.start = { x, y, region, counter };
    this.fired = false;
    if (region) {
      this.hooks.onHoldStart(region);
      this.timer = this.hooks.setTimer(() => {
        this.timer = null;
        if (!this.start) return;
        this.fired = true;
        this.hooks.onHoldEnd();
        this.hooks.onHold(region);
      }, HOLD_MS);
    }
  }

  move(x: number, y: number): void {
    if (!this.start || this.fired) return;
    if (Math.hypot(x - this.start.x, y - this.start.y) > SLOP_PX) {
      this.stopTimer();
      if (this.start.region) this.hooks.onHoldEnd();
      this.start = null;
    }
  }

  up(): void {
    if (!this.start) return;
    const { region, counter } = this.start;
    const fired = this.fired;
    this.stopTimer();
    this.start = null;
    if (fired) return;
    if (region) this.hooks.onHoldEnd();
    this.hooks.onTap(region, counter);
  }

  /** The finger left the frame, or something else took over. */
  cancel(): void {
    if (!this.start) return;
    this.stopTimer();
    if (this.start.region && !this.fired) this.hooks.onHoldEnd();
    this.start = null;
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      this.hooks.clearTimer(this.timer);
      this.timer = null;
    }
  }
}
