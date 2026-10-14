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
  /** A number pops at its source (`pop` ms, rising `rise` pt), then flies to its box. */
  | { t: number; do: 'fly'; from: Anchor; box: Box; text: string; pop: number; rise: number; ms: number; big: boolean; weight: number }
  | { t: number; do: 'land'; box: Box; value: bigint; mult: boolean; weight: number }
  | { t: number; do: 'sound'; sfx: Sfx; intensity: number }
  | { t: number; do: 'buzz'; ms: number }
  | { t: number; do: 'shake'; px: number; ms: number }
  | { t: number; do: 'heat'; on: boolean }
  /** The held breath before the slam: both boxes pulse once. */
  | { t: number; do: 'breath' }
  | { t: number; do: 'slide' }
  | { t: number; do: 'collide' }
  | { t: number; do: 'mapFlash'; region: RegionId }
  /** A slam of 10x the target or more: the product stamped big over the map. */
  | { t: number; do: 'showcase'; r: number }
  /** The product flies from the readout (or the showcase) up to the Big Board. */
  | { t: number; do: 'print'; from: 'plate' | 'map'; ms: number }
  /** The board's total rolls up like an odometer; the progress rule and the ring follow. */
  | { t: number; do: 'roll'; ms: number }
  /** A clearing sweep: the clear's rising chord starts here so that it lands on CLEARED. */
  | { t: number; do: 'riser' }
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
  /** This sweep clears the crisis: the clear's chord is started ahead so it lands on CLEARED. */
  clears?: boolean;
  /** Playback speed (1, 2, 4): the chord's riser lasts the same real time at any speed. */
  rate?: number;
}

