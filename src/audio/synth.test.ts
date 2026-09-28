/**
 * The audio module against a small fake AudioContext: the graph is built on
 * unlock, every recipe schedules valid automation, one-shots clean up after
 * themselves, and the heartbeat / drone voices start, re-time and tear down.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sfx } from './index';

/* ───────────────────────── fake Web Audio ───────────────────────── */

class FakeParam {
  /** Every scheduled value in call order: enough to read a duck-and-restore curve or an envelope peak. */
  readonly events: { v: number; t: number }[] = [];
  constructor(public value: number) {}
  private check(v: number, t: number): void {
    if (!Number.isFinite(v)) throw new TypeError(`non-finite param value ${v}`);
    if (!Number.isFinite(t) || t < 0) throw new RangeError(`bad time ${t}`);
  }
  private record(v: number, t: number): this {
    this.value = v;
    this.events.push({ v, t });
    return this;
  }
  setValueAtTime(v: number, t: number): this {
    this.check(v, t);
    return this.record(v, t);
  }
  linearRampToValueAtTime(v: number, t: number): this {
    this.check(v, t);
    return this.record(v, t);
  }
  exponentialRampToValueAtTime(v: number, t: number): this {
    this.check(v, t);
    if (v <= 0) throw new RangeError('exponential ramp to a non-positive value');
    return this.record(v, t);
  }
  setTargetAtTime(v: number, t: number, tau: number): this {
    this.check(v, t);
    if (!(tau > 0)) throw new RangeError('non-positive time constant');
    return this.record(v, t);
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
  'tally_tick',
  'tally_mult',
  'tally_slam',
  'ante_smash',
  'ante_miss',
  'breath',
  'accident',
  'accident_clear',
  'capital',
  'retrigger',
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

/** Plays one sound and returns just the nodes it created. */
function nodesOf(c: FakeAudioContext, play: () => void): FakeNode[] {
  const before = c.created.length;
  play();
  return c.created.slice(before);
}

function oscsIn(nodes: FakeNode[]): FakeOsc[] {
  return nodes.filter((n): n is FakeOsc => n instanceof FakeOsc);
}

/** The loudest value any gain envelope in `nodes` was ever scheduled to. */
function peakIn(nodes: FakeNode[]): number {
  const gains = nodes.filter((n): n is FakeGain => n instanceof FakeGain);
  return Math.max(...gains.flatMap((g) => g.gain.events.map((e) => e.v)));
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

  /* ───────────────────────── the scoring loop ───────────────────────── */

  it("'tally_tick' is a ~25 ms single-oscillator blip whose pitch climbs 500 Hz → 2.2 kHz", async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    const blip = (intensity: number) => oscsIn(nodesOf(c, () => audio.play('tally_tick', { intensity })));
    const low = blip(0);
    const mid = blip(0.5);
    const high = blip(1);
    // One oscillator and one gain, no filter: cheap enough to fire twenty times in a second.
    expect(low).toHaveLength(1);
    expect(nodesOf(c, () => audio.play('tally_tick', { intensity: 0.3 }))).toHaveLength(2);
    expect(low[0].frequency.value).toBeCloseTo(500, 0);
    expect(mid[0].frequency.value).toBeGreaterThan(900);
    expect(mid[0].frequency.value).toBeLessThan(1200);
    expect(high[0].frequency.value).toBeCloseTo(2200, 0);
    for (const [o] of [low, mid, high]) {
      expect(o.stopped! - o.started!).toBeGreaterThan(0.02);
      expect(o.stopped! - o.started!).toBeLessThan(0.035);
    }
  });

  it("'tally_mult' is a heavier two-triangle tick that also rises with intensity", async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    const tick = (intensity: number) => oscsIn(nodesOf(c, () => audio.play('tally_mult', { intensity })));
    const low = tick(0);
    const high = tick(1);
    expect(low).toHaveLength(2);
    expect(low.every((o) => o.type === 'triangle')).toBe(true);
    expect(low[0].detune.value).toBe(-low[1].detune.value);
    expect(high[0].frequency.value).toBeGreaterThan(low[0].frequency.value * 3);
    expect(low[0].stopped! - low[0].started!).toBeLessThan(0.06);
  });

