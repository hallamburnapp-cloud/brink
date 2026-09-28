/**
 * One-shot sound recipes. Everything is synthesised: sines, triangles, a little
 * detuned saw, filtered white noise and short gain envelopes. Square waves appear
 * exactly once, band-passed into the accident alarm.
 *
 * Each recipe receives a `Voice` (pre-seeded with a start time `v.t0`) and an
 * intensity in 0..1, builds its nodes through the voice so they are tracked and
 * released together, and schedules everything relative to `v.t0`.
 *
 * A second, global intensity (`audio.setIntensity`, the run's escalation) is
 * stored here: the tally sounds read it and add a faint detune as things heat up.
 *
 * Level guide: individual voices peak around 0.1–0.3 before the compressor and
 * the 0.8 master, which lands the mix in the −12 dBFS neighbourhood.
 */
import { clamp01 } from './engine';
import { Voice, glide, pluck, swell } from './voice';

export type Sfx =
  | 'slide'
  | 'commit'
  | 'tick'
  | 'meter_up'
  | 'meter_down'
  | 'reveal'
  | 'roll'
  | 'roll_success'
  | 'roll_fail'
  | 'near_miss'
  | 'flashpoint_hit'
  | 'offer'
  | 'act'
  | 'ring'
  | 'nuclear'
  | 'ending'
  | 'tally_tick'
  | 'tally_mult'
  | 'tally_slam'
  | 'ante_smash'
  | 'ante_miss'
  | 'breath'
  | 'accident'
  | 'accident_clear'
  | 'capital'
  | 'retrigger';

export type Recipe = (v: Voice, intensity: number) => void;

/* ───────────────────────── pitch table (Hz) ───────────────────────── */
const A2 = 110.0;
const AS2 = 116.54;
const D3 = 146.83;
const G3 = 196.0;
const A3 = 220.0;
const D4 = 293.66;
const E4 = 329.63;
const FS4 = 369.99;
const G4 = 392.0;
const A4 = 440.0;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const FS5 = 739.99;
const G5 = 783.99;
const A5 = 880.0;
const B5 = 987.77;
const CS6 = 1108.73;
const D6 = 1174.66;
const DS6 = 1244.51;

/* ───────────────────────── global intensity ───────────────────────── */

let globalIntensity = 0;

/** Stores the run's escalation as 0..1. The tally recipes read it; the drone keeps its own copy. */
export function setGlobalIntensity(escalation01: number): void {
  globalIntensity = clamp01(escalation01);
}

/** Extra detune, in cents, that the tally sounds carry as escalation rises (0 → 12). */
function tallyDetune(): number {
  return 12 * globalIntensity;
}

/* ───────────────────────── shared building blocks ───────────────────────── */

interface ToneOpts {
  type?: OscillatorType;
  /** Lowpass cutoff shaping the top end (default 2400 Hz). */
  cutoff?: number;
  /** Cents; when set, two oscillators ±detune are mixed for a little width. */
  detune?: number;
  /** Level of a sine an octave above — the "glass" in glassy. */
  octave?: number;
}

/** A plucked note: attack → exponential decay. Returns the time its tail is gone. */
function tone(
  v: Voice,
  freq: number,
  at: number,
  peak: number,
  attack: number,
  tau: number,
  o: ToneOpts = {},
): number {
  const out = v.gain(0);
  const lp = v.filter('lowpass', o.cutoff ?? 2400, 0.6, out);
  const mix = v.gain(o.detune ? 0.5 : 1, lp);
  const end = pluck(out.gain, at, peak, attack, tau);
  const type = o.type ?? 'sine';
  if (o.detune) {
    v.play(v.osc(type, freq, mix, -o.detune), at, end);
    v.play(v.osc(type, freq, mix, o.detune), at, end);
  } else {
    v.play(v.osc(type, freq, mix), at, end);
  }
  if (o.octave) {
    const g = v.gain(o.octave, lp);
    v.play(v.osc('sine', freq * 2, g), at, end);
  }
  return end;
}

