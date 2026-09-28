/**
 * One-shot sound recipes. Everything is synthesised: sines, triangles, a little
 * detuned saw, filtered white noise and short gain envelopes. Nothing squarish.
 *
 * Each recipe receives a `Voice` (pre-seeded with a start time `v.t0`) and an
 * intensity in 0..1, builds its nodes through the voice so they are tracked and
 * released together, and schedules everything relative to `v.t0`.
 *
 * Level guide: individual voices peak around 0.1–0.3 before the compressor and
 * the 0.8 master, which lands the mix in the −12 dBFS neighbourhood.
 */
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
  | 'ending';

export type Recipe = (v: Voice, intensity: number) => void;

/* ───────────────────────── pitch table (Hz) ───────────────────────── */
const D3 = 146.83;
const G3 = 196.0;
const A3 = 220.0;
const D4 = 293.66;
const E4 = 329.63;
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

/** A sustained pad note: sine + triangle a few cents apart through a soft lowpass. */
function pad(v: Voice, freq: number, at: number, hold: number, peak: number, release: number): number {
  const out = v.gain(0);
  const lp = v.filter('lowpass', 1600, 0.6, out);
  const mix = v.gain(0.5, lp);
  const attack = 0.12;
  const end = swell(out.gain, at, peak, attack, Math.max(0.05, hold - attack), release);
  v.play(v.osc('sine', freq, mix, -3), at, end);
  v.play(v.osc('triangle', freq, mix, 3), at, end);
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
    const dust = v.gain(0);
    const lp = v.filter('lowpass', 900, 0.8, dust);
    glide(lp.frequency, t, 900, 180, 0.3);
    const end = pluck(dust.gain, t, 0.13 * amt, 0.008, 0.09);
    v.play(v.noise(lp), t, end);
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
};