  it("'tally_slam' grows with intensity and only drops the 80 → 35 Hz sub when enormous", async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    const slam = (intensity: number) => {
      c.currentTime += 1;
      return nodesOf(c, () => audio.play('tally_slam', { intensity }));
    };
    const small = slam(0);
    const mid = slam(0.5);
    const huge = slam(1);
    const subs = (nodes: FakeNode[]) =>
      oscsIn(nodes).filter((o) => o.frequency.events[0]?.v === 80 && o.frequency.value === 35);
    expect(subs(small)).toHaveLength(0);
    expect(subs(mid)).toHaveLength(0);
    expect(subs(huge)).toHaveLength(1);
    const sub = subs(huge)[0];
    expect(sub.frequency.events[1].t - sub.frequency.events[0].t).toBeCloseTo(0.4, 5);
    // D3 joins the fifth only above 0.5 (then the sub near 1), while the level climbs throughout.
    expect(oscsIn(mid).length).toBe(oscsIn(small).length);
    expect(oscsIn(huge).length).toBe(oscsIn(mid).length + 3);
    expect(peakIn(huge)).toBeGreaterThan(peakIn(mid));
    expect(peakIn(mid)).toBeGreaterThan(peakIn(small));
    expect(peakIn(huge)).toBeLessThanOrEqual(0.4);
    const span = (nodes: FakeNode[]) => {
      const s = oscsIn(nodes);
      return Math.max(...s.map((o) => o.stopped!)) - Math.min(...s.map((o) => o.started!));
    };
    expect(span(huge)).toBeGreaterThan(span(small));
  });

  it("'retrigger' echoes the slam at half level, a fifth up, without the sub drop", async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    const slam = nodesOf(c, () => audio.play('tally_slam', { intensity: 0.5 }));
    const echo = nodesOf(c, () => audio.play('retrigger', { intensity: 0.5 }));
    expect(peakIn(echo)).toBeCloseTo(peakIn(slam) / 2, 5);
    const loud = oscsIn(nodesOf(c, () => audio.play('retrigger', { intensity: 1 })));
    expect(loud.some((o) => o.frequency.value === 35)).toBe(false);
    // D4 × 1.5 (sine + triangle) and A4 × 1.5 carry the transposed fifth.
    expect(loud.filter((o) => Math.abs(o.frequency.value - 293.66 * 1.5) < 0.01)).toHaveLength(2);
    expect(loud.filter((o) => Math.abs(o.frequency.value - 660) < 0.01)).toHaveLength(2);
  });

  it("'ante_smash' sweeps for 600 ms into a chord whose density grows with intensity and rings ~2.5 s", async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    const smash = (intensity: number) => {
      c.currentTime += 4;
      const t0 = c.currentTime + 0.01;
      return { t0, oscs: oscsIn(nodesOf(c, () => audio.play('ante_smash', { intensity }))) };
    };
    const lean = smash(0);
    const dense = smash(1);
    expect(dense.oscs.length).toBeGreaterThan(lean.oscs.length);
    for (const { t0, oscs } of [lean, dense]) {
      const sweep = oscs.filter((o) => o.started! < t0 + 0.1);
      const chord = oscs.filter((o) => o.started! >= t0 + 0.59);
      expect(sweep.length).toBeGreaterThan(0);
      expect(chord.length).toBeGreaterThanOrEqual(6); // at least three sine + triangle pairs
      for (const s of sweep) expect(s.stopped!).toBeLessThan(t0 + 0.65);
      expect(Math.max(...chord.map((o) => o.stopped!))).toBeGreaterThan(t0 + 0.6 + 2.4);
    }
  });

  it("'ante_miss' falls through three notes over a 1.4 s drone swell", async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    const t0 = c.currentTime + 0.01;
    const oscs = oscsIn(nodesOf(c, () => audio.play('ante_miss')));
    const saws = oscs.filter((o) => o.type === 'sawtooth');
    expect(saws).toHaveLength(2);
    for (const s of saws) expect(s.stopped!).toBeCloseTo(t0 + 1.4, 5);
    const notes = oscs.filter((o) => o.type === 'triangle').map((o) => o.frequency.value);
    expect(notes).toEqual([659.25, 523.25, 440]);
    const last = oscs.find((o) => o.frequency.value === 440)!;
    expect(last.detune.value).toBe(-40);
  });

  it("'accident' opens with two 90 ms band-passed square tones a tritone apart, then a boom that grows", async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    const quiet = nodesOf(c, () => audio.play('accident', { intensity: 0 }));
    const squares = oscsIn(quiet).filter((o) => o.type === 'square');
    expect(squares).toHaveLength(2);
    const [a, b] = squares;
    expect(b.frequency.value / a.frequency.value).toBeCloseTo(Math.SQRT2, 2);
    expect(a.stopped! - a.started!).toBeCloseTo(0.09, 3);
    expect(b.started! - a.started!).toBeCloseTo(0.11, 5);
    // every square feeds a bandpass, never the bus directly
    for (const s of squares) {
      const [dest] = [...s.targets];
      expect(dest).toBeInstanceOf(FakeFilter);
      expect((dest as FakeFilter).type).toBe('bandpass');
    }
    const loud = nodesOf(c, () => audio.play('accident', { intensity: 1 }));
    expect(peakIn(loud)).toBeGreaterThan(peakIn(quiet));
  });

  it("'accident_clear' and 'capital' are short pure-sine gestures", async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    const t0 = c.currentTime + 0.01;
    const exhale = oscsIn(nodesOf(c, () => audio.play('accident_clear')));
    expect(exhale).toHaveLength(2);
    expect(exhale.every((o) => o.type === 'sine')).toBe(true);
    expect(exhale[1].frequency.events[0].v).toBeLessThan(exhale[0].frequency.events[0].v);
    expect(Math.max(...exhale.map((o) => o.stopped!))).toBeLessThan(t0 + 0.4);
    const coin = oscsIn(nodesOf(c, () => audio.play('capital')));
    expect(coin.map((o) => o.frequency.value).sort((x, y) => x - y)).toEqual([2100, 3200]);
    expect(coin.every((o) => o.type === 'sine')).toBe(true);
    expect(Math.max(...coin.map((o) => o.stopped!))).toBeLessThan(t0 + 0.35);
  });

  it('holdBreath ducks the bus to 15% and restores it under a 12 kHz sine that stops when the breath ends', async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    const compressor = c.created.find((n) => n instanceof FakeCompressor) as FakeCompressor;
    const bus = c.created.find((n) => n instanceof FakeGain && n.targets.has(compressor)) as FakeGain;
    const master = c.created.find((n) => n instanceof FakeGain && n.targets.has(c.destination)) as FakeGain;
    c.currentTime = 5;
    const mine = nodesOf(c, () => audio.holdBreath(800));
    const t0 = 5.01;
    // 60 ms down to 15%, held for the duration, 400 ms back to unity.
    expect(bus.gain.events.map((e) => e.v)).toEqual([1, 0.15, 0.15, 1]);
    expect(bus.gain.events.map((e) => e.t)).toEqual(
      [t0, t0 + 0.06, t0 + 0.8, t0 + 1.2].map((t) => expect.closeTo(t, 5)),
    );
    // The tone: one 12 kHz sine at −40 dB, routed around the duck straight into the master.
    const oscs = oscsIn(mine);
    expect(oscs).toHaveLength(1);
    expect(oscs[0].frequency.value).toBe(12000);
    expect(oscs[0].started).toBeCloseTo(t0, 5);
    expect(oscs[0].stopped).toBeCloseTo(t0 + 0.8, 5);
    const out = mine.find((n) => n instanceof FakeGain) as FakeGain;
    expect(out.targets.has(master)).toBe(true);
    expect(out.targets.has(bus)).toBe(false);
    expect(peakIn(mine)).toBeCloseTo(0.01, 6);
    // Cleans up like any one-shot.
    expect(typeof oscs[0].onended).toBe('function');
    oscs[0].onended!();
    expect(out.targets.size).toBe(0);
    // Bad durations do nothing; long ones are capped at 8 s.
    expect(nodesOf(c, () => audio.holdBreath(0))).toHaveLength(0);
    expect(nodesOf(c, () => audio.holdBreath(Number.NaN))).toHaveLength(0);
    const long = oscsIn(nodesOf(c, () => audio.holdBreath(60_000)));
    expect(long[0].stopped).toBeCloseTo(t0 + 8, 5);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("the 'breath' recipe holds longer with intensity", async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    const held = (intensity: number) => {
      const [o] = oscsIn(nodesOf(c, () => audio.play('breath', { intensity })));
      return o.stopped! - o.started!;
    };
    expect(held(0)).toBeCloseTo(0.6, 5);
    expect(held(1)).toBeCloseTo(2, 5);
  });

  it('pulse shares the heartbeat scheduler: the faster tempo wins and releasing one source keeps the other', async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    const second = () => {
      const before = c.sources().length;
      for (let i = 0; i < 10; i++) {
        c.currentTime += 0.1;
        vi.advanceTimersByTime(100);
      }
      return c.sources().length - before;
    };
    audio.heartbeat(60);
    audio.pulse(120);
    expect(vi.getTimerCount()).toBe(1); // still one lookahead timer for both sources
    expect(second()).toBe(4); // 120 bpm: two beats, four thumps
    audio.heartbeat(null); // the timer lets go; the pulse carries on at its own tempo
    expect(vi.getTimerCount()).toBe(1);
    expect(second()).toBe(4);
    audio.heartbeat(60); // slower than the pulse: nothing changes
    expect(second()).toBe(4);
    audio.pulse(null); // the pulse lets go; the timer's 60 bpm remains
    expect(vi.getTimerCount()).toBe(1);
    expect(second() + second()).toBe(4); // 60 bpm: one beat per second
    audio.heartbeat(null);
    vi.advanceTimersByTime(500);
    const stopped = c.sources().length;
    c.currentTime += 1;
    vi.advanceTimersByTime(1000);
    expect(c.sources().length).toBe(stopped);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('pulse requested before unlock starts once unlocked and survives heartbeat(null)', async () => {
    const { audio } = await boot();
    audio.pulse(100);
    expect(vi.getTimerCount()).toBe(0);
    audio.unlock();
    expect(ctx().sources().length).toBeGreaterThan(0);
    expect(vi.getTimerCount()).toBe(1);
    audio.heartbeat(null);
    expect(vi.getTimerCount()).toBe(1);
    audio.pulse(null);
    vi.advanceTimersByTime(500);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('setIntensity gently opens the drone filter and widens the tally detune', async () => {
    const { audio } = await boot();
    audio.unlock();
    const c = ctx();
    audio.drone(true, 0.5);
    const filter = c.created.find((n) => n instanceof FakeFilter) as FakeFilter;
    const rest = filter.frequency.value;
    audio.setIntensity(1);
    const hot = filter.frequency.value;
    expect(hot).toBeGreaterThan(rest);
    expect(hot - rest).toBeLessThanOrEqual(200);
    audio.setIntensity(Number.NaN); // ignored
    expect(filter.frequency.value).toBe(hot);
    audio.setIntensity(0);
    expect(filter.frequency.value).toBe(rest);
    const widest = (g: number) => {
      audio.setIntensity(g);
      const oscs = oscsIn(nodesOf(c, () => audio.play('tally_mult', { intensity: 0.5 })));
      return Math.max(...oscs.map((o) => Math.abs(o.detune.value)));
    };
    expect(widest(0)).toBe(7);
    expect(widest(1)).toBeGreaterThan(7);
    expect(widest(1)).toBeLessThan(25);
    // tally_tick stays a single oscillator at rest and gains a faint flat twin under escalation.
    audio.setIntensity(0);
    expect(oscsIn(nodesOf(c, () => audio.play('tally_tick')))).toHaveLength(1);
    audio.setIntensity(0.8);
    const pair = oscsIn(nodesOf(c, () => audio.play('tally_tick')));
    expect(pair).toHaveLength(2);
    expect(pair[1].detune.value).toBeLessThan(0);
    expect(pair[1].frequency.value).toBe(pair[0].frequency.value);
  });
});