/**
 * A sustained pad note: sine + triangle a few cents apart through a soft lowpass.
 * `hold` includes the attack (default 120 ms, slow); `detune` is in cents (default 3).
 */
function pad(
  v: Voice,
  freq: number,
  at: number,
  hold: number,
  peak: number,
  release: number,
  attack = 0.12,
  detune = 3,
): number {
  const out = v.gain(0);
  const lp = v.filter('lowpass', 1600, 0.6, out);
  const mix = v.gain(0.5, lp);
  const end = swell(out.gain, at, peak, attack, Math.max(0.05, hold - attack), release);
  v.play(v.osc('sine', freq, mix, -detune), at, end);
  v.play(v.osc('triangle', freq, mix, detune), at, end);
  return end;
}

/** A small bell: sine fundamental with a faster-decaying inharmonic partial. */
function bell(v: Voice, freq: number, at: number, peak: number): number {
  const fund = v.gain(0);
  const end = pluck(fund.gain, at, peak, 0.004, 0.22);
  v.play(v.osc('sine', freq, fund), at, end);
  const partial = v.gain(0);
  pluck(partial.gain, at, peak * 0.28, 0.002, 0.07);
  v.play(v.osc('sine', freq * 2.41, partial), at, at + 0.5);
  return end;
}

/** Two detuned saws through a resonant lowpass whose cutoff blooms then settles: brass-ish. */
function brass(v: Voice, freq: number, at: number, dur: number, peak: number, release: number): number {
  const out = v.gain(0);
  const lp = v.filter('lowpass', 300, 1.6, out);
  const mix = v.gain(0.5, lp);
  lp.frequency.setValueAtTime(300, at);
  lp.frequency.exponentialRampToValueAtTime(1800, at + 0.06);
  lp.frequency.exponentialRampToValueAtTime(700, at + dur);
  const attack = 0.03;
  const end = swell(out.gain, at, peak, attack, Math.max(0.02, dur - attack), release);
  v.play(v.osc('sawtooth', freq, mix, -7), at, end);
  v.play(v.osc('sawtooth', freq, mix, 7), at, end);
  return end;
}

/** A short low sine hit whose pitch falls: the basic thud. */
function thud(v: Voice, at: number, peak: number, f0: number, f1: number, slide: number, tau: number): number {
  const out = v.gain(0);
  const o = v.osc('sine', f0, out);
  glide(o.frequency, at, f0, f1, slide);
  const end = pluck(out.gain, at, peak, 0.004, tau);
  v.play(o, at, end);
  return end;
}

/** A few milliseconds of high-passed noise: the transient "edge" on a hit. */
function click(v: Voice, at: number, peak: number, hp: number): void {
  const out = v.gain(0);
  const f = v.filter('highpass', hp, 0.7, out);
  pluck(out.gain, at, peak, 0.001, 0.004);
  v.play(v.noise(f), at, at + 0.04);
}

/** A low-passed puff of noise whose cutoff falls: debris after a boom. */
function dust(v: Voice, at: number, peak: number, tau: number): void {
  const out = v.gain(0);
  const lp = v.filter('lowpass', 900, 0.8, out);
  glide(lp.frequency, at, 900, 180, 0.3);
  v.play(v.noise(lp), at, pluck(out.gain, at, peak, 0.008, tau));
}

interface SlamOpts {
  /** Overall level multiplier (default 1). */
  level?: number;
  /** Pitch multiplier for the chord (default 1). */
  pitch?: number;
  /** Multiplier for the chord's hold and release (default 1). */
  tail?: number;
  /** Allow the sub-bass drop near intensity 1 (default true). */
  sub?: boolean;
}

/**
 * The base×mult slam: a low thump whose depth and length grow with intensity, a
 * 12 ms bright noise edge, and a bare fifth (D4 + A4, with D3 joining above 0.5)
 * held for a moment. Near intensity 1 a sub-bass sine drops 80 → 35 Hz over
 * 400 ms underneath it all. The chord carries the global tally detune.
 */
