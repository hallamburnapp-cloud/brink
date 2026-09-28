/**
 * Flashpoint drone: a managed, long-lived voice.
 *
 *   55 Hz triangles (±6 cents) + 55 Hz sine + quiet 110 Hz triangle + very quiet 82 Hz saw
 *     → mix → resonant lowpass (cutoff and slow LFO depth scale with intensity)
 *     → output gain (breathes with a second, slower LFO; scales with intensity)
 *     → bus
 *
 * Turning it on or off ramps over ~600 ms; intensity changes ramp the same way.
 * The oscillators are only stopped and disconnected once the fade-out has finished.
 */
import { clamp01, rampTo, type Engine } from './engine';

const RAMP = 0.6;

interface DroneVoice {
  readonly nodes: AudioNode[];
  readonly sources: OscillatorNode[];
  readonly out: GainNode;
  readonly filter: BiquadFilterNode;
  readonly lfoDepth: GainNode;
  readonly breathDepth: GainNode;
}

export class Drone {
  private wantOn = false;
  private intensity = 0.5;
  private voice: DroneVoice | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly engine: () => Engine | null) {}

  set(on: boolean, intensity?: number): void {
    this.wantOn = !!on;
    if (intensity !== undefined) this.intensity = clamp01(intensity);
    const eng = this.engine();
    if (eng) this.apply(eng);
  }

  /** Called when the engine becomes available after set() was called early. */
  resume(): void {
    const eng = this.engine();
    if (eng && this.wantOn) this.apply(eng);
  }

  private apply(eng: Engine): void {
    const now = eng.ctx.currentTime;
    if (this.wantOn) {
      if (this.stopTimer !== null) {
        clearTimeout(this.stopTimer);
        this.stopTimer = null;
      }
      const v = this.voice ?? (this.voice = build(eng, now));
      const i = this.intensity;
      rampTo(v.out.gain, 0.12 + 0.14 * i, now, RAMP);
      rampTo(v.filter.frequency, 140 + 520 * i, now, RAMP);
      rampTo(v.lfoDepth.gain, 40 + 160 * i, now, RAMP);
      rampTo(v.breathDepth.gain, 0.02 + 0.03 * i, now, RAMP);
    } else if (this.voice) {
      const v = this.voice;
      rampTo(v.out.gain, 0, now, RAMP);
      rampTo(v.breathDepth.gain, 0, now, RAMP);
      if (this.stopTimer !== null) clearTimeout(this.stopTimer);
      this.stopTimer = setTimeout(() => {
        this.stopTimer = null;
        if (!this.wantOn) this.teardown();
      }, (RAMP + 0.15) * 1000);
    }
  }

  private teardown(): void {
    const v = this.voice;
    if (!v) return;
    this.voice = null;
    const now = this.engine()?.ctx.currentTime ?? 0;
    for (const s of v.sources) {
      try {
        s.stop(now);
      } catch {
        /* already stopped */
      }
    }
    for (const n of v.nodes) {
      try {
        n.disconnect();
      } catch {
        /* already disconnected */
      }
    }
  }
}

function build(eng: Engine, now: number): DroneVoice {
  const { ctx } = eng;
  const nodes: AudioNode[] = [];
  const sources: OscillatorNode[] = [];

  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(eng.bus);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 140;
  filter.Q.value = 1.3;
  filter.connect(out);

  const mix = ctx.createGain();
  mix.gain.value = 0.28;
  mix.connect(filter);

  const add = (type: OscillatorType, freq: number, detune: number, level: number): void => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    let dest: AudioNode = mix;
    if (level !== 1) {
      const g = ctx.createGain();
      g.gain.value = level;
      g.connect(mix);
      nodes.push(g);
      dest = g;
    }
    o.connect(dest);
    o.start(now);
    nodes.push(o);
    sources.push(o);
  };
  add('triangle', 55, -6, 1);
  add('triangle', 55, 6, 1);
  add('sine', 55, 0, 1);
  add('triangle', 110, -4, 0.35);
  add('sawtooth', 82.41, 3, 0.12);

  // Slow LFO on the filter cutoff.
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.13;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0;
  lfo.connect(lfoDepth);
  lfoDepth.connect(filter.frequency);
  lfo.start(now);

  // Slower "breathing" on the output level.
  const breath = ctx.createOscillator();
  breath.type = 'sine';
  breath.frequency.value = 0.07;
  const breathDepth = ctx.createGain();
  breathDepth.gain.value = 0;
  breath.connect(breathDepth);
  breathDepth.connect(out.gain);
  breath.start(now);

  nodes.push(out, filter, mix, lfo, lfoDepth, breath, breathDepth);
  sources.push(lfo, breath);
  return { nodes, sources, out, filter, lfoDepth, breathDepth };
}
