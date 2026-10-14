/**
 * The scoring animation as data (spec section 9). A sweep's trace becomes a list of timed cues;
 * the player (play.ts) turns cues into map effects, flying numbers, sounds and haptics. Keeping
 * the timing pure means it can be tested against the spec's reference durations without a DOM.
 *
 * All times are milliseconds at 1x. The player divides them by the speed (2x, 4x).
 */
import type { RegionId, TraceEvent } from '../../engine';
import type { Sfx } from '../../../audio';

export type Box = 'inf' | 'mom';
export type Anchor = { region: RegionId } | { seat: number };

export type Cue =
  | { t: number; do: 'press' }
  | { t: number; do: 'dim' }
  | { t: number; do: 'stamp'; name: string; level: number }
  | { t: number; do: 'base'; I: bigint; M10: bigint }
  | { t: number; do: 'scan'; region: RegionId; again: boolean }
  | { t: number; do: 'flash'; region: RegionId }
  | { t: number; do: 'thread'; from: RegionId; to: RegionId; amount: number }
  | { t: number; do: 'stampPulse'; region: RegionId }
  | { t: number; do: 'standby'; region: RegionId }
  | { t: number; do: 'hop'; seat: number }
  | { t: number; do: 'fly'; from: Anchor; box: Box; text: string; rise: boolean; ms: number; big: boolean }
  | { t: number; do: 'land'; box: Box; value: bigint; mult: boolean }
  | { t: number; do: 'sound'; sfx: Sfx; intensity: number }
  | { t: number; do: 'buzz'; ms: number }
  | { t: number; do: 'shake'; px: number; ms: number }
  | { t: number; do: 'heat'; on: boolean }
  | { t: number; do: 'slide' }
  | { t: number; do: 'collide' }
  | { t: number; do: 'mapFlash'; region: RegionId }
  | { t: number; do: 'cascade'; ms: number }
  | { t: number; do: 'tick'; ms: number }
  | { t: number; do: 'release' };

export type CueKind = Cue['do'];

export interface SweepInput {
  trace: readonly TraceEvent[];
  leverage: bigint;
  target: bigint;
  totalBefore: bigint;
  topRegion: RegionId;
  /** The pattern's display name ('NETWORK'). */
  patternName: string;
  reduced: boolean;
  /** The last sweep of a missed crisis: no slam flourish (no shake, no flash). */
  quiet?: boolean;
}

export interface Schedule {
  cues: Cue[];
  /** When the total has finished ticking up (the end of the scoring sequence). */
  end: number;
  /** When the boxes start sliding together. */
  slamAt: number;
  /** When HEAT switches on, or null if this sweep does not reach the target. */
  heatAt: number | null;
  /** leverage / (target - total before), the shake scale. */
  r: number;
  /** Number of sweep events (scoring passes, AGAINs included). */
  events: number;
}

// ---------------------------------------------------------------- spec constants (1x)

export const DIM_MS = 150;
export const STAMP_AT = 150;
export const EVENTS_AT = 450;
const THREAD_AT = 60;
const STAMP_PULSE_AT = 100;
const STAFF_AT = 120;
const STAFF_GAP = 60;
/** '+w' rises 18 pt for 60 ms, then flies 200 ms to the Influence box. */
const RISE_MS = 60;
const FLY_MS = 200;
const STANDBY_MS = 200;
const DESK_MS = 250;
const SLIDE_MS = 200;
const AFTER_SLAM_MS = 200;
const SHAKE_MS = 250;
/** Reduced motion: the scoring in 0.72 s, so the whole sequence, clear included, stays under 1.2 s. */
const REDUCED_BUDGET = 720;

/** Duration of sweep event k (0-based): 320 ms, 6% quicker each, floor 120; from the 13th, 60 ms. */
export function eventDuration(k: number): number {
  if (k >= 12) return 60;
  return Math.max(120, Math.round(320 * Math.pow(0.94, k)));
}

/** Shake amplitude for a slam with share r of the target still left (spec 9). */
export function shakeFor(r: number): number {
  if (r < 0.25) return 0;
  if (r < 1) return 2;
  if (r < 10) return 5;
  return 9;
}

/** r = leverage / (target - total before), as a float good to 1e-4. */
export function shareOfNeed(leverage: bigint, target: bigint, totalBefore: bigint): number {
  const need = target - totalBefore;
  if (need <= 0n) return Infinity;
  return Number((leverage * 10_000n) / need) / 10_000;
}

/** Slam loudness: min(1, log10(leverage) / 9). */
export function slamIntensity(leverage: bigint): number {
  if (leverage <= 1n) return 0;
  const digits = leverage.toString().length;
  // log10 from the leading digits is plenty for a volume.
  const lead = Number(leverage.toString().slice(0, 15));
  const log = Math.log10(lead) + (digits - Math.min(digits, 15));
  return Math.min(1, Math.max(0, log / 9));
}