function slam(v: Voice, at: number, i: number, o: SlamOpts = {}): void {
  const level = o.level ?? 1;
  const pitch = o.pitch ?? 1;
  const tail = o.tail ?? 1;
  thud(v, at, (0.16 + 0.18 * i) * level, 150 - 50 * i, 54 - 14 * i, 0.05 + 0.08 * i, 0.04 + 0.1 * i);
  const edge = v.gain(0);
  const hp = v.filter('highpass', 2200, 0.7, edge);
  v.play(v.noise(hp), at, pluck(edge.gain, at, (0.05 + 0.08 * i) * level, 0.001, 0.012));
  const hold = (0.12 + 0.2 * i) * tail;
  const release = (0.12 + 0.28 * i) * tail;
  const d = 4 + tallyDetune();
  const peak = (0.07 + 0.07 * i) * level;
  pad(v, D4 * pitch, at, hold, peak, release, 0.01, d);
  pad(v, A4 * pitch, at + 0.004, hold, peak * 0.8, release, 0.01, d);
  const low = clamp01((i - 0.5) * 2);
  if (low > 0) pad(v, D3 * pitch, at, hold, peak * 0.7 * low, release, 0.012, d);
  const sub = o.sub === false ? 0 : clamp01((i - 0.75) * 4);
  if (sub > 0) {
    const g = v.gain(0);
    const s = v.osc('sine', 80, g);
    glide(s.frequency, at, 80, 35, 0.4);
    v.play(s, at, swell(g.gain, at, 0.22 * sub * level, 0.02, 0.26, 0.16));
  }
}

/** One 90 ms square tone, band-passed at its own pitch so only the alarm-like core gets through. */
function alarm(v: Voice, freq: number, at: number, peak: number): void {
  const out = v.gain(0);
  const bp = v.filter('bandpass', freq, 2.5, out);
  v.play(v.osc('square', freq, bp), at, swell(out.gain, at, peak, 0.004, 0.076, 0.01));
}

/* ───────────────────────── the held breath ───────────────────────── */

const BREATH_DUCK = 0.15;
const BREATH_IN = 0.06;
const BREATH_OUT = 0.4;
const BREATH_TONE = 12000;
/** −40 dB. */
const BREATH_LEVEL = 0.01;

/**
 * Holds the breath for `seconds`: the bus (drone, heartbeat, everything) ducks
 * to 15% over 60 ms, stays there, and comes back over 400 ms. Meanwhile a 12 kHz
 * sine at −40 dB, routed straight into the master so the duck cannot swallow it,
 * hangs in the air and stops when the breath ends. Used by the 'breath' recipe
 * and by `audio.holdBreath(ms)`.
 */
export function breath(v: Voice, seconds: number): void {
  const t = v.t0;
  const dur = Math.max(BREATH_IN + 0.05, seconds);
  const bus = v.eng.bus.gain;
  bus.cancelScheduledValues(t);
  bus.setValueAtTime(bus.value, t);
  bus.linearRampToValueAtTime(BREATH_DUCK, t + BREATH_IN);
  bus.setValueAtTime(BREATH_DUCK, t + dur);
  bus.linearRampToValueAtTime(1, t + dur + BREATH_OUT);
  const out = v.gain(0, v.eng.master);
  const end = swell(out.gain, t, BREATH_LEVEL, BREATH_IN, Math.max(0.02, dur - BREATH_IN - 0.03), 0.03);
  v.play(v.osc('sine', BREATH_TONE, out), t, end);
}

/* ───────────────────────── recipes ───────────────────────── */