export interface Schedule {
  cues: Cue[];
  /** When the total has finished rolling up (the end of the scoring sequence). */
  end: number;
  /** When the boxes start sliding together. */
  slamAt: number;
  /** When the boxes collide (the slam lands). */
  hitAt: number;
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
/** A number pops at its source for 60 ms ('+w' rising 18 pt off the pin), then flies 200 ms. */
const POP_MS = 60;
const RISE_PT = 18;
const FLY_MS = 200;
const STANDBY_MS = 200;
const DESK_MS = 250;
/** The held breath: a beat between the last number landing and the boxes sliding together. */
export const HOLD_MS = 240;
const SLIDE_MS = 200;
/** After the hit the product plate is read for a moment before it flies to the board. */
const PRINT_AT = 120;
const PRINT_MS = 240;
/** A showcase slam (r >= 10) holds the big product over the map before it flies. */
const SHOWCASE_HOLD = 360;
const SHAKE_MS = 250;
/** Reduced motion: the scoring in 0.65 s, so the whole sequence, clear included, stays under 1.2 s. */
export const REDUCED_BUDGET = 650;
/** ante_smash's riser lasts 600 ms (real time) before its chord. */
export const RISER_MS = 600;

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

/** log10(leverage) / 9, clamped to 0..1: the spec's measure of a slam's size. */
export function sizeOf(leverage: bigint): number {
  if (leverage <= 1n) return 0;
  const digits = leverage.toString().length;
  // log10 from the leading digits is plenty for a volume.
  const lead = Number(leverage.toString().slice(0, 15));
  const log = Math.log10(lead) + (digits - Math.min(digits, 15));
  return Math.min(1, Math.max(0, log / 9));
}

/**
 * Slam loudness. The spec's log10(leverage) / 9 makes the first night's slams (180, 272) as quiet
 * as the lever's own thock, so the outcome leads: every slam starts at 0.45, a sweep that covers
 * what is left of the target adds 0.3, and size adds the last 0.25. A missed crisis's last sweep
 * keeps the plain size (no flourish).
 */
export function slamIntensity(leverage: bigint, r: number, quiet = false): number {
  const size = sizeOf(leverage);
  if (quiet) return size;
  return Math.min(1, Math.max(0.45, 0.45 + 0.3 * Math.min(1, r) + 0.25 * size));
}

/**
 * The roll on the Big Board: 320 ms, 400 when r >= 10. With the print before it this is spec 9's
 * cascade and tick, kept to 800 ms after the slam even for a showcase.
 */
export function rollMs(r: number): number {
  return r >= 10 ? 400 : 320;
}

/** tally_tick's pitch is 500 Hz x 4.4^i: the intensity that plays `hz`. */
function tickAt(hz: number): number {
  return Math.min(1, Math.max(0, Math.log(hz / 500) / Math.log(4.4)));
}

/** A major pentatonic from A5: A5 B5 C#6 E6 F#6 A6 B6. */
const PENTATONIC = [880, 987.77, 1108.73, 1318.51, 1479.98, 1760, 1975.53];

/**
 * The tick for the k-th of n scoring passes: one climb up the pentatonic from A5 across the whole
 * sweep, so a short sweep climbs as far as a long one.
 */
export function tickIntensity(k: number, n: number): number {
  const top = PENTATONIC.length - 1;
  const step = n <= 1 ? 0 : Math.round((Math.min(k, n - 1) * top) / (n - 1));
  return tickAt(PENTATONIC[step]);
}

/** An AGAIN repeats the previous note an octave up. */
export function octaveUp(i: number): number {
  return tickAt(500 * Math.pow(4.4, i) * 2);
}

/** A multiplier's size: x1.5 lands at 0.8, x2 at 1.0, x3 and up at 1.2. */
export function multWeight(factor: string): number {
  const f = Number(factor);
  if (!Number.isFinite(f)) return 1;
  return Math.min(1.2, Math.max(0.8, 0.6 + 0.2 * f));
}

/** Each multiplier in a sweep lands a semitone above the last (tally_mult is 380 Hz x 3.5^i). */
export function multPitch(nth: number): number {
  const semitone = Math.log(Math.pow(2, 1 / 12)) / Math.log(3.5);
  return Math.min(1, 0.45 + semitone * nth);
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

/** The scoring sequence from SWEEP pressed to the total having rolled up. */
export function sweepSchedule(input: SweepInput): Schedule {
  const { trace, leverage, target, totalBefore, reduced } = input;
  const parts = groupTrace(trace);
  const cues: Cue[] = [];
  const add = (c: Cue) => cues.push(c);
  const pop = reduced ? 0 : POP_MS;
  const fly = reduced ? 0 : FLY_MS;
  const need = target - totalBefore;
  // Held in an object: it is set inside the helpers below.
  const heat: { at: number | null } = { at: null };
  let lastLand = 0;
  let mults = 0;

  /** A number travels to its box and lands with its sound; reports the landing time. */
  const send = (t: number, from: Anchor, e: TraceEvent, rise: number, big: boolean, sound: boolean): number => {
    const box = boxOf(e);
    const mult = e.op === 'xM';
    const weight = mult ? multWeight(e.amount) : 1;
    const land = t + pop + fly;
    if (!reduced) add({ t, do: 'fly', from, box, text: flyText(e), pop, rise, ms: pop + fly, big, weight });
    add({ t: land, do: 'land', box, value: valueOf(e), mult, weight });
    // The hit is heard and felt when the number arrives, never when it leaves.
    if (sound && mult) {
      add({ t: land, do: 'sound', sfx: 'thump', intensity: 0.3 * weight });
      add({ t: land, do: 'sound', sfx: 'tally_mult', intensity: multPitch(mults++) });
      add({ t: land, do: 'buzz', ms: 12 });
      if (!reduced) add({ t: land, do: 'shake', px: 4, ms: 120 });
    } else if (sound) {
      add({ t: land, do: 'sound', sfx: 'tally_mult', intensity: 0.4 });
    }
    lastLand = Math.max(lastLand, land);
    checkHeat(e, land);
    return land;
  };
  const checkHeat = (e: TraceEvent, at: number) => {
    if (heat.at !== null || need <= 0n) return;
    if ((BigInt(e.I) * BigInt(e.M10)) / 10n >= need) heat.at = at;
  };

  // t = 0: the lever drops with its thock, everything not scoring fades.
  add({ t: 0, do: 'press' });
  add({ t: 0, do: 'sound', sfx: 'commit', intensity: 0.6 });
  add({ t: 0, do: 'buzz', ms: 15 });
  add({ t: 0, do: 'dim' });

  // 150 ms: the pattern stamps in and the boxes lock on the base values.
  const base = parts.pattern;
  if (base) {
    add({ t: STAMP_AT, do: 'stamp', name: input.patternName, level: base.level ?? 1 });
    add({ t: STAMP_AT, do: 'sound', sfx: 'stamp', intensity: 0.6 });
    add({ t: STAMP_AT, do: 'base', I: BigInt(base.I), M10: BigInt(base.M10) });
    checkHeat(base, STAMP_AT + 180);
  }

  // From 450 ms: the sweep events. The ticks climb a pentatonic across the sweep's own passes;
  // an AGAIN repeats the note before it an octave up.
  const plain = parts.passes.filter((g) => !g.again).length;
  let t = EVENTS_AT;
  let plainK = 0;
  let note = tickIntensity(0, plain);
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
      add({ t, do: 'sound', sfx: 'tally_tick', intensity: octaveUp(note) });
      if (g.again.seat !== undefined) add({ t, do: 'hop', seat: g.again.seat });
    } else {
      note = tickIntensity(plainK++, plain);
      add({ t, do: 'scan', region, again: false });
      add({ t, do: 'sound', sfx: 'tally_tick', intensity: note });
    }
    add({ t, do: 'flash', region });
    add({ t, do: 'buzz', ms: 8 });
    if (!p.dark && p.op === '+I') send(t, { region }, p, RISE_PT, false, false);

    for (const th of g.threads) {
      add({ t: at(THREAD_AT), do: 'thread', from: th.other!, to: region, amount: Number(th.amount) });
      if (th.amount !== '0') {
        // The pop shows on the thread; the box takes it just after the pin's own number lands.
        const land = Math.max(at(THREAD_AT) + 100 + (reduced ? 0 : 40), t + pop + fly + 30);
        add({ t: land, do: 'land', box: 'inf', value: BigInt(th.I), mult: false, weight: 1 });
        lastLand = Math.max(lastLand, land);
        checkHeat(th, land);
      }
    }
    for (const st of g.stamps) {
      const ts = at(STAMP_PULSE_AT);
      add({ t: ts, do: 'stampPulse', region });
      add({ t: ts, do: 'sound', sfx: 'tally_mult', intensity: 0.4 });
      const land = ts + (reduced ? 0 : 200);
      const mult = st.op === 'xM';
      add({ t: land, do: 'land', box: boxOf(st), value: valueOf(st), mult, weight: mult ? multWeight(st.amount) : 1 });
      lastLand = Math.max(lastLand, land);
      checkHeat(st, land);
    }
    g.staff.forEach((st, j) => {
      const ts = at(STAFF_AT + STAFF_GAP * j);
      add({ t: ts, do: 'hop', seat: st.seat! });
      send(ts, { seat: st.seat! }, st, 0, true, true);
    });
    t += d;
  });

  // Standby: 200 ms per firing region. Desk: 250 ms per firing staff.
  for (const e of parts.standby) {
    add({ t, do: 'standby', region: e.region! });
    add({ t, do: 'hop', seat: e.seat! });
    send(t, { region: e.region! }, e, 0, true, true);
    t += STANDBY_MS;
  }
  for (const e of parts.desk) {
    add({ t, do: 'hop', seat: e.seat! });
    send(t, { seat: e.seat! }, e, 0, true, true);
    t += DESK_MS;
  }

  // The held breath, then the slam.
  const r = shareOfNeed(leverage, target, totalBefore);
  const hold = reduced ? 0 : HOLD_MS;
  const slamAt = Math.max(t, lastLand + hold);
  if (heat.at !== null) add({ t: heat.at, do: 'heat', on: true });
  if (!reduced) add({ t: Math.max(lastLand + 40, slamAt - hold + 40), do: 'breath' });
  add({ t: slamAt, do: 'slide' });
  const hit = slamAt + (reduced ? 0 : SLIDE_MS);
  add({ t: hit, do: 'collide' });
  const loud = slamIntensity(leverage, r, input.quiet);
  add({ t: hit, do: 'sound', sfx: 'tally_slam', intensity: loud });
  add({ t: hit, do: 'sound', sfx: 'thump', intensity: loud });
  add({ t: hit, do: 'buzz', ms: 30 });
  add({ t: hit, do: 'release' });
  const showcase = !reduced && !input.quiet && r >= 10;
  if (!reduced && !input.quiet) {
    const px = shakeFor(r);
    if (px > 0) add({ t: hit, do: 'shake', px, ms: SHAKE_MS });
    if (r >= 10) add({ t: hit, do: 'mapFlash', region: input.topRegion });
  }
  if (showcase) add({ t: hit, do: 'showcase', r });

  // The product flies up to the Big Board, then the total rolls up to meet it.
  let rollAt = hit;
  if (!reduced) {
    const printAt = hit + (showcase ? SHOWCASE_HOLD : PRINT_AT);
    add({ t: printAt, do: 'print', from: showcase ? 'map' : 'plate', ms: PRINT_MS });
    rollAt = printAt + PRINT_MS;
  }
  const roll = rollMs(r);
  add({ t: rollAt, do: 'roll', ms: roll });
  const end = rollAt + roll;

  // A stable sort keeps same-time cues in the order they were added.
  cues.sort((a, b) => a.t - b.t);
  let sched: Schedule = { cues, end, slamAt, hitAt: hit, heatAt: heat.at, r, events: parts.passes.length };
  if (reduced && end > REDUCED_BUDGET) sched = scaleSchedule(sched, REDUCED_BUDGET / end);
  return input.clears ? withRiser(sched, input.rate ?? 1, reduced ? REDUCED_CLEARED_AT : CLEARED_AT) : sched;
}

