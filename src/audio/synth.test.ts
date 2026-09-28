/**
 * The audio module against a small fake AudioContext: the graph is built on
 * unlock, every recipe schedules valid automation, one-shots clean up after
 * themselves, and the heartbeat / drone voices start, re-time and tear down.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sfx } from './index';

/* ───────────────────────── fake Web Audio ───────────────────────── */

class FakeParam {
  constructor(public value: number) {}
  private check(v: number, t: number): void {
    if (!Number.isFinite(v)) throw new TypeError(`non-finite param value ${v}`);
    if (!Number.isFinite(t) || t < 0) throw new RangeError(`bad time ${t}`);
  }
  setValueAtTime(v: number, t: number): this {
    this.check(v, t);
    this.value = v;
    return this;
  }
  linearRampToValueAtTime(v: number, t: number): this {
    this.check(v, t);
    this.value = v;
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number): this {
    this.check(v, t);
    if (v <= 0) throw new RangeError('exponential ramp to a non-positive value');
    this.value = v;
    return this;
  }
  setTargetAtTime(v: number, t: number, tau: number): this {
    this.check(v, t);
    if (!(tau > 0)) throw new RangeError('non-positive time constant');
    this.value = v;
    return this;
  }
  cancelScheduledValues(t: number): this {
    this.check(0, t);
    return this;
  }
}

class FakeNode {
  readonly targets = new Set<object>();
  connect<T extends object>(dest: T): T {
    this.targets.add(dest);
    return dest;
  }
  disconnect(): void {
    this.targets.clear();
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam(1);
}

class FakeSource extends FakeNode {
  started: number | null = null;
  stopped: number | null = null;
  onended: (() => void) | null = null;
  start(t = 0): void {
    if (this.started !== null) throw new Error('start() called twice');
    this.started = t;
  }
  stop(t = 0): void {
    this.stopped = t;
  }
}

class FakeOsc extends FakeSource {
  type = 'sine';
  frequency = new FakeParam(440);
  detune = new FakeParam(0);
}

class FakeBuffer {
  constructor(
    readonly length: number,
    readonly sampleRate: number,
  ) {}
  get duration(): number {
    return this.length / this.sampleRate;
  }
  getChannelData(): Float32Array {
    return new Float32Array(this.length);
  }
}

class FakeBufferSource extends FakeSource {
  buffer: FakeBuffer | null = null;
  loop = false;
}

class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = new FakeParam(350);
  Q = new FakeParam(1);
}

class FakeCompressor extends FakeNode {
  threshold = new FakeParam(-24);
  knee = new FakeParam(30);
  ratio = new FakeParam(12);
  attack = new FakeParam(0.003);
  release = new FakeParam(0.25);
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 0;
  sampleRate = 48000;
  state: 'suspended' | 'running' = 'suspended';
  destination = new FakeNode();
  readonly created: FakeNode[] = [];
  resumed = 0;
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  private make<T extends FakeNode>(n: T): T {
    this.created.push(n);
    return n;
  }
  resume(): Promise<void> {
    this.resumed++;
    this.state = 'running';
    return Promise.resolve();
  }
  createGain(): FakeGain {
    return this.make(new FakeGain());
  }
  createOscillator(): FakeOsc {
    return this.make(new FakeOsc());
  }
  createBufferSource(): FakeBufferSource {
    return this.make(new FakeBufferSource());
  }
  createBiquadFilter(): FakeFilter {
    return this.make(new FakeFilter());
  }
  createDynamicsCompressor(): FakeCompressor {
    return this.make(new FakeCompressor());
  }
  createBuffer(_ch: number, length: number, rate: number): FakeBuffer {
    return new FakeBuffer(length, rate);
  }
  sources(): FakeSource[] {
    return this.created.filter((n): n is FakeSource => n instanceof FakeSource);
  }
}

const ALL: Sfx[] = [
  'slide',
  'commit',
  'tick',
  'meter_up',
  'meter_down',
  'reveal',
  'roll',
  'roll_success',
  'roll_fail',
  'near_miss',
  'flashpoint_hit',
  'offer',
  'act',
  'ring',
  'nuclear',
  'ending',
];

async function boot() {
  vi.resetModules();
  FakeAudioContext.instances = [];
  vi.stubGlobal('AudioContext', FakeAudioContext);
  const mod = await import('./index');
  return mod;
}

function ctx(): FakeAudioContext {
  const c = FakeAudioContext.instances[0];
  if (!c) throw new Error('no context created');
  return c;
}