/** The Big Board cascade: 400 ms, 600 from 1e6. Then the tick: 300 ms, 600 when r >= 10. */
export function cascadeMs(leverage: bigint): number {
  return leverage >= 1_000_000n ? 600 : 400;
}
export function tickMs(r: number): number {
  return r >= 10 ? 600 : 300;
}

// ---------------------------------------------------------------- trace grouping

/** One sweep event: a scoring pass, with the again marker that started it (if any). */
export interface PassGroup {
  again: TraceEvent | null;
  pin: TraceEvent;
  threads: TraceEvent[];
  stamps: TraceEvent[];
  staff: TraceEvent[];
}

export interface TraceParts {
  pattern: TraceEvent | null;
  passes: PassGroup[];
  standby: TraceEvent[];
  desk: TraceEvent[];
  slam: TraceEvent | null;
}

/** Split a trace into the spec's phases. Every scoring pass, AGAINs included, is one event. */
export function groupTrace(trace: readonly TraceEvent[]): TraceParts {
  const parts: TraceParts = { pattern: null, passes: [], standby: [], desk: [], slam: null };
  let pendingAgain: TraceEvent | null = null;
  let cur: PassGroup | null = null;
  for (const e of trace) {
    switch (e.phase) {
      case 'pattern':
        parts.pattern = e;
        break;
      case 'again':
        pendingAgain = e;
        cur = null;
        break;
      case 'pin':
        cur = { again: pendingAgain, pin: e, threads: [], stamps: [], staff: [] };
        pendingAgain = null;
        parts.passes.push(cur);
        break;
      case 'thread':
        cur?.threads.push(e);
        break;
      case 'stamp':
        cur?.stamps.push(e);
        break;
      case 'staff':
        cur?.staff.push(e);
        break;
      case 'standby':
        parts.standby.push(e);
        break;
      case 'desk':
        parts.desk.push(e);
        break;
      case 'slam':
        parts.slam = e;
        break;
    }
  }
  return parts;
}

// ---------------------------------------------------------------- labels

/** What a number flying to a box reads: '+15', '+4', 'x2', 'x1.5'. */
export function flyText(e: TraceEvent): string {
  if (e.op === 'xM') return `×${e.amount}`;
  return `+${e.amount}`;
}

function boxOf(e: TraceEvent): Box {
  return e.op === '+I' ? 'inf' : 'mom';
}

function valueOf(e: TraceEvent): bigint {
  return BigInt(e.op === '+I' ? e.I : e.M10);
}

// ---------------------------------------------------------------- the schedule

