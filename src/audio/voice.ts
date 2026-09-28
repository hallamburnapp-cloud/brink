/**
 * A `Voice` is one self-cleaning cluster of Web Audio nodes: oscillators,
 * noise sources, filters and gain envelopes that together make one sound.
 *
 * Recipes build nodes through the helpers below so that every node is tracked.
 * `finish()` hooks the last-ending source's `onended` to disconnect the whole
 * cluster, so one-shots never leak. `kill()` fades a voice out early (used by
 * the heartbeat scheduler when it is stopped with beats already queued).
 */
import type { Engine } from './engine';

interface Scheduled {
  readonly src: AudioScheduledSourceNode;
  readonly until: number;
}

export class Voice {
  private readonly nodes: AudioNode[] = [];
  private readonly scheduled: Scheduled[] = [];
  /** Gains connected straight to the bus — the points `kill()` fades. */
  private readonly outs: GainNode[] = [];
  private disposed = false;
  private endTime: number;

  constructor(
    readonly eng: Engine,
    /** Reference start time (already a hair in the future). */
    readonly t0: number,
  ) {
    this.endTime = t0;
  }

  get ctx(): AudioContext {
    return this.eng.ctx;
  }

  /** When the last scheduled source stops. */
  get end(): number {
    return this.endTime;
  }

  track<T extends AudioNode>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  /**
   * A gain node. Connects to `to` (a node, or an AudioParam for modulation),
   * or straight to the engine bus when omitted.
   */
  gain(value = 1, to?: AudioNode | AudioParam): GainNode {
    const g = this.track(this.ctx.createGain());
    g.gain.value = value;
    if (!to) {
      g.connect(this.eng.bus);
      this.outs.push(g);
    } else if (isParam(to)) {
      g.connect(to); // modulation: the gain's output is summed into the param
    } else {
      g.connect(to);
    }
    return g;
  }

  osc(type: OscillatorType, frequency: number, to: AudioNode, detune = 0): OscillatorNode {
    const o = this.track(this.ctx.createOscillator());
    o.type = type;
    o.frequency.value = frequency;
    if (detune) o.detune.value = detune;
    o.connect(to);
    return o;
  }

  /** Looping white noise, started from a pseudo-random offset so bursts never sound identical. */
  noise(to: AudioNode): AudioBufferSourceNode {
    const n = this.track(this.ctx.createBufferSource());
    n.buffer = this.eng.noise;
    n.loop = true;
    n.connect(to);
    return n;
  }

  filter(type: BiquadFilterType, frequency: number, q: number, to: AudioNode): BiquadFilterNode {
    const f = this.track(this.ctx.createBiquadFilter());
    f.type = type;
    f.frequency.value = frequency;
    f.Q.value = q;
    f.connect(to);
    return f;
  }

  /** Starts a source at `at` and stops it at `until`, remembering it for cleanup. */
  play(src: AudioScheduledSourceNode, at: number, until: number): void {
    const stopAt = Math.max(until, at + 0.005);
    const buffer = (src as Partial<AudioBufferSourceNode>).buffer;
    if (buffer) {
      // Looping noise: start somewhere inside the buffer so bursts never repeat verbatim.
      const span = Math.max(0.1, buffer.duration - 0.5);
      (src as AudioBufferSourceNode).start(at, (this.scheduled.length * 0.731 + this.t0) % span);
    } else {
      src.start(at);
    }
    src.stop(stopAt);
    this.scheduled.push({ src, until: stopAt });
    if (stopAt > this.endTime) this.endTime = stopAt;
  }

  /** Arms cleanup: when the last source ends, every node is disconnected. */
  finish(): void {
    if (this.scheduled.length === 0) {
      this.dispose();
      return;
    }
    let last = this.scheduled[0];
    for (const s of this.scheduled) if (s.until > last.until) last = s;
    last.src.onended = () => this.dispose();
  }

  /** Fades the voice out over ~30ms from `now` and releases it shortly after. */
  kill(now: number): void {
    if (this.disposed) return;
    for (const g of this.outs) {
      try {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0, now + 0.03);
      } catch {
        /* param already released */
      }
    }
    for (const s of this.scheduled) {
      try {
        s.src.stop(now + 0.05);
      } catch {
        /* already stopped */
      }
    }
    setTimeout(() => this.dispose(), 120);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const s of this.scheduled) s.src.onended = null;
    for (const n of this.nodes) {
      try {
        n.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    this.nodes.length = 0;
    this.scheduled.length = 0;
    this.outs.length = 0;
  }
}

function isParam(target: AudioNode | AudioParam): target is AudioParam {
  return typeof (target as AudioParam).setValueAtTime === 'function';
}

/* ───────────────────────── envelope helpers ───────────────────────── */

/**
 * Percussive envelope: quick linear attack to `peak`, then exponential decay with
 * time-constant `tau`. Returns the time at which the tail is inaudible.
 */
export function pluck(p: AudioParam, t: number, peak: number, attack: number, tau: number): number {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + attack);
  p.setTargetAtTime(0, t + attack, tau);
  return t + attack + tau * 6;
}

/** Sustained envelope: linear attack, hold, linear release. Returns the end time. */
export function swell(
  p: AudioParam,
  t: number,
  peak: number,
  attack: number,
  hold: number,
  release: number,
): number {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + attack);
  p.setValueAtTime(peak, t + attack + hold);
  p.linearRampToValueAtTime(0, t + attack + hold + release);
  return t + attack + hold + release;
}

/** Exponential glide of a positive-valued param (pitch, cutoff) from `from` to `to`. */
export function glide(p: AudioParam, t: number, from: number, to: number, seconds: number): void {
  p.setValueAtTime(Math.max(1e-3, from), t);
  p.exponentialRampToValueAtTime(Math.max(1e-3, to), t + Math.max(0.001, seconds));
}