export const RECIPES: Record<Sfx, Recipe> = {
  slide(v) {
    // 120 ms of noise through a bandpass that sweeps upward: paper leaving a stack.
    const t = v.t0;
    const out = v.gain(0);
    const lp = v.filter('lowpass', 5200, 0.7, out);
    const bp = v.filter('bandpass', 1100, 0.8, lp);
    glide(bp.frequency, t, 1100, 2600, 0.12);
    swell(out.gain, t, 0.16, 0.025, 0.02, 0.075);
    v.play(v.noise(bp), t, t + 0.13);
  },

  commit(v) {
    // Low thud (170 → 58 Hz) with a tiny high-passed transient on top.
    const t = v.t0;
    thud(v, t, 0.3, 170, 58, 0.07, 0.035);
    click(v, t, 0.07, 5500);
  },

  tick(v, i) {
    // A ~50 ms sine blip; pitch rises with intensity (800 → 2400 Hz) and sags slightly as it dies.
    const t = v.t0;
    const f = 800 + i * 1600;
    const out = v.gain(0);
    const o = v.osc('sine', f, out);
    glide(o.frequency, t, f * 1.05, f, 0.02);
    const end = pluck(out.gain, t, 0.09 + i * 0.04, 0.002, 0.009);
    v.play(o, t, end);
  },

  meter_up(v, i) {
    // Two soft triangle notes rising a fifth (A4 → E5).
    const t = v.t0;
    const vol = 0.11 + 0.06 * i;
    tone(v, A4, t, vol, 0.008, 0.06, { type: 'triangle', cutoff: 2600, detune: 5 });
    tone(v, E5, t + 0.1, vol, 0.008, 0.1, { type: 'triangle', cutoff: 2600, detune: 5 });
  },

  meter_down(v, i) {
    // The same motif falling a fourth (A4 → E4), darker on the landing.
    const t = v.t0;
    const vol = 0.11 + 0.06 * i;
    tone(v, A4, t, vol, 0.008, 0.06, { type: 'triangle', cutoff: 2600, detune: 5 });
    tone(v, E4, t + 0.1, vol, 0.008, 0.11, { type: 'triangle', cutoff: 1800, detune: 5 });
  },

  reveal(v) {
    // Glassy ascending arpeggio C5 E5 G5 B5: sines with an octave partial, tails lengthening.
    const t = v.t0;
    [C5, E5, G5, B5].forEach((f, k) => {
      tone(v, f, t + k * 0.065, 0.11, 0.004, 0.11 + k * 0.02, { cutoff: 7000, octave: 0.35 });
    });
  },

  roll(v, i) {
    // ~400 ms of narrow bandpassed noise sweeping up then settling, with a fast tremolo: a spinning wheel.
    const t = v.t0;
    const dur = 0.4;
    const out = v.gain(0);
    const trem = v.gain(0.55, out);
    const depth = v.gain(0.45, trem.gain);
    const lfo = v.osc('sine', 26 + i * 10, depth);
    const bp = v.filter('bandpass', 320, 5, trem);
    bp.frequency.setValueAtTime(320, t);
    bp.frequency.exponentialRampToValueAtTime(2200 + i * 800, t + dur * 0.6);
    bp.frequency.exponentialRampToValueAtTime(900, t + dur);
    swell(out.gain, t, 0.3, 0.03, dur - 0.15, 0.12);
    v.play(v.noise(bp), t, t + dur + 0.01);
    v.play(lfo, t, t + dur + 0.01);
  },

  roll_success(v) {
    // Major resolve: G4 leading into a C major chord (C5 E5 G5).
    const t = v.t0;
    tone(v, G4, t, 0.13, 0.01, 0.08, { type: 'triangle', cutoff: 2400, detune: 4 });
    const t2 = t + 0.13;
    tone(v, C5, t2, 0.12, 0.012, 0.16, { type: 'triangle', cutoff: 2600, detune: 4 });
    tone(v, E5, t2 + 0.005, 0.08, 0.012, 0.16, { cutoff: 3000, detune: 4 });
    tone(v, G5, t2 + 0.01, 0.04, 0.012, 0.2, { cutoff: 3000 });
  },

  roll_fail(v) {
    // Minor fall: C5 down to A4, and the A4 sags a further semitone as it dies over a quiet A3.
    const t = v.t0;
    tone(v, C5, t, 0.13, 0.01, 0.07, { type: 'triangle', cutoff: 1800, detune: 4 });
    const t2 = t + 0.14;
    const out = v.gain(0);
    const lp = v.filter('lowpass', 1400, 0.7, out);
    const mix = v.gain(0.5, lp);
    const end = pluck(out.gain, t2, 0.14, 0.012, 0.16);
    for (const d of [-4, 4]) {
      const o = v.osc('triangle', A4, mix, d);
      o.frequency.setValueAtTime(A4, t2);
      o.frequency.exponentialRampToValueAtTime(415.3, t2 + 0.35);
      v.play(o, t2, end);
    }
    tone(v, A3, t2, 0.07, 0.02, 0.18, { cutoff: 800 });
  },

  near_miss(v) {
    // An Asus4 (A4 D5 E5) held ~420 ms, creeping upward in pitch, then cut dead with a tiny click.
    const t = v.t0;
    const hold = 0.42;
    const out = v.gain(0);
    const lp = v.filter('lowpass', 2200, 0.7, out);
    const mix = v.gain(0.3, lp);
    const wobble = v.gain(0.08, mix.gain);
    v.play(v.osc('sine', 7, wobble), t, t + hold + 0.01);
    [A4, D5, E5].forEach((f, k) => {
      const spread = k % 2 ? 3 : -3;
      const o = v.osc(k === 2 ? 'triangle' : 'sine', f, mix, spread);
      o.detune.setValueAtTime(spread, t);
      o.detune.linearRampToValueAtTime(spread + 15, t + hold);
      v.play(o, t, t + hold + 0.01);
    });
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.16, t + 0.04);
    out.gain.setValueAtTime(0.16, t + hold);
    out.gain.linearRampToValueAtTime(0, t + hold + 0.004);
    click(v, t + hold, 0.05, 3000);
  },

  flashpoint_hit(v, i) {
    // Low boom (95 → 36 Hz) + sub thump (60 → 44 Hz) + a low-passed puff of debris.
    const t = v.t0;
    const amt = 0.7 + 0.3 * i;
    thud(v, t, 0.32 * amt, 95, 36, 0.35, 0.28);
    thud(v, t + 0.01, 0.3 * amt, 60, 44, 0.12, 0.14);
    dust(v, t, 0.13 * amt, 0.09);
  },

  offer(v) {
    // Three soft bells on an F# minor triad (F#5 A5 C#6), 150 ms apart.
    const t = v.t0;
    [FS5, A5, CS6].forEach((f, k) => bell(v, f, t + k * 0.15, 0.1));
  },

  act(v) {
    // Brass-like motif on detuned saws: a short D3, then a longer G3 a fourth up.
    const t = v.t0;
    brass(v, D3, t, 0.22, 0.14, 0.08);
    brass(v, G3, t + 0.24, 0.6, 0.15, 0.3);
  },

  ring(v) {
    // Classic ring: 400 + 450 Hz sines with a 25 Hz warble, cadence 0.4 on / 0.2 off, twice, ~2.4 s.
    const t = v.t0;
    const out = v.gain(0);
    const lp = v.filter('lowpass', 2400, 0.7, out);
    const mix = v.gain(0.5, lp);
    const depth = v.gain(0.25, mix.gain);
    const lfo = v.osc('sine', 25, depth);
    const a = v.osc('sine', 400, mix);
    const b = v.osc('sine', 450, mix);
    out.gain.setValueAtTime(0, t);
    for (const start of [0, 0.6, 1.4, 2.0]) {
      const s = t + start;
      out.gain.setValueAtTime(0, s);
      out.gain.linearRampToValueAtTime(0.13, s + 0.012);
      out.gain.setValueAtTime(0.13, s + 0.38);
      out.gain.linearRampToValueAtTime(0, s + 0.4);
    }
    const end = t + 2.42;
    v.play(a, t, end);
    v.play(b, t, end);
    v.play(lfo, t, end);
  },

  nuclear(v) {
    // 1.5 s of nothing. Then one 55 Hz sine (with a faint octave so small speakers register it)
    // and a whisper of low-passed noise, decaying over 6 s.
    const t = v.t0 + 1.5;
    const end = t + 6.1;
    const out = v.gain(0);
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.3, t + 0.06);
    out.gain.exponentialRampToValueAtTime(0.0008, t + 6);
    out.gain.linearRampToValueAtTime(0, t + 6.05);
    v.play(v.osc('sine', 55, out), t, end);
    const octave = v.gain(0.05, out);
    v.play(v.osc('sine', 110, octave), t, end);
    const hiss = v.gain(0);
    const lp = v.filter('lowpass', 160, 0.7, hiss);
    hiss.gain.setValueAtTime(0, t);
    hiss.gain.linearRampToValueAtTime(0.03, t + 0.3);
    hiss.gain.exponentialRampToValueAtTime(0.0005, t + 6);
    hiss.gain.linearRampToValueAtTime(0, t + 6.05);
    v.play(v.noise(lp), t, end);
  },

  ending(v) {
    // A slow descending fifth: A4 for about a second, then D4 held and released over a couple more,
    // with a quiet D3 underneath the landing.
    const t = v.t0;
    pad(v, A4, t, 1.1, 0.14, 0.5);
    pad(v, D4, t + 1.0, 2.2, 0.15, 1.2);
    pad(v, D3, t + 1.0, 2.2, 0.06, 1.2);
  },

  /* ── the scoring loop ── */

  tally_tick(v, i) {
    // A 25 ms sine blip, 500 Hz → 2.2 kHz with intensity (exponential, so the count-up sounds even).
    // One oscillator, one gain, no filter: cheap enough to fire twenty times a second. The 2 ms attack
    // and 4 ms time-constant keep it from ever popping. Escalation adds a second sine a few cents flat.
    const t = v.t0;
    const f = 500 * Math.pow(4.4, i);
    const out = v.gain(0);
    const end = pluck(out.gain, t, 0.08 + 0.05 * i, 0.002, 0.004);
    v.play(v.osc('sine', f, out), t, end);
    const d = tallyDetune();
    if (d > 0) v.play(v.osc('sine', f, v.gain(0.5, out), -d), t, end);
  },

  tally_mult(v, i) {
    // The heavier tick for the mult stage: two triangles ±7 cents (wider with escalation),
    // 380 Hz → 1.33 kHz with intensity, ~45 ms through a 3.2 kHz lowpass.
    const t = v.t0;
    const f = 380 * Math.pow(3.5, i);
    tone(v, f, t, 0.1 + 0.06 * i, 0.003, 0.007, { type: 'triangle', cutoff: 3200, detune: 7 + tallyDetune() });
  },

  tally_slam(v, i) {
    // base × mult: thump + bright edge + a held fifth; intensity 0 is a tap, 1 is enormous and adds
    // the 80 → 35 Hz sub drop.
    slam(v, v.t0, i);
  },

  ante_smash(v, i) {
    // 600 ms of rising bandpassed noise (250 → 3.2 kHz) and two detuned saws climbing two octaves
    // (A2 → A4) through an opening lowpass, all swelling into the hit: a sub thump, a click and a
    // D major chord (3 → 8 voices with intensity) whose tails hang for ~2.5 s.
    const t = v.t0;
    const rise = 0.6;
    const tr = t + rise;
    const sweep = v.gain(0);
    sweep.gain.setValueAtTime(0, t);
    sweep.gain.linearRampToValueAtTime(0.16, tr - 0.02);
    sweep.gain.linearRampToValueAtTime(0, tr + 0.01);
    const bp = v.filter('bandpass', 250, 1.2, sweep);
    glide(bp.frequency, t, 250, 3200, rise);
    v.play(v.noise(bp), t, tr + 0.02);
    const lp = v.filter('lowpass', 400, 1.0, sweep);
    glide(lp.frequency, t, 400, 3000, rise);
    const saws = v.gain(0.3, lp);
    for (const d of [-8, 8]) {
      const o = v.osc('sawtooth', A2, saws, d);
      glide(o.frequency, t, A2, A4, rise);
      v.play(o, t, tr + 0.02);
    }
    thud(v, tr, 0.3, 95, 38, 0.25, 0.2);
    click(v, tr, 0.08, 4000);
    const notes = [D4, A4, FS4, D5, A5, FS5, D3, D6];
    const n = 3 + Math.round(i * 5);
    const peak = 0.14 * Math.sqrt(3 / n);
    for (let k = 0; k < n; k++) {
      pad(v, notes[k], tr + k * 0.004, 0.45, peak * (k < 3 ? 1 : 0.7), 2.0, 0.02, 4);
    }
  },

  ante_miss(v) {
    // Three dry triangle notes falling E5 → C5 → A4, the last sagging 40 cents as it dies, over a
    // 1.4 s swell of an A2 saw with a Bb2 saw grinding against it through a dull lowpass.
    const t = v.t0;
    const bed = v.gain(0);
    const lp = v.filter('lowpass', 420, 0.9, bed);
    const mix = v.gain(0.4, lp);
    const end = swell(bed.gain, t, 0.16, 0.35, 0.65, 0.4);
    v.play(v.osc('sawtooth', A2, mix), t, end);
    v.play(v.osc('sawtooth', AS2, v.gain(0.5, mix)), t, end);
    tone(v, E5, t, 0.12, 0.01, 0.07, { type: 'triangle', cutoff: 1500 });
    tone(v, C5, t + 0.26, 0.12, 0.01, 0.07, { type: 'triangle', cutoff: 1400 });
    const t3 = t + 0.52;
    const out = v.gain(0);
    const o = v.osc('triangle', A4, v.filter('lowpass', 1200, 0.7, out));
    o.detune.setValueAtTime(0, t3);
    o.detune.linearRampToValueAtTime(-40, t3 + 0.6);
    v.play(o, t3, pluck(out.gain, t3, 0.13, 0.012, 0.14));
  },

  breath(v, i) {
    // The held breath: everything ducks to 15% under a 12 kHz sine at −40 dB. play() holds
    // 0.6 s at intensity 0 up to 2 s at 1; audio.holdBreath(ms) holds for exactly as long as asked.
    breath(v, 0.6 + 1.4 * i);
  },

  accident(v, i) {
    // Alarm: two 90 ms band-passed square tones a tritone apart (A5, then D#6 110 ms later),
    // then a low boom (105 → 36 Hz) with a puff of debris; intensity deepens and lengthens the boom.
    const t = v.t0;
    alarm(v, A5, t, 0.12);
    alarm(v, DS6, t + 0.11, 0.12);
    const tb = t + 0.24;
    const amt = 0.5 + 0.5 * i;
    thud(v, tb, 0.34 * amt, 105, 36, 0.3, 0.16 + 0.14 * i);
    dust(v, tb, 0.1 * amt, 0.06 + 0.06 * i);
  },

  accident_clear(v) {
    // The exhale: two soft sines stepping down (G4 → E4), each sagging 3% as it fades; ~300 ms.
    const t = v.t0;
    for (const [f, at, peak] of [
      [G4, t, 0.1],
      [E4, t + 0.14, 0.08],
    ]) {
      const out = v.gain(0);
      const o = v.osc('sine', f, out);
      glide(o.frequency, at, f, f * 0.97, 0.16);
      v.play(o, at, pluck(out.gain, at, peak, 0.02, 0.03));
    }
  },

  capital(v, i) {
    // Coin ping: sines at 2.1 and 3.2 kHz, the upper one quieter and dying faster.
    const t = v.t0;
    const vol = 0.8 + 0.4 * i;
    const a = v.gain(0);
    v.play(v.osc('sine', 2100, a), t, pluck(a.gain, t, 0.09 * vol, 0.002, 0.045));
    const b = v.gain(0);
    v.play(v.osc('sine', 3200, b), t, pluck(b.gain, t, 0.06 * vol, 0.002, 0.028));
  },

  retrigger(v, i) {
    // The slam again as an echo: half level, the fifth transposed up a fifth (A4 + E5), tail clipped
    // to 60%, and never the sub drop.
    slam(v, v.t0, i, { level: 0.5, pitch: 1.5, tail: 0.6, sub: false });
  },
};