/** The scoring sequence from SWEEP pressed to the total having ticked up. */
export function sweepSchedule(input: SweepInput): Schedule {
  const { trace, leverage, target, totalBefore, reduced } = input;
  const parts = groupTrace(trace);
  const cues: Cue[] = [];
  const add = (c: Cue) => cues.push(c);
  const rise = reduced ? 0 : RISE_MS;
  const fly = reduced ? 0 : FLY_MS;
  const need = target - totalBefore;
  // Held in an object: it is set inside the helpers below.
  const heat: { at: number | null } = { at: null };
  let lastLand = 0;

  /** A number travels to its box and lands; reports the landing time. */
  const send = (t: number, from: Anchor, e: TraceEvent, withRise: boolean, big: boolean): number => {
    const box = boxOf(e);
    const land = t + (withRise ? rise : 0) + fly;
    if (!reduced) add({ t, do: 'fly', from, box, text: flyText(e), rise: withRise, ms: fly + (withRise ? rise : 0), big });
    add({ t: land, do: 'land', box, value: valueOf(e), mult: e.op === 'xM' });
    lastLand = Math.max(lastLand, land);
    checkHeat(e, land);
    return land;
  };
  const checkHeat = (e: TraceEvent, at: number) => {
    if (heat.at !== null || need <= 0n) return;
    if ((BigInt(e.I) * BigInt(e.M10)) / 10n >= need) heat.at = at;
  };
  const staffSound = (t: number, e: TraceEvent) => {
    const mult = e.op === 'xM';
    add({ t, do: 'sound', sfx: 'tally_mult', intensity: mult ? 1 : 0.4 });
    if (mult && !reduced) add({ t: t + fly, do: 'shake', px: 2, ms: 80 });
  };

  // t = 0: the lever drops, everything not scoring fades.
  add({ t: 0, do: 'press' });
  add({ t: 0, do: 'sound', sfx: 'tally_slam', intensity: 0.1 });
  add({ t: 0, do: 'buzz', ms: 15 });
  add({ t: 0, do: 'dim' });

  // 150 ms: the pattern stamps in, the boxes flip to the base values.
  const base = parts.pattern;
  if (base) {
    add({ t: STAMP_AT, do: 'stamp', name: input.patternName, level: base.level ?? 1 });
    add({ t: STAMP_AT, do: 'sound', sfx: 'tally_slam', intensity: 0.2 });
    add({ t: STAMP_AT, do: 'base', I: BigInt(base.I), M10: BigInt(base.M10) });
    checkHeat(base, STAMP_AT + 180);
  }

  // From 450 ms: the sweep events.
  let t = EVENTS_AT;
  parts.passes.forEach((g, k) => {
    const d = eventDuration(k);
    const p = g.pin;
    const region = p.region!;
    // Sub-steps fit inside the event: compress their offsets when the event is short.
    const lastOffset = g.staff.length ? STAFF_AT + STAFF_GAP * (g.staff.length - 1) : g.stamps.length ? STAMP_PULSE_AT : g.threads.length ? THREAD_AT : 0;
    const f = lastOffset > 0 ? Math.min(1, Math.max(0, d - 20) / lastOffset) : 1;
    const at = (offset: number) => t + Math.round(offset * f);

    if (g.again) {
      add({ t, do: 'scan', region, again: true });
      add({ t, do: 'sound', sfx: 'retrigger', intensity: 0.6 });
      if (g.again.seat !== undefined) add({ t, do: 'hop', seat: g.again.seat });
    } else {
      add({ t, do: 'scan', region, again: false });
    }
    add({ t, do: 'flash', region });
    add({ t, do: 'sound', sfx: 'tally_tick', intensity: Math.min(1, k / 12) });
    add({ t, do: 'buzz', ms: 8 });
    if (!p.dark && p.op === '+I') send(t, { region }, p, true, false);

    for (const th of g.threads) {
      add({ t: at(THREAD_AT), do: 'thread', from: th.other!, to: region, amount: Number(th.amount) });
      if (th.amount !== '0') {
        // The pop shows on the thread; the box takes it just after the pin's own number lands.
        const land = Math.max(at(THREAD_AT) + 100 + (reduced ? 0 : 40), t + rise + fly + 30);
        add({ t: land, do: 'land', box: 'inf', value: BigInt(th.I), mult: false });
        lastLand = Math.max(lastLand, land);
        checkHeat(th, land);
      }
    }
    for (const st of g.stamps) {
      const ts = at(STAMP_PULSE_AT);
      add({ t: ts, do: 'stampPulse', region });
      add({ t: ts, do: 'sound', sfx: 'tally_mult', intensity: 0.4 });
      const land = ts + (reduced ? 0 : 200);
      add({ t: land, do: 'land', box: boxOf(st), value: valueOf(st), mult: st.op === 'xM' });
      lastLand = Math.max(lastLand, land);
      checkHeat(st, land);
    }
    g.staff.forEach((st, j) => {
      const ts = at(STAFF_AT + STAFF_GAP * j);
      if (st.seat !== undefined) {
        add({ t: ts, do: 'hop', seat: st.seat });
        send(ts, { seat: st.seat }, st, false, true);
      }
      staffSound(ts, st);
    });
    t += d;
  });

  // Standby: 200 ms per firing region. Desk: 250 ms per firing staff.
  for (const e of parts.standby) {
    add({ t, do: 'standby', region: e.region! });
    if (e.seat !== undefined) add({ t, do: 'hop', seat: e.seat });
    send(t, { region: e.region! }, e, false, true);
    staffSound(t, e);
    t += STANDBY_MS;
  }
  for (const e of parts.desk) {
    if (e.seat !== undefined) {
      add({ t, do: 'hop', seat: e.seat });
      send(t, { seat: e.seat }, e, false, true);
    }
    staffSound(t, e);
    t += DESK_MS;
  }

  // The slam.
  const r = shareOfNeed(leverage, target, totalBefore);
  const slamAt = Math.max(t, lastLand + 40);
  if (heat.at !== null) add({ t: heat.at, do: 'heat', on: true });
  add({ t: slamAt, do: 'slide' });
  const hit = slamAt + (reduced ? 0 : SLIDE_MS);
  add({ t: hit, do: 'collide' });
  add({ t: hit, do: 'heat', on: false });
  add({ t: hit, do: 'sound', sfx: 'tally_slam', intensity: slamIntensity(leverage) });
  add({ t: hit, do: 'buzz', ms: 30 });
  add({ t: hit, do: 'release' });
  if (!reduced && !input.quiet) {
    const px = shakeFor(r);
    if (px > 0) add({ t: hit, do: 'shake', px, ms: SHAKE_MS });
    if (r >= 10) add({ t: hit, do: 'mapFlash', region: input.topRegion });
  }

  const cascadeAt = hit + AFTER_SLAM_MS;
  const cMs = cascadeMs(leverage);
  add({ t: cascadeAt, do: 'cascade', ms: cMs });
  const tickAt = cascadeAt + cMs;
  const tMs = tickMs(r);
  add({ t: tickAt, do: 'tick', ms: tMs });
  const end = tickAt + tMs;

  // A stable sort keeps same-time cues in the order they were added.
  cues.sort((a, b) => a.t - b.t);
  const sched: Schedule = { cues, end, slamAt, heatAt: heat.at, r, events: parts.passes.length };
  return reduced && end > REDUCED_BUDGET ? scaleSchedule(sched, REDUCED_BUDGET / end) : sched;
}

