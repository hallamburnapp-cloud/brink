/**
 * BRINK sound module — everything synthesised with the Web Audio API.
 *
 *   voices → bus → gentle compressor → master (volume / mute) → destination
 *
 * Nothing touches the AudioContext at import time. `audio.unlock()` on the first
 * user gesture creates and resumes it; before that, one-shots are dropped while
 * the heartbeat, pulse and drone remember their desired state and start once
 * unlocked. Wherever Web Audio is missing (SSR, Node tests, old browsers) every
 * method is a silent no-op. Nothing in here throws out to the game.
 *
 * The scoring loop adds a held breath (`holdBreath`, which ducks the bus), a
 * continuous escalation pulse (`pulse`, sharing the heartbeat scheduler) and a
 * global intensity (`setIntensity`) that colours the drone and the tally sounds.
 *
 * Mute persists in localStorage under 'brink.audio.muted'.
 */
import { audioContextCtor, clamp01, createEngine, type Engine } from './engine';
import { Voice } from './voice';
import { DESCRIPTIONS, RECIPES, breath, setGlobalIntensity, type Sfx } from './sfx';
import { Heartbeat } from './heartbeat';
import { Drone } from './drone';
import { readMuted, writeMuted } from './storage';

export type { Sfx } from './sfx';

export interface AudioApi {
  /** Call on the first user gesture; creates/resumes the AudioContext lazily. Safe to call repeatedly. */
  unlock(): void;
  play(sfx: Sfx, opts?: { intensity?: number }): void;
  /** Timer heartbeat: set beats per minute (accelerates as the timer runs out); null stops it. Uses a scheduled low double-thump. */
  heartbeat(bpm: number | null): void;
  /**
   * Escalation pulse: a continuous heartbeat for escalation above 80. Shares the scheduler with the
   * timer heartbeat but is its own source: stopping one never stops the other, and when both are set
   * the faster tempo plays. null stops it.
   */
  pulse(bpm: number | null): void;
  /** Flashpoint drone: a low detuned drone with slow LFO; intensity 0..1 scales volume and filter. Ramp smoothly on/off over ~600ms. */
  drone(on: boolean, intensity?: number): void;
  /**
   * The held breath before an accident roll: not silence but the absence of the drone. Ducks the bus
   * to 15% for `ms` (60 ms in, 400 ms back) under a barely audible 12 kHz sine that stops when the
   * breath ends. Non-positive or non-finite durations are ignored; long ones are capped at 8 s.
   */
  holdBreath(ms: number): void;
  /** Global escalation 0..1: gently raises the drone's filter and adds a faint detune to the tally sounds. */
  setIntensity(escalation01: number): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  /** Master volume 0..1 (default 0.8). */
  setVolume(v: number): void;
}

const DEFAULT_VOLUME = 0.8;
const MAX_BREATH_S = 8;

function noop(): void {}

/** Runs `fn`, swallowing anything it throws: audio must never break the game. */
function safe(fn: () => void): void {
  try {
    fn();
  } catch {
    /* ignored */
  }
}

class BrinkAudio implements AudioApi {
  private engine: Engine | null = null;
  private unsupported = false;
  /** null until first read, so a late-installed localStorage stub is still honoured. */
  private muted: boolean | null = null;
  private volume = DEFAULT_VOLUME;
  private readonly beat = new Heartbeat(
    () => this.engine,
    () => this.isMuted(),
  );
  private readonly hum = new Drone(() => this.engine);

  unlock(): void {
    safe(() => {
      if (this.unsupported) return;
      if (!this.engine) {
        if (!audioContextCtor()) {
          this.unsupported = true;
          return;
        }
        const eng = createEngine(this.isMuted() ? 0 : this.volume);
        if (!eng) return; // construction failed this time; a later gesture may succeed
        this.engine = eng;
        this.beat.resume();
        this.hum.resume();
      }
      const { ctx } = this.engine;
      if (ctx.state !== 'running' && typeof ctx.resume === 'function') {
        ctx.resume().catch(noop);
      }
    });
  }

  play(sfx: Sfx, opts?: { intensity?: number }): void {
    safe(() => {
      if (!Object.prototype.hasOwnProperty.call(RECIPES, sfx)) return;
      this.oneShot((v) => RECIPES[sfx](v, clamp01(opts?.intensity ?? 0.5)));
    });
  }

  heartbeat(bpm: number | null): void {
    safe(() => this.beat.set(bpm));
  }

  pulse(bpm: number | null): void {
    safe(() => this.beat.pulse(bpm));
  }

  drone(on: boolean, intensity?: number): void {
    safe(() => this.hum.set(on, intensity));
  }

  holdBreath(ms: number): void {
    safe(() => {
      if (!Number.isFinite(ms) || ms <= 0) return;
      const seconds = Math.min(MAX_BREATH_S, ms / 1000);
      this.oneShot((v) => breath(v, seconds));
    });
  }

  setIntensity(escalation01: number): void {
    safe(() => {
      if (!Number.isFinite(escalation01)) return;
      const i = clamp01(escalation01);
      setGlobalIntensity(i);
      this.hum.setGlobal(i);
    });
  }

  setMuted(muted: boolean): void {
    safe(() => {
      this.muted = !!muted;
      writeMuted(this.muted);
      this.applyMaster();
    });
  }

  isMuted(): boolean {
    try {
      if (this.muted === null) this.muted = readMuted();
      return this.muted;
    } catch {
      return false;
    }
  }

  setVolume(v: number): void {
    safe(() => {
      if (!Number.isFinite(v)) return;
      this.volume = clamp01(v);
      this.applyMaster();
    });
  }

  /**
   * Builds a one-shot voice starting a hair from now and lets `build` fill it; dropped
   * outright when there is no engine yet or we are muted, disposed if `build` throws.
   */
  private oneShot(build: (v: Voice) => void): void {
    const eng = this.engine;
    if (!eng || this.isMuted()) return;
    const { ctx } = eng;
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(noop);
    }
    const voice = new Voice(eng, ctx.currentTime + 0.01);
    try {
      build(voice);
      voice.finish();
    } catch {
      voice.dispose();
    }
  }

  private applyMaster(): void {
    const eng = this.engine;
    if (!eng) return;
    const now = eng.ctx.currentTime;
    const target = this.isMuted() ? 0 : this.volume;
    eng.master.gain.cancelScheduledValues(now);
    eng.master.gain.setTargetAtTime(target, now, 0.02);
  }
}

export const audio: AudioApi = new BrinkAudio();

/** One line per sound, for the docs. */
export function describeSounds(): Record<Sfx, string> {
  return { ...DESCRIPTIONS };
}