describe('audio against a fake AudioContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('does not create a context at import time, only on unlock', async () => {
    const { audio } = await boot();
    expect(FakeAudioContext.instances).toHaveLength(0);
    audio.unlock();
    audio.unlock();
    expect(FakeAudioContext.instances).toHaveLength(1);
    const c = ctx();
    expect(c.state).toBe('running');
    // bus → compressor → master → destination
    const compressor = c.created.find((n) => n instanceof FakeCompressor) as FakeCompressor;
    expect(compressor).toBeDefined();
    const master = c.created.find((n) => n instanceof FakeGain && n.targets.has(c.destination)) as FakeGain;
    expect(master).toBeDefined();
    expect(compressor.targets.has(master)).toBe(true);
    expect(master.gain.value).toBeCloseTo(0.8);
  });

  it('plays every sound with valid automation and releases every node when it ends', async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    for (const sfx of ALL) {
      for (const intensity of [0, 0.5, 1]) {
        const before = c.created.length;
        c.currentTime += 0.25;
        audio.play(sfx, { intensity });
        const mine = c.created.slice(before);
        expect(mine.length, sfx).toBeGreaterThan(0);
        const sources = mine.filter((n): n is FakeSource => n instanceof FakeSource);
        expect(sources.length, sfx).toBeGreaterThan(0);
        for (const s of sources) {
          expect(s.started, sfx).not.toBeNull();
          expect(s.stopped, sfx).not.toBeNull();
          expect(s.stopped!, sfx).toBeGreaterThan(s.started!);
          expect(s.started!, sfx).toBeGreaterThanOrEqual(c.currentTime);
        }
        // Something is connected to the bus (a gain feeding the compressor chain).
        expect(mine.some((n) => n.targets.size > 0), sfx).toBe(true);
        // Exactly one source (one that ends last) carries the cleanup hook; firing it disconnects everything.
        const latest = Math.max(...sources.map((s) => s.stopped!));
        const hooked = sources.filter((s) => typeof s.onended === 'function');
        expect(hooked, sfx).toHaveLength(1);
        expect(hooked[0].stopped, sfx).toBe(latest);
        hooked[0].onended!();
        for (const n of mine) expect(n.targets.size, sfx).toBe(0);
      }
    }
  });

  it("'nuclear' is silent for 1.5 s and then rings for about 6 s", async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    c.currentTime = 10;
    const before = c.created.length;
    audio.play('nuclear');
    const sources = c.created.slice(before).filter((n): n is FakeSource => n instanceof FakeSource);
    for (const s of sources) {
      expect(s.started!).toBeGreaterThanOrEqual(11.5);
      expect(s.stopped!).toBeGreaterThan(17.5);
    }
    const oscs = sources.filter((s): s is FakeOsc => s instanceof FakeOsc);
    expect(oscs.map((o) => o.frequency.value)).toContain(55);
  });

  it('drops one-shots while muted and ramps the master to 0 / back', async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    const master = c.created.find((n) => n instanceof FakeGain && n.targets.has(c.destination)) as FakeGain;
    audio.setMuted(true);
    expect(master.gain.value).toBe(0);
    const before = c.created.length;
    audio.play('commit');
    expect(c.created.length).toBe(before);
    audio.setMuted(false);
    expect(master.gain.value).toBeCloseTo(0.8);
    audio.setVolume(0.3);
    expect(master.gain.value).toBeCloseTo(0.3);
    audio.play('commit');
    expect(c.created.length).toBeGreaterThan(before);
  });

  it('heartbeat schedules ahead, re-times on a new bpm and stops cleanly', async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    audio.heartbeat(60);
    const first = c.sources().length;
    expect(first).toBeGreaterThan(0); // the first beat is queued immediately
    expect(vi.getTimerCount()).toBe(1); // one lookahead timer, never one per beat
    // Advance one second of audio time in 100 ms steps: one more beat, two thumps.
    for (let i = 0; i < 10; i++) {
      c.currentTime += 0.1;
      vi.advanceTimersByTime(100);
    }
    const afterOneSecond = c.sources().length;
    expect(afterOneSecond - first).toBe(2);
    expect(vi.getTimerCount()).toBe(1);
    // Speed up: at 240 bpm a second of time yields ~4 beats (8 thumps).
    audio.heartbeat(240);
    for (let i = 0; i < 10; i++) {
      c.currentTime += 0.1;
      vi.advanceTimersByTime(100);
    }
    const fast = c.sources().length - afterOneSecond;
    expect(fast).toBeGreaterThanOrEqual(6);
    expect(fast).toBeLessThanOrEqual(10);
    // Stop: the timer goes away and nothing new is scheduled.
    audio.heartbeat(null);
    vi.advanceTimersByTime(500);
    const stopped = c.sources().length;
    c.currentTime += 1;
    vi.advanceTimersByTime(1000);
    expect(c.sources().length).toBe(stopped);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('heartbeat requested before unlock starts once unlocked', async () => {
    const { audio } = await boot();
    audio.heartbeat(90);
    expect(vi.getTimerCount()).toBe(0);
    audio.unlock();
    expect(ctx().sources().length).toBeGreaterThan(0);
    expect(vi.getTimerCount()).toBe(1);
    audio.heartbeat(null);
    vi.advanceTimersByTime(500);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('drone starts its oscillators once, ramps with intensity, and tears down after fading', async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    audio.drone(true, 0.2);
    const oscs = c.sources().filter((s): s is FakeOsc => s instanceof FakeOsc);
    expect(oscs.length).toBeGreaterThanOrEqual(5);
    for (const o of oscs) expect(o.started).not.toBeNull();
    const filter = c.created.find((n) => n instanceof FakeFilter) as FakeFilter;
    const lowCutoff = filter.frequency.value;
    audio.drone(true, 1);
    expect(c.sources().length).toBe(oscs.length); // no new voice
    expect(filter.frequency.value).toBeGreaterThan(lowCutoff);
    // Off: nodes survive the fade, then are stopped and disconnected.
    audio.drone(false);
    expect(oscs.every((o) => o.stopped === null)).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(oscs.every((o) => o.stopped !== null)).toBe(true);
    expect(oscs.every((o) => o.targets.size === 0)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    // On again builds a fresh voice.
    audio.drone(true, 0.5);
    expect(c.sources().length).toBeGreaterThan(oscs.length);
  });

  it('re-enabling the drone during its fade-out cancels the teardown', async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    audio.drone(true);
    const count = c.sources().length;
    audio.drone(false);
    vi.advanceTimersByTime(300);
    audio.drone(true, 0.9);
    vi.advanceTimersByTime(2000);
    expect(c.sources().length).toBe(count);
    expect(c.sources().every((s) => s.stopped === null)).toBe(true);
  });
});