/** Scale every time (and every cascade / tick duration) by `k`. */
export function scaleSchedule(s: Schedule, k: number): Schedule {
  const cues = s.cues.map((c): Cue => {
    const t = Math.round(c.t * k);
    if (c.do === 'cascade' || c.do === 'tick') return { ...c, t, ms: Math.max(60, Math.round(c.ms * k)) };
    return { ...c, t };
  });
  return {
    ...s,
    cues,
    end: Math.round(s.end * k),
    slamAt: Math.round(s.slamAt * k),
    heatAt: s.heatAt === null ? null : Math.round(s.heatAt * k),
  };
}

// ---------------------------------------------------------------- after the slam

export type OutcomeCue =
  | { t: number; do: 'collapse' }
  | { t: number; do: 'shockwave' }
  | { t: number; do: 'cleared' }
  | { t: number; do: 'drop' }
  | { t: number; do: 'coin'; funds: number }
  | { t: number; do: 'rise' }
  | { t: number; do: 'lightsOut' }
  | { t: number; do: 'card' }
  | { t: number; do: 'settle' }
  | { t: number; do: 'sound'; sfx: Sfx; intensity: number };

export interface OutcomeInput {
  kind: 'clear' | 'miss' | 'carryOn';
  fundsBefore: number;
  fundsAfter: number;
  reduced: boolean;
}

export interface Outcome {
  cues: OutcomeCue[];
  end: number;
}

const COIN_GAP = 90;

/** CLEAR, MISS or a plain carry-on, timed per spec 9. */
export function outcomeSchedule(input: OutcomeInput): Outcome {
  const cues: OutcomeCue[] = [];
  const add = (c: OutcomeCue) => cues.push(c);
  if (input.kind === 'carryOn') {
    add({ t: 0, do: 'settle' });
    return { cues, end: 180 };
  }
  if (input.kind === 'miss') {
    add({ t: 0, do: 'settle' });
    add({ t: 0, do: 'sound', sfx: 'ante_miss', intensity: 0.8 });
    add({ t: 0, do: 'lightsOut' });
    const lights = input.reduced ? 300 : 2000;
    add({ t: lights + 150, do: 'card' });
    return { cues, end: lights + 450 };
  }
  const r = input.reduced;
  add({ t: 0, do: 'settle' });
  add({ t: 0, do: 'collapse' });
  add({ t: 0, do: 'sound', sfx: 'ante_smash', intensity: 0.8 });
  add({ t: 0, do: 'shockwave' });
  add({ t: r ? 0 : 150, do: 'cleared' });
  const dropAt = r ? 60 : 300;
  add({ t: dropAt, do: 'drop' });
  add({ t: dropAt + (r ? 0 : 250), do: 'sound', sfx: 'tally_slam', intensity: 0.15 });
  const coinsAt = r ? 60 : 650;
  const coins = Math.max(0, input.fundsAfter - input.fundsBefore);
  // Reduced motion: every coin still clicks, but all within a fifth of a second.
  const gap = r ? Math.min(30, Math.floor(200 / Math.max(1, coins))) : COIN_GAP;
  for (let i = 1; i <= coins; i++) {
    add({ t: coinsAt + gap * (i - 1), do: 'coin', funds: input.fundsBefore + i });
    add({ t: coinsAt + gap * (i - 1), do: 'sound', sfx: 'capital', intensity: 0.5 });
  }
  const coinsEnd = coinsAt + gap * Math.max(0, coins - 1);
  const riseAt = coinsEnd + (r ? 40 : 400);
  add({ t: riseAt, do: 'rise' });
  add({ t: riseAt, do: 'sound', sfx: 'offer', intensity: 0.5 });
  return { cues, end: riseAt + (r ? 80 : 300) };
}