/** One line per sound, for the docs. */
export const DESCRIPTIONS: Record<Sfx, string> = {
  slide: 'Card slides in: 120 ms of paper-like noise through a bandpass sweeping 1.1 → 2.6 kHz.',
  commit: 'Choice committed: a low sine thud falling 170 → 58 Hz with a 4 ms high-passed transient.',
  tick: 'Meter tick: a ~50 ms sine blip whose pitch rises with intensity (800 → 2400 Hz).',
  meter_up: 'Meter reaction up: two soft detuned-triangle notes rising a fifth (A4 → E5).',
  meter_down: 'Meter reaction down: the same motif falling a fourth (A4 → E4), darker on landing.',
  reveal: 'Hidden value revealed: glassy ascending sine arpeggio C5 E5 G5 B5 with octave partials.',
  roll: 'Odds roll: ~400 ms of narrow bandpassed noise sweeping up then settling, with a fast tremolo.',
  roll_success: 'Roll succeeded: a major resolve, G4 leading into a soft C major chord.',
  roll_fail: 'Roll failed: a minor fall, C5 down to A4 that sags a semitone as it dies.',
  near_miss: 'Near miss: an Asus4 held and creeping upward, then cut dead with a tiny click.',
  flashpoint_hit: 'Flashpoint hit: low boom (95 → 36 Hz), sub thump and a low-passed puff of noise.',
  offer: 'Posture offer: three soft bells (F#5 A5 C#6) with fast-decaying inharmonic partials.',
  act: 'New act: two-note brass-like motif (D3 → G3) on detuned saws through a blooming lowpass.',
  ring: 'Phone ring: 400 + 450 Hz with a 25 Hz warble in the classic double-ring cadence, twice, ~2.4 s.',
  nuclear: 'Nuclear ending: 1.5 s of silence, then one 55 Hz sine with faint low noise decaying over 6 s.',
  ending: 'Any other ending: a slow descending fifth (A4 → D4) on soft sine/triangle pads.',
  tally_tick: 'Tally count-up: a 25 ms sine blip rising 500 Hz → 2.2 kHz with intensity; escalation adds a faint detuned twin.',
  tally_mult: 'Tally mult stage: a heavier ~45 ms tick on two detuned triangles, 380 Hz → 1.3 kHz with intensity.',
  tally_slam: 'Base × mult slam: low thump, bright noise edge and a held bare fifth (D4 + A4); near 1 a sub drops 80 → 35 Hz.',
  ante_smash: 'Ante smashed: a 600 ms rising noise/saw sweep into a sub thump and a D major chord (3–8 voices) ringing ~2.5 s.',
  ante_miss: 'Ante missed: three dry triangle notes falling E5 → C5 → A4 (sagging) over a grinding A2/Bb2 saw swell, 1.4 s.',
  breath: 'Held breath: everything ducks to 15% (60 ms in, 400 ms out) under a barely audible 12 kHz sine; see holdBreath(ms).',
  accident: 'Accident fired: two 90 ms band-passed square tones a tritone apart (A5, D#6), then a low boom scaled by intensity.',
  accident_clear: 'Accident avoided: a soft two-note sine exhale stepping down G4 → E4, ~300 ms.',
  capital: 'Political capital gained: a coin-like ping of two sines at 2.1 and 3.2 kHz with fast decays.',
  retrigger: 'Retrigger: the slam echoed at half level, transposed up a fifth with a shortened tail and no sub.',
};
