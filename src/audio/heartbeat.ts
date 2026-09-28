/**
 * Timer heartbeat: a scheduled low double-thump (lub-dub) at a given BPM.
 *
 * Uses a lookahead scheduler: a single setTimeout (~100 ms) wakes up and queues
 * every beat that falls inside the next LOOKAHEAD seconds at exact AudioContext
 * times. Changing the BPM re-times the next beat in place, so acceleration is
 * seamless, and stopping fades any already-queued beats.
 */
import { clamp01, type Engine } from './engine';
import { Voice, glide, pluck } from './voice';

const LOOKAHEAD = 0.3;
const INTERVAL_MS = 100;
const MIN_BPM = 20;
const MAX_BPM = 240;

export class Heartbeat {
  private bpm: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private nextBeat = 0;
  private lastBeat = 0;
  private live: Voice[] = [];

  constructor(
    private readonly engine: () => Engine | null,
    private readonly muted: () => boolean,
  ) {}

  /** Sets the tempo; null (or a non-positive value) stops the heartbeat. */
  set(bpm: number | null): void {
    if (bpm === null || !Number.isFinite(bpm) || bpm <= 0) {
      this.stop();
      return;
    }
    const next = Math.min(MAX_BPM, Math.max(MIN_BPM, bpm));
    const wasRunning = this.bpm !== null && this.timer !== null;
    this.bpm = next;
    const eng = this.engine();
    if (!eng) return; // resume() starts it once the context exists
    if (!wasRunning) {
      this.start(eng);
      return;
    }
    // Re-time in place: the next beat lands no later than one new period after the last.
    const now = eng.ctx.currentTime;
    const period = 60 / next;
    this.nextBeat = Math.max(now + 0.02, Math.min(this.nextBeat, this.lastBeat + period));
  }

  /** Called when the engine becomes available after set() was called early. */
  resume(): void {
    const eng = this.engine();
    if (eng && this.bpm !== null && this.timer === null) this.start(eng);
  }

  stop(): void {
    this.bpm = null;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const eng = this.engine();
    if (eng) {
      const now = eng.ctx.currentTime;
      for (const v of this.live) if (v.end > now) v.kill(now);
    }
    this.live = [];
  }

  private start(eng: Engine): void {
    if (this.timer !== null) clearTimeout(this.timer);
    const period = 60 / (this.bpm ?? 60);
    this.nextBeat = eng.ctx.currentTime + 0.05;
    this.lastBeat = this.nextBeat - period;
    this.tick(eng);
  }

  private tick(eng: Engine): void {
    this.timer = null;
    if (this.bpm === null) return;
    const period = 60 / this.bpm;
    const now = eng.ctx.currentTime;
    // Fell far behind (throttled tab)? Skip ahead rather than fire a burst.
    if (this.nextBeat < now - period) this.nextBeat = now + 0.02;
    while (this.nextBeat < now + LOOKAHEAD) {
      if (!this.muted()) this.beat(eng, this.nextBeat, this.bpm);
      this.lastBeat = this.nextBeat;
      this.nextBeat += period;
    }
    this.live = this.live.filter((v) => v.end > now);
    this.timer = setTimeout(() => this.tick(eng), INTERVAL_MS);
  }

  private beat(eng: Engine, at: number, bpm: number): void {
    const v = new Voice(eng, at);
    const urgency = clamp01((bpm - 60) / 120);
    const peak = 0.2 + 0.1 * urgency;
    const gap = Math.min(0.17, (60 / bpm) * 0.32);
    thump(v, at, peak, 64, 42);
    thump(v, at + gap, peak * 0.72, 72, 46);
    v.finish();
    this.live.push(v);
  }
}

function thump(v: Voice, at: number, peak: number, f0: number, f1: number): void {
  const out = v.gain(0);
  const o = v.osc('sine', f0, out);
  glide(o.frequency, at, f0, f1, 0.09);
  const end = pluck(out.gain, at, peak, 0.004, 0.06);
  v.play(o, at, end);
}
