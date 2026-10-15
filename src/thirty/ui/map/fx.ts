/**
 * The map's effect timeline: the day's heat changes as data with a start time and a duration.
 * The controller schedules them; the painter asks where each one is at time `now`. No DOM here.
 */
import type { Heat, HeatStep, RegionId } from './contract';

export interface Transition extends HeatStep {
  start: number;
  dur: number;
  /** Set once the transition has begun (any earlier one on the same region settles then). */
  begun: boolean;
}

interface Waiter {
  end: number;
  resolve: () => void;
}

export function progress(t: { start: number; dur: number }, now: number): number {
  if (t.dur <= 0) return 1;
  const p = (now - t.start) / t.dur;
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

/**
 * How a run of steps is spread over `ms`: each step's own change takes `dur`, and the steps begin
 * one after another so the last one ends at `ms`. One step takes the whole time.
 */
export function schedule(count: number, ms: number): Array<{ offset: number; dur: number }> {
  if (count <= 0) return [];
  if (count === 1) return [{ offset: 0, dur: ms }];
  const dur = Math.max(200, Math.min(380, ms * 0.6));
  const gap = (ms - dur) / (count - 1);
  return Array.from({ length: count }, (_, i) => ({ offset: i * gap, dur }));
}

export class FxState {
  transitions: Transition[] = [];
  private waiters: Waiter[] = [];

  /** A promise that resolves at `end` (or on reset). */
  wait(end: number): Promise<void> {
    return new Promise((resolve) => this.waiters.push({ end, resolve }));
  }

  /**
   * Begin due transitions, settle finished ones into `settled`, resolve due promises. Returns true
   * while anything still runs.
   */
  prune(now: number, settled: Record<RegionId, Heat>): boolean {
    for (const t of this.transitions) {
      if (t.begun || now < t.start) continue;
      t.begun = true;
      // An earlier change on the same region gives way: its result is where this one starts from.
      for (const o of this.transitions) if (o !== t && o.begun && o.region === t.region) o.dur = 0;
    }
    const keep: Transition[] = [];
    for (const t of this.transitions) {
      if (t.begun && now >= t.start + t.dur) settled[t.region] = t.to;
      else keep.push(t);
    }
    this.transitions = keep;
    const due = this.waiters.filter((w) => now >= w.end);
    if (due.length) {
      this.waiters = this.waiters.filter((w) => now < w.end);
      for (const w of due) w.resolve();
    }
    return this.transitions.length > 0 || this.waiters.length > 0;
  }

  /** A change is scheduled or running on this region. */
  pending(region: RegionId): Transition | undefined {
    return this.transitions.find((t) => t.region === region);
  }

  /** The heat a region shows outside any running change: its last scheduled change's start, or `settled`. */
  baseHeat(region: RegionId, settled: Readonly<Record<RegionId, Heat>>): Heat {
    const waiting = this.transitions.filter((t) => t.region === region && !t.begun);
    if (waiting.length) return waiting[0].from;
    return settled[region];
  }

  /** Cancel everything, settle it where it was going, resolve every pending promise. */
  reset(settled: Record<RegionId, Heat>): void {
    for (const t of this.transitions) settled[t.region] = t.to;
    this.transitions = [];
    const waiters = this.waiters;
    this.waiters = [];
    for (const w of waiters) w.resolve();
  }
}