/**
 * Start the clear's rising chord so that it lands on CLEARED (`clearedAt` into the outcome): the
 * riser lasts RISER_MS of real time, so at 2x it starts twice as many schedule-ms ahead. It never
 * starts before the slam has landed.
 */
export function withRiser(s: Schedule, rate: number, clearedAt: number): Schedule {
  const t = Math.max(s.hitAt, Math.round(s.end + clearedAt - RISER_MS * rate));
  const cues = [...s.cues, { t, do: 'riser' } as Cue].sort((a, b) => a.t - b.t);
  return { ...s, cues };
}

/** Scale every time (and every print / roll duration) by `k`. */
export function scaleSchedule(s: Schedule, k: number): Schedule {
  const cues = s.cues.map((c): Cue => {
    const t = Math.round(c.t * k);
    if (c.do === 'print' || c.do === 'roll') return { ...c, t, ms: Math.max(60, Math.round(c.ms * k)) };
    return { ...c, t };
  });
  return {
    ...s,
    cues,
    end: Math.round(s.end * k),
    slamAt: Math.round(s.slamAt * k),
    hitAt: Math.round(s.hitAt * k),
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
  | { t: number; do: 'lightsOut'; ms: number }
  | { t: number; do: 'card' }
  | { t: number; do: 'settle' }
  | { t: number; do: 'sound'; sfx: Sfx; intensity: number }
  | { t: number; do: 'buzz'; pattern: number[] };

export interface OutcomeInput {
  kind: 'clear' | 'miss' | 'carryOn';
  fundsBefore: number;
  fundsAfter: number;
  reduced: boolean;
  /** The clear's riser already started during the roll (false after a skip: it starts here). */
  riserPlayed?: boolean;
}

export interface Outcome {
  cues: OutcomeCue[];
  end: number;
}

/** CLEARED lands on the riser's chord, this far into the clear (reduced: at once). */
export const CLEARED_AT = 150;
export const REDUCED_CLEARED_AT = 0;
const COIN_GAP = 90;
/** After the fifth coin the rest come quicker. */
const COIN_GAP_FAST = 70;

/** CLEAR, MISS or a plain carry-on, timed per spec 9. */
export function outcomeSchedule(input: OutcomeInput): Outcome {
  const cues: OutcomeCue[] = [];
  const add = (c: OutcomeCue) => cues.push(c);
  const r = input.reduced;
  if (input.kind === 'carryOn') {
    add({ t: 0, do: 'settle' });
    return { cues, end: r ? 60 : 180 };
  }
  if (input.kind === 'miss') {
    add({ t: 0, do: 'settle' });
    add({ t: 0, do: 'sound', sfx: 'ante_miss', intensity: 0.8 });
    add({ t: 0, do: 'buzz', pattern: [60, 80, 140] });
    const lights = r ? 120 : 2000;
    add({ t: 0, do: 'lightsOut', ms: lights });
    add({ t: lights + (r ? 50 : 150), do: 'card' });
    return { cues, end: lights + (r ? 130 : 450) };
  }
  // CLEAR: the ring collapses and the shockwave rolls as the chord lands with CLEARED; the brass pin
  // gets its own beat; then the coins, then the tray.
  const clearedAt = r ? REDUCED_CLEARED_AT : CLEARED_AT;
  add({ t: 0, do: 'settle' });
  if (!input.riserPlayed) add({ t: 0, do: 'sound', sfx: 'ante_smash', intensity: 0.8 });
  add({ t: Math.max(0, clearedAt - (r ? 0 : 150)), do: 'collapse' });
  add({ t: Math.max(0, clearedAt - (r ? 0 : 150)), do: 'shockwave' });
  add({ t: clearedAt, do: 'cleared' });
  add({ t: clearedAt, do: 'buzz', pattern: [20, 40, 60] });
  const dropAt = clearedAt + (r ? 40 : 300);
  add({ t: dropAt, do: 'drop' });
  // The pin lands 250 ms into its fall.
  const landAt = dropAt + (r ? 0 : 250);
  add({ t: landAt, do: 'sound', sfx: 'tally_slam', intensity: 0.3 });
  add({ t: landAt, do: 'buzz', pattern: [20] });
  const coinsAt = r ? dropAt + 20 : landAt + 100;
  const coins = Math.max(0, input.fundsAfter - input.fundsBefore);
  // Reduced motion: every coin still clicks, but all within a fifth of a second.
  const gapAt = (i: number) => (r ? i * Math.min(30, Math.floor(200 / Math.max(1, coins))) : Math.min(i, 4) * COIN_GAP + Math.max(0, i - 4) * COIN_GAP_FAST);
  for (let i = 0; i < coins; i++) {
    add({ t: coinsAt + gapAt(i), do: 'coin', funds: input.fundsBefore + i + 1 });
    add({ t: coinsAt + gapAt(i), do: 'sound', sfx: 'capital', intensity: 0.5 });
  }
  const coinsEnd = coinsAt + gapAt(Math.max(0, coins - 1));
  const riseAt = coinsEnd + (r ? 20 : 300);
  add({ t: riseAt, do: 'rise' });
  add({ t: riseAt, do: 'sound', sfx: 'offer', intensity: 0.5 });
  cues.sort((a, b) => a.t - b.t);
  return { cues, end: riseAt + (r ? 80 : 300) };
}
