/**
 * Heartbeat: a scheduled low double-thump (lub-dub) at a given BPM.
 *
 * Two sources ask for a tempo and share one scheduler: the timer heartbeat
 * (accelerates as the clock runs out) and the escalation pulse (runs continuously
 * above 80). Each keeps its own request, so releasing one never stops the other;
 * while both are set the faster tempo plays.
 *
 * Uses a lookahead scheduler: a single setTimeout (~100 ms) wakes up and queues
 * every beat that falls inside the next LOOKAHEAD seconds at exact AudioContext
 * times. Changing the tempo re-times the next beat in place, so acceleration is
 * seamless, and stopping fades any already-queued beats.
 */
import { clamp01, type Engine } from './engine';
import { Voice, glide, pluck } from './voice';

const LOOKAHEAD = 0.3;
const INTERVAL_MS = 100;
const MIN_BPM = 20;
const MAX_BPM = 240;

export type HeartSource = 'timer' | 'pulse';

export class Heartbeat {
  /** What each source currently asks for; null when it has released its claim. */
  private readonly wanted: Record<HeartSource, number | null> = { timer: null, pulse: null };
  /** The tempo actually running (the fastest request), null when idle. */
  private bpm: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private nextBeat = 0;
  private lastBeat = 0;
  private live: Voice[] = [];

  constructor(
    private readonly engine: () => Engine | null,
    private readonly muted: () => boolean,
  ) {}

  /** Timer heartbeat tempo; null (or a non-positive value) releases the timer's claim. */
  set(bpm: number | null): void {
    this.request('timer', bpm);
  }

  /** Escalation pulse tempo; null (or a non-positive value) releases the pulse's claim. */
  pulse(bpm: number | null): void {
    this.request('pulse', bpm);
  }

  /** Records one source's request and re-targets the shared scheduler to the fastest one. */
  request(source: HeartSource, bpm: number | null): void {
    this.wanted[source] =
      bpm === null || !Number.isFinite(bpm) || bpm <= 0 ? null : Math.min(MAX_BPM, Math.max(MIN_BPM, bpm));
    const next = fastest(this.wanted);
    if (next === null) {
      this.halt();
      return;
    }
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

  /** Called when the engine becomes available after a request came in early. */
  resume(): void {
    const eng = this.engine();
    if (eng && this.bpm !== null && this.timer === null) this.start(eng);
  }

  /** Releases both sources and stops. */
  stop(): void {
    this.wanted.timer = null;
    this.wanted.pulse = null;
    this.halt();
  }

  private halt(): void {
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

/** The fastest requested tempo, or null when nobody wants a beat. */
function fastest(wanted: Record<HeartSource, number | null>): number | null {
  let best: number | null = null;
  for (const bpm of Object.values(wanted)) {
    if (bpm !== null && (best === null || bpm > best)) best = bpm;
  }
  return best;
}

function thump(v: Voice, at: number, peak: number, f0: number, f1: number): void {
  const out = v.gain(0);
  const o = v.osc('sine', f0, out);
  glide(o.frequency, at, f0, f1, 0.09);
  const end = pluck(out.gain, at, peak, 0.004, 0.06);
  v.play(o, at, end);
}
