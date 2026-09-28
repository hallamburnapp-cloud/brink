/**
 * The shared Web Audio graph behind every BRINK sound.
 *
 *   voices ─▶ bus (GainNode, unity) ─▶ compressor (gentle) ─▶ master (volume / mute) ─▶ destination
 *
 * Nothing here runs at import time. `createEngine()` is only invoked from
 * `audio.unlock()` on the first user gesture, and returns null wherever the
 * Web Audio API is missing (SSR, Node tests, very old browsers).
 */

export interface Engine {
  readonly ctx: AudioContext;
  /** Single entry point for every voice. */
  readonly bus: GainNode;
  readonly compressor: DynamicsCompressorNode;
  /** Master volume; also carries mute (ramped to 0). */
  readonly master: GainNode;
  /** Two seconds of deterministic white noise, looped by noise voices. */
  readonly noise: AudioBuffer;
}

type AudioContextCtor = new () => AudioContext;

/** Returns the AudioContext constructor if this runtime has one, else null. */
export function audioContextCtor(): AudioContextCtor | null {
  try {
    const g = globalThis as unknown as {
      AudioContext?: AudioContextCtor;
      webkitAudioContext?: AudioContextCtor;
    };
    const ctor = g.AudioContext ?? g.webkitAudioContext ?? null;
    return typeof ctor === 'function' ? ctor : null;
  } catch {
    return null;
  }
}

/**
 * Builds the context and the master chain. `initialMaster` is the gain the
 * master node starts at (0 when muted, otherwise the volume).
 */
export function createEngine(initialMaster: number): Engine | null {
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  try {
    const ctx = new Ctor();

    const bus = ctx.createGain();
    bus.gain.value = 1;

    // Gentle glue: catches the occasional stacked transient without pumping.
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;

    const master = ctx.createGain();
    master.gain.value = clamp01(initialMaster);

    bus.connect(compressor);
    compressor.connect(master);
    master.connect(ctx.destination);

    return { ctx, bus, compressor, master, noise: makeNoise(ctx, 2) };
  } catch {
    return null;
  }
}

/** White noise from a fixed-seed xorshift so the texture is identical on every run. */
function makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate || 44100;
  const length = Math.max(1, Math.floor(rate * seconds));
  const buffer = ctx.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  let s = 0x9e3779b9;
  for (let i = 0; i < length; i++) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    data[i] = ((s >>> 0) / 0xffffffff) * 2 - 1;
  }
  return buffer;
}

export function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

/**
 * Smoothly moves an AudioParam from wherever it currently is to `value` over
 * `seconds`. Cancels pending automation first so repeated calls never fight.
 */
export function rampTo(param: AudioParam, value: number, now: number, seconds: number): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + Math.max(0.005, seconds));
}
