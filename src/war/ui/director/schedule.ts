/**
 * The send, as data (SPEC section 8, "On SEND" and the outcomes). A send's trace becomes a list of
 * timed cues for the cascade (dim, scan, pins, staff, the crisis ×2, the slam, the score flying into
 * the ring), and its record becomes the outcome's cues (gold ink region by region, red ink, war
 * spreading by itself, the ending). The player (play.ts) turns cues into map effects, flying
 * numbers, sounds and haptics. Keeping the timing pure means it is tested without a DOM.
 *
 * All times are milliseconds at 1x. The player divides them by the speed (2x, 4x).
 */
import type { Sfx } from '../../../audio';
import { formatInt } from '../../engine';
import type {
  CrisisEvent,
  Ending,
  PinEvent,
  RegionId,
  RegionStaffEvent,
  StaffEvent,
  TraceEvent,
  WarTake,
  WonRegion,
} from '../../engine';

export type Box = 'points' | 'mult';
/** Where a flying number starts: a pin on the map, under a seat's chip, or the ring's ×2 chip. */
export type Anchor = { region: RegionId } | { seat: number } | { ringChip: RegionId };
/** How a flying number is drawn: a pin's '+6', its smaller '+1', a staff's fling, a region's ×, the ring's ×2. */
export type Look = 'pin' | 'one' | 'staff' | 'pop' | 'crisis';

export type Cue =
  /** The SEND lever goes down. */
  | { t: number; do: 'press' }
  /** Everything but the pins fades (150 ms). */
  | { t: number; do: 'dim' }
  | { t: number; do: 'scan'; region: RegionId }
  /** The pins are done: the scan line leaves the map while the rail takes over. */
  | { t: number; do: 'scanOff' }
  | { t: number; do: 'flash'; region: RegionId }
  /** A seat hops (`isNew`: its first firing since it was hired, drawn larger). */
  | { t: number; do: 'hop'; seat: number; isNew: boolean }
  /** A number pops at its source (`pop` ms, rising `rise` pt), then flies to the top edge of its box. */
  | { t: number; do: 'fly'; from: Anchor; box: Box; text: string; look: Look; pop: number; rise: number; ms: number; weight: number; isNew: boolean }
  /** A number lands: the box shows the running value and bumps. */
  | { t: number; do: 'land'; box: Box; value: bigint; mult: boolean; weight: number }
  /** The crisis ring stamps its ×2. */
  | { t: number; do: 'ringStamp' }
  | { t: number; do: 'sound'; sfx: Sfx; intensity: number }
  | { t: number; do: 'buzz'; pattern: number | number[] }
  | { t: number; do: 'shake'; px: number; ms: number }
  /** The held breath before the slam: both boxes pulse once. */
  | { t: number; do: 'breath' }
  | { t: number; do: 'slide' }
  | { t: number; do: 'collide' }
  /** A score of SHOWCASE_AT times the target or more: gold light blooms from the crisis across the map. */
  | { t: number; do: 'bloom' }
  /** ...and the score is stamped big over the map. */
  | { t: number; do: 'showcase'; r: number }
  /** The score leaves the readout (or the showcase) for the crisis ring. */
  | { t: number; do: 'toRing'; from: 'plate' | 'showcase'; ms: number }
  /** The crisis claim's rising chord starts here, so that it lands on the gold ink. */
  | { t: number; do: 'riser' }
  | { t: number; do: 'release' }
  /** The score has landed in the ring: the ring catches it and the crisis flashes. */
  | { t: number; do: 'landed' };

// ---------------------------------------------------------------- the cascade's constants (1x)

/** The pins start after the dim and a short lead-in. */
const EVENTS_AT = 450;
/** A pin's '+6' rises 18 pt off the pin and holds there 100 ms, so it reads on the map before it leaves. */
const PIN_POP_MS = 100;
const RISE_PT = 18;
/** The '+1' for the multiplier rises less, beside the pin's number. */
const ONE_RISE_PT = 8;
/** It lands just after the pin's number, so the two boxes bump one after the other. */
const ONE_LAG_MS = 30;
/** A staff number pops under its seat for 60 ms, then flies 200 ms. */
const POP_MS = 60;
const FLY_MS = 200;
/** Every staff fires in a 250 ms slot ('desk' timing). */
const STAFF_MS = 250;
/** A per-region staff pops once per matching pin, 150 ms apart (each pop adds to its slot). */
const REGION_POP_MS = 150;
/** The ring's ×2: a 250 ms slot; the number leaves the ring's chip after a short stamp. */
const CRISIS_MS = 250;
const CRISIS_POP_MS = 80;
const CRISIS_FLY_MS = 220;
/** The held breath: a beat between the last number landing and the boxes sliding together. */
export const HOLD_MS = 240;
/** After a multiplier the breath waits for its swell to finish, so the hold is longer. */
export const HOLD_AFTER_MULT_MS = 320;
/** No screen shake this close before the slam: the slam's own shake lands against stillness. */
const STILL_BEFORE_SLAM_MS = 300;
export const SLIDE_MS = 200;
const SHAKE_MS = 250;
/** The plate rolls up (260 ms) and holds, readable, before the score leaves for the ring. */
export const PLATE_HOLD_MS = 520;
/**
 * A brisk send (a miss, or a win of one region under 4x: the SEND label already said how it ends)
 * plays its beats at 1.6x and holds the plate a shorter moment, so the late game keeps moving. Big
 * sends keep their full length.
 */
export const BRISK_PACE = 1 / 1.6;
export const BRISK_PLATE_HOLD_MS = 300;
/**
 * The showcase (the score stamped big over the map, the gold bloom) plays from 16x the target: a
 * send that wins three regions or more on the ladder (T, 4T, 16T), so the fanfare matches the
 * territory it takes, not just the size of the number.
 */
export const SHOWCASE_AT = 16;
/** A showcase score holds big over the map long enough to read before it flies. */
export const SHOWCASE_HOLD_MS = 900;
/** The score flies from the readout into the crisis ring. */
export const TO_RING_MS = 300;
/** The ring catches the score (it swells, its chip turns to a check) and holds a beat before it collapses. */
export const CATCH_MS = 160;
/** The whole cascade fits in 8 s: longer ones play their events closer together. */
export const CASCADE_CAP_MS = 8000;
/**
 * Reduced motion: the cascade in 0.55 s, so cascade and outcome together take 1.0 s and the whole
 * send, with the browser's own frames and timers around it, stays under the spec's 1.2 s.
 */
export const REDUCED_BUDGET = 550;
/** ante_smash's riser lasts 600 ms (real time) before its chord. */
export const RISER_MS = 600;

/** Duration of the k-th pin (0-based): 320 ms, 6% quicker each, floor 120; from the 13th, 60 ms. */
export function eventDuration(k: number): number {
  if (k >= 12) return 60;
  return Math.max(120, Math.round(320 * Math.pow(0.94, k)));
}

/** score ÷ target, as a float good to 1e-4 (the slam's size). */
export function ratio(score: bigint, target: bigint): number {
  if (target <= 0n) return Infinity;
  return Number((score * 10_000n) / target) / 10_000;
}

/** Shake amplitude for a slam of `r` times the target. */
export function shakeFor(r: number): number {
  if (r < 0.25) return 0;
  if (r < 1) return 2;
  if (r < 10) return 5;
  return 9;
}

/** The showcase's line under the score: '466× THE TARGET · WINS 7' (floored, as the end card counts it). */
export function showcaseLine(r: number, regions: number): string {
  const times = r >= 100 ? formatInt(BigInt(Math.floor(r))) : (Math.floor(r * 10) / 10).toFixed(1);
  return `${times}× THE TARGET · WINS ${regions}`;
}

/** log10(score) / 9, clamped to 0..1: a slam's size. */
export function sizeOf(score: bigint): number {
  if (score <= 1n) return 0;
  const s = score.toString();
  const lead = Number(s.slice(0, 15));
  const log = Math.log10(lead) + (s.length - Math.min(s.length, 15));
  return Math.min(1, Math.max(0, log / 9));
}

/**
 * Slam loudness: every slam starts at 0.45, a score that beats the target adds 0.3, and size adds the
 * last 0.25, so the outcome leads. A miss keeps the plain size (no flourish).
 */
export function slamIntensity(score: bigint, r: number, quiet = false): number {
  const size = sizeOf(score);
  if (quiet) return size;
  return Math.min(1, Math.max(0.45, 0.45 + 0.3 * Math.min(1, r) + 0.25 * size));
}

/** tally_tick's pitch is 500 Hz x 4.4^i: the intensity that plays `hz`. */
function tickAt(hz: number): number {
  return Math.min(1, Math.max(0, Math.log(hz / 500) / Math.log(4.4)));
}

/** tick's pitch is 800 + 1600 i Hz: the intensity that plays `hz` (it doubles a note for body). */
function blipAt(hz: number): number {
  return Math.min(1, Math.max(0, (hz - 800) / 1600));
}

/** A major pentatonic from A5: A5 B5 C#6 E6 F#6 A6 B6. */
const PENTATONIC = [880, 987.77, 1108.73, 1318.51, 1479.98, 1760, 1975.53];

/** The note for the k-th of n steps: one climb up the pentatonic, so a short run climbs as far as a long one. */
function noteHz(k: number, n: number): number {
  const top = PENTATONIC.length - 1;
  return PENTATONIC[n <= 1 ? 0 : Math.round((Math.min(k, n - 1) * top) / (n - 1))];
}

/** tally_tick's intensity for the k-th of n notes. */
export function tickIntensity(k: number, n: number): number {
  return tickAt(noteHz(k, n));
}

/**
 * One note at `p` (0..1) of the way through a climb: tally_tick on the scale, doubled by tick at the
 * same pitch and a glassy pin, so it plucks rather than blips; from halfway a body thump grows under
 * it, so the climb gets louder as well as higher.
 */
function noteCues(t: number, hz: number, p: number): Cue[] {
  const cues: Cue[] = [
    { t, do: 'sound', sfx: 'tally_tick', intensity: tickAt(hz) },
    { t, do: 'sound', sfx: 'tick', intensity: blipAt(hz) },
    { t, do: 'sound', sfx: 'pin', intensity: 0.2 + 0.8 * p },
  ];
  if (p >= 0.5) cues.push({ t, do: 'sound', sfx: 'thump', intensity: 0.2 * p });
  return cues;
}

/** A multiplier's size from its factor in tenths: ×1.5 lands at 0.9, ×2 at 1.0, ×3 and up at 1.2. */
export function multWeight(amount10: number): number {
  const f = amount10 / 10;
  if (!Number.isFinite(f)) return 1;
  return Math.min(1.2, Math.max(0.8, 0.6 + 0.2 * f));
}

/**
 * Each multiplier in a send lands higher than the last (tally_mult is 380 Hz x 3.5^i): a semitone a
 * step, or, in a send of many, an even climb that still reaches the top on the last one.
 */
export function multPitch(nth: number, of = 1): number {
  const semitone = Math.log(Math.pow(2, 1 / 12)) / Math.log(3.5);
  const step = of > 1 ? Math.min(semitone, 0.55 / (of - 1)) : semitone;
  return Math.min(1, 0.45 + step * nth);
}

// ---------------------------------------------------------------- the trace in beats

/** One beat of the cascade: a pin, a staff firing once, a per-region staff's pops, or the crisis ×2. */
export type Beat =
  | { kind: 'pin'; e: PinEvent }
  | { kind: 'staff'; e: StaffEvent }
  | { kind: 'pops'; seat: number; e: RegionStaffEvent[] }
  | { kind: 'crisis'; e: CrisisEvent };

/** The trace grouped into beats: consecutive pops from the same seat are one staff's firing. */
export function beatsOf(trace: readonly TraceEvent[]): Beat[] {
  const out: Beat[] = [];
  for (const e of trace) {
    if (e.kind === 'pin') out.push({ kind: 'pin', e });
    else if (e.kind === 'staff') out.push({ kind: 'staff', e });
    else if (e.kind === 'crisisX2') out.push({ kind: 'crisis', e });
    else if (e.kind === 'regionStaff') {
      const last = out[out.length - 1];
      if (last?.kind === 'pops' && last.seat === e.seat) last.e.push(e);
      else out.push({ kind: 'pops', seat: e.seat, e: [e] });
    }
  }
  return out;
}

/** What a staff number reads in its box: the engine's label ('+20', '+4', '×3', '×1.4'). */
function boxOf(e: StaffEvent | RegionStaffEvent | CrisisEvent): Box {
  return e.kind === 'staff' && e.op === '+P' ? 'points' : 'mult';
}

// ---------------------------------------------------------------- the cascade

export interface SendInput {
  trace: readonly TraceEvent[];
  score: bigint;
  target: bigint;
  /** The send wins (score ≥ target): the slam gets its flourish and the claim's chord rises into the ink. */
  win: boolean;
  /** Seats whose staff fires for the first time since it was hired: drawn 1.5x with '· new'. */
  newSeats?: ReadonlySet<number>;
  reduced: boolean;
  /** Playback speed (1, 2, 4): the claim chord's riser lasts the same real time at any speed. */
  rate?: number;
  /** Play it brisk (see BRISK_PACE). */
  brisk?: boolean;
}

/** A send whose outcome the player already knows and that changes little: a miss, or one region under 4x. */
export function isBrisk(win: boolean, regions: number, r: number): boolean {
  return !win || (regions <= 1 && r < 4);
}

export interface SendSchedule {
  cues: Cue[];
  /** The ring has caught the score: the outcome starts here. */
  end: number;
  /** The boxes start sliding together. */
  slamAt: number;
  /** The boxes collide (the slam lands). */
  hitAt: number;
  /** score ÷ target. */
  r: number;
  /** Beats in the cascade (pins, staff firings, per-region staff, the crisis ×2). */
  beats: number;
  /** When the claim chord's riser starts, or null (a miss, or no time for it at this speed). */
  riserAt: number | null;
}

/** The cascade from SEND pressed to the score landing in the crisis ring. */
export function sendSchedule(input: SendInput): SendSchedule {
  let pace = input.brisk && !input.reduced ? BRISK_PACE : 1;
  let s = buildSend(input, pace);
  // Too long: play the beats closer together (never the slam, the hold or the flight to the ring).
  // The flights do not shrink with the pace, so a couple of passes settle on the cap.
  for (let pass = 0; pass < 4 && !input.reduced && s.end > CASCADE_CAP_MS; pass++) {
    const span = s.slamAt - EVENTS_AT;
    const fixed = s.end - span;
    pace = Math.max(0.25, (pace * (CASCADE_CAP_MS - fixed)) / span);
    s = buildSend(input, pace);
  }
  if (input.reduced) {
    if (s.end > REDUCED_BUDGET) s = scaleSchedule(s, REDUCED_BUDGET / s.end);
    return { ...s, cues: calmCascade(s) };
  }
  return input.win ? withRiser(s, input.rate ?? 1) : s;
}

/** `pace` scales the time between beats (1 normally; less for a very long send). */
function buildSend(input: SendInput, pace: number): SendSchedule {
  const { trace, score, target, reduced } = input;
  const newSeats = input.newSeats ?? new Set<number>();
  const beats = beatsOf(trace);
  const cues: Cue[] = [];
  const add = (c: Cue) => cues.push(c);
  const fly = reduced ? 0 : FLY_MS;
  let lastLand = 0;
  let lastWasMult = false;
  let mults = 0;
  const totalMults = trace.filter((e) => e.kind === 'crisisX2' || ((e.kind === 'staff' || e.kind === 'regionStaff') && e.op === 'xM')).length;

  const landAt = (t: number, box: Box, value: bigint, mult: boolean, weight: number) => {
    add({ t, do: 'land', box, value, mult, weight });
    if (t >= lastLand) {
      lastLand = t;
      lastWasMult = mult;
    }
  };

  /** A number flies to its box and lands with its sound: the hit is heard when it arrives, never when it leaves. */
  const fling = (t: number, from: Anchor, look: Look, text: string, box: Box, value: bigint, mult: boolean, weight: number, isNew: boolean, pop: number, rise: number, flyMs = fly) => {
    const held = reduced ? 0 : pop;
    const land = t + held + flyMs;
    if (!reduced) add({ t, do: 'fly', from, box, text, look, pop: held, rise, ms: held + flyMs, weight, isNew });
    landAt(land, box, value, mult, weight);
    if (mult) {
      const nth = mults++;
      add({ t: land, do: 'sound', sfx: 'thump', intensity: 0.3 * weight });
      add({ t: land, do: 'sound', sfx: 'tally_mult', intensity: multPitch(nth, totalMults) });
      add({ t: land, do: 'buzz', pattern: 12 });
      // A shudder on every ×, less as the send goes on (4 px down to 1.5), so a long one does not
      // shake the whole way through.
      if (!reduced) {
        const decay = totalMults > 1 ? nth / (totalMults - 1) : 0;
        add({ t: land, do: 'shake', px: Math.round((4 - 2.5 * decay) * weight * 10) / 10, ms: 110 });
      }
    } else {
      add({ t: land, do: 'sound', sfx: 'tally_mult', intensity: 0.4 });
    }
  };

  // t = 0: the lever drops with its thock, everything but the pins fades.
  add({ t: 0, do: 'press' });
  add({ t: 0, do: 'sound', sfx: 'commit', intensity: 0.6 });
  add({ t: 0, do: 'buzz', pattern: 15 });
  add({ t: 0, do: 'dim' });

  // From 450 ms: each pin, west to east, flashes and flings '+n' into POINTS and '+1' into MULTIPLIER.
  // The notes climb a pentatonic across the pins.
  const pins = beats.filter((b): b is Extract<Beat, { kind: 'pin' }> => b.kind === 'pin');
  let t = EVENTS_AT;
  pins.forEach((b, k) => {
    const region = b.e.region;
    for (const c of noteCues(t, noteHz(k, pins.length), pins.length > 1 ? k / (pins.length - 1) : 0)) add(c);
    add({ t, do: 'scan', region });
    add({ t, do: 'flash', region });
    add({ t, do: 'buzz', pattern: 8 });
    const held = reduced ? 0 : PIN_POP_MS;
    if (!reduced) {
      add({ t, do: 'fly', from: { region }, box: 'points', text: b.e.label, look: 'pin', pop: held, rise: RISE_PT, ms: held + fly, weight: 1, isNew: false });
      add({ t: t + ONE_LAG_MS, do: 'fly', from: { region }, box: 'mult', text: '+1', look: 'one', pop: held, rise: ONE_RISE_PT, ms: held + fly, weight: 0.4, isNew: false });
    }
    landAt(t + held + fly, 'points', b.e.points, false, 1);
    landAt(t + held + fly + (reduced ? 0 : ONE_LAG_MS), 'mult', b.e.m10, false, 0.4);
    t += Math.round(eventDuration(k) * pace);
  });

  // The staff, seat 1 to 5, each in its 250 ms slot; a per-region staff pops '×1.5' / '×2' from each
  // matching pin on the map, 150 ms apart; then the ring stamps its ×2.
  const rest = beats.filter((b) => b.kind !== 'pin');
  if (rest.length) add({ t, do: 'scanOff' });
  for (const b of rest) {
    if (b.kind === 'staff') {
      const isNew = newSeats.has(b.e.seat);
      add({ t, do: 'hop', seat: b.e.seat, isNew });
      const mult = b.e.op === 'xM';
      const box = boxOf(b.e);
      // An add to the multiplier bumps its box lighter than a ×.
      const weight = mult ? multWeight(b.e.amount) : box === 'mult' ? 0.6 : 1;
      fling(t, { seat: b.e.seat }, 'staff', b.e.label, box, box === 'points' ? b.e.points : b.e.m10, mult, weight, isNew, POP_MS, 0);
      t += Math.round(STAFF_MS * pace);
    } else if (b.kind === 'pops') {
      const isNew = newSeats.has(b.seat);
      b.e.forEach((e, j) => {
        const at = t + Math.round(REGION_POP_MS * j * pace);
        add({ t: at, do: 'hop', seat: b.seat, isNew });
        add({ t: at, do: 'flash', region: e.region });
        fling(at, { region: e.region }, 'pop', e.label, 'mult', e.m10, true, multWeight(e.amount), isNew && j === 0, PIN_POP_MS, RISE_PT);
      });
      t += Math.round((STAFF_MS + REGION_POP_MS * (b.e.length - 1)) * pace);
    } else if (b.kind === 'crisis') {
      add({ t, do: 'ringStamp' });
      add({ t, do: 'sound', sfx: 'stamp', intensity: 0.7 });
      fling(t, { ringChip: b.e.region }, 'crisis', b.e.label, 'mult', b.e.m10, true, multWeight(20) * 1.1, false, CRISIS_POP_MS, 0, reduced ? 0 : CRISIS_FLY_MS);
      t += Math.round(CRISIS_MS * pace);
    }
  }

  // The held breath, then the slam, sized by score ÷ target.
  const r = ratio(score, target);
  const quiet = !input.win;
  const hold = reduced ? 0 : lastWasMult ? HOLD_AFTER_MULT_MS : HOLD_MS;
  const slamAt = Math.max(t, lastLand + hold);
  if (!reduced) add({ t: Math.max(lastLand + (lastWasMult ? 240 : 40), slamAt - hold + 40), do: 'breath' });
  // The breath is still: no kicks in the last moments before the slam.
  for (let i = cues.length - 1; i >= 0; i--) {
    const c = cues[i];
    if (c.do === 'shake' && c.t > slamAt - STILL_BEFORE_SLAM_MS) cues.splice(i, 1);
  }
  add({ t: slamAt, do: 'slide' });
  const hit = slamAt + (reduced ? 0 : SLIDE_MS);
  add({ t: hit, do: 'collide' });
  const loud = slamIntensity(score, r, quiet);
  add({ t: hit, do: 'sound', sfx: 'tally_slam', intensity: loud });
  add({ t: hit, do: 'sound', sfx: 'thump', intensity: loud });
  add({ t: hit, do: 'buzz', pattern: 30 });
  add({ t: hit, do: 'release' });
  const showcase = !reduced && !quiet && r >= SHOWCASE_AT;
  if (!reduced && !quiet) {
    const px = shakeFor(r);
    if (px > 0) add({ t: hit, do: 'shake', px, ms: SHAKE_MS });
    if (showcase) add({ t: hit, do: 'bloom' });
  }
  if (showcase) add({ t: hit, do: 'showcase', r });

  // The score leaves the readout (or the showcase) and lands in the crisis ring: the send lands on
  // the place that changes.
  let landed = hit;
  if (!reduced) {
    const leave = hit + (showcase ? SHOWCASE_HOLD_MS : input.brisk ? BRISK_PLATE_HOLD_MS : PLATE_HOLD_MS);
    add({ t: leave, do: 'toRing', from: showcase ? 'showcase' : 'plate', ms: TO_RING_MS });
    landed = leave + TO_RING_MS;
  }
  add({ t: landed, do: 'landed' });
  add({ t: landed, do: 'sound', sfx: 'thump', intensity: input.win ? 0.5 : 0.25 });
  add({ t: landed, do: 'sound', sfx: 'tick', intensity: input.win ? 0.9 : 0.3 });
  const end = reduced ? landed : landed + CATCH_MS;

  // A stable sort keeps same-time cues in the order they were added.
  cues.sort((a, b) => a.t - b.t);
  return { cues, end, slamAt, hitAt: hit, r, beats: beats.length, riserAt: null };
}

/** The claim chord may land this much (real ms) after the ink rather than start before the slam. */
export const RISER_SLACK_MS = 80;

/**
 * Start the claim's rising chord so that it lands on the crisis's gold ink (COLLAPSE_MS into the
 * outcome): the riser lasts RISER_MS of real time, so at 2x it starts twice as many schedule-ms
 * ahead. It never starts before the slam (it would muddy it): when that would make the chord more
 * than RISER_SLACK_MS late (4x), the outcome plays a quick chord on the ink instead.
 */
function withRiser(s: SendSchedule, rate: number): SendSchedule {
  const ideal = Math.round(s.end + COLLAPSE_MS - RISER_MS * rate);
  if ((s.hitAt - ideal) / rate > RISER_SLACK_MS) return s;
  const t = Math.max(s.hitAt, ideal);
  const cues = [...s.cues, { t, do: 'riser' } as Cue].sort((a, b) => a.t - b.t);
  return { ...s, cues, riserAt: t };
}

/** Scale every time (and every flight) by `k`. */
function scaleSchedule(s: SendSchedule, k: number): SendSchedule {
  const cues = s.cues.map((c): Cue => {
    const t = Math.round(c.t * k);
    if (c.do === 'toRing' || c.do === 'fly') return { ...c, t, ms: Math.max(60, Math.round(c.ms * k)) };
    return { ...c, t };
  });
  return {
    ...s,
    cues,
    end: Math.round(s.end * k),
    slamAt: Math.round(s.slamAt * k),
    hitAt: Math.round(s.hitAt * k),
    riserAt: s.riserAt === null ? null : Math.round(s.riserAt * k),
  };
}

// ---------------------------------------------------------------- reduced motion's sound

type Sounded = { t: number; do: string; sfx?: Sfx; intensity?: number };

/**
 * Drop a sound when the same sound already played less than `gapMs` before: reduced motion packs a
 * send into about a second, and a burst of identical notes on one millisecond is harsh, not calm.
 */
export function thinSounds<C extends Sounded>(cues: C[], gapMs: number): C[] {
  const last = new Map<Sfx, number>();
  return cues.filter((c) => {
    if (c.do !== 'sound' || !c.sfx) return true;
    const at = last.get(c.sfx);
    if (at !== undefined && c.t - at < gapMs) return false;
    last.set(c.sfx, c.t);
    return true;
  });
}

/** Sounds of the pins' climb (one note keeps; the rest go with reduced motion). */
const PIN_NOTE: ReadonlySet<Sfx> = new Set<Sfx>(['tally_tick', 'tick', 'pin']);
/** Reduced motion keeps sounds this far apart at least (the claim chords, coins, thumps). */
export const CALM_GAP_MS = 120;

/**
 * Reduced motion's cascade: one pin note (the first pin's), one multiplier note at the top pitch
 * (where the last multiplier lands), the slam, and nothing closer than CALM_GAP_MS to its own kind.
 */
function calmCascade(s: SendSchedule): Cue[] {
  type Sound = Extract<Cue, { do: 'sound' }>;
  const isSound = (c: Cue): c is Sound => c.do === 'sound';
  const climb = (c: Cue) => isSound(c) && PIN_NOTE.has(c.sfx) && c.t < s.hitAt;
  const firstPin = s.cues.find(climb)?.t;
  const mults = s.cues.filter((c): c is Sound => isSound(c) && c.sfx === 'tally_mult');
  const top = mults.reduce<Sound | null>((best, c) => (!best || c.intensity >= best.intensity ? c : best), null);
  const kept: Cue[] = s.cues.filter((c) => !(climb(c) && c.t !== firstPin) && !(isSound(c) && c.sfx === 'tally_mult'));
  if (top) kept.push({ ...top, t: mults[mults.length - 1].t });
  kept.sort((a, b) => a.t - b.t);
  return thinSounds(kept, CALM_GAP_MS);
}

// ---------------------------------------------------------------- the outcome

export type OutcomeCue =
  /** The world comes back to full light (the score is in the ring). */
  | { t: number; do: 'settle' }
  /** The ring collapses into the crisis. */
  | { t: number; do: 'collapse'; ms: number }
  | { t: number; do: 'shockwave'; region: RegionId }
  /** A pulse of colour travels a chain of joins: gold from the crisis to a region won, red from war into a region it takes. */
  | { t: number; do: 'travel'; path: RegionId[]; stepMs: number; colour: 'gold' | 'red' }
  /**
   * A region turns gold: the view takes the new owner and gold ink floods it from `from` (itself for
   * the crisis). The GOLD count (and WAR, for a region won back) shows `gold` / `red` from here.
   */
  | { t: number; do: 'claim'; region: RegionId; from: RegionId; ms: number; wasRed: boolean; gold: number; red: number }
  /** A coin flies from a region won to the coin chip... */
  | { t: number; do: 'coin'; region: RegionId; ms: number }
  /** ...and lands: the chip shows `coins`. */
  | { t: number; do: 'coins'; coins: number }
  /**
   * War takes a region: red ink runs into it from `from` (itself: it blooms from the centre).
   * `spread`: war spreading by itself, into the region its tag is on.
   */
  | { t: number; do: 'take'; region: RegionId; from: RegionId; ms: number; gold: number; red: number; spread?: true }
  /** The war tag moves to where war spreads next. */
  | { t: number; do: 'tag' }
  /** Everything has changed hands: the pins lift and the lamps go off, leaving the plain world. */
  | { t: number; do: 'clear' }
  /** A goal count on the Big Board glows (null: none). */
  | { t: number; do: 'glow'; which: 'gold' | 'war' | null }
  /** The drone dips (a miss) or falls silent (the war is over). */
  | { t: number; do: 'drone'; level: number }
  /** CEASEFIRE: red stops pulsing and fades. */
  | { t: number; do: 'ceasefire' }
  /**
   * A miss in the final push: one of the push's lamps beside WAR goes out (`misses`: the push's
   * misses after this one). No region changes.
   */
  | { t: number; do: 'strike'; misses: number }
  /** WORLD UNITED: sunrise sweeps the map from the east... */
  | { t: number; do: 'sunrise'; ms: number }
  /** ...then a gold wave rolls out from the last region won. */
  | { t: number; do: 'wave'; region: RegionId; ms: number }
  /** WAR: the grey regions go dark; gold stays lit. */
  | { t: number; do: 'lightsOut'; ms: number }
  /** The game has ended: the console stops talking about the turn and says how it ended. */
  | { t: number; do: 'ending'; ending: Ending }
  /** WORLD UNITED: 'WORLD UNITED · 30 OF 30' slams over the map, away from the last region won, with the gold bloom. */
  | { t: number; do: 'united'; region: RegionId }
  /** ...and lifts again, so the all-gold world is seen whole before the card. */
  | { t: number; do: 'unitedOff' }
  /** War spread by itself: the coach names the region as the drum sounds ('War spread to Marram by itself.'). */
  | { t: number; do: 'spreadLine'; region: RegionId }
  | { t: number; do: 'sound'; sfx: Sfx; intensity: number }
  | { t: number; do: 'buzz'; pattern: number | number[] }
  | { t: number; do: 'shake'; px: number; ms: number };

type OutcomeKind = OutcomeCue['do'];

export interface OutcomeInput {
  crisis: RegionId;
  result: 'win' | 'miss';
  /** Regions won, in spread order (the crisis first), each with its chain of joins from the crisis. */
  won: readonly WonRegion[];
  /** A miss: the crisis turned red (null in the final push, where a miss changes no region). */
  lost: WarTake | null;
  /** The push's misses after this send (a push miss spends one of its lamps). */
  pushMisses?: number;
  /** War spread by itself after this turn. */
  spread: WarTake | null;
  ending: Ending | null;
  coinsBefore: number;
  goldBefore: number;
  redBefore: number;
  reduced: boolean;
  /** The claim's chord already rose during the cascade (false after a skip, or at 4x: a quick chord plays instead). */
  riserPlayed: boolean;
  /** How long the settled map holds before the screen moves on (no ending): 150 ms, SHOP_HOLD_MS before a shop. */
  holdMs?: number;
}

export interface Outcome {
  cues: OutcomeCue[];
  /** Everything has played: the screen may show the resolved game. */
  end: number;
  /** When the last region changed hands (the ending, if any, follows). */
  settled: number;
}

/** The ring collapses (300 ms) before the crisis floods. */
export const COLLAPSE_MS = 300;
/** The crisis: the ring collapses, then gold ink floods it (600 ms) as a white shockwave rolls. */
const CRISIS_INK_MS = 600;
/** The crisis takes 1.0 s; each further region 0.5 s more, the whole win capped at 5 s. */
const CRISIS_WIN_MS = 1000;
const REGION_WIN_MS = 500;
export const WIN_CAP_MS = 5000;
/** A further region: the pulse travels 150 ms a join (at most 450 ms), then gold ink floods it (400 ms). */
const TRAVEL_STEP_MS = 150;
const TRAVEL_MAX_MS = 450;
const REGION_INK_MS = 400;
/** A coin flies from the region to the coin chip. */
const COIN_MS = 300;
/** A miss: red ink runs into the crisis (700 ms), the whole miss 0.8 s. */
const MISS_INK_AT = 100;
const WAR_INK_MS = 700;
/** A push miss: its lamp goes out and the board holds a beat (the miss reads before anything moves on). */
export const STRIKE_MS = 600;
/** War spreads by itself 0.5 s after the outcome. */
const SPREAD_GAP_MS = 500;
/** Before war's own ink runs, a red pulse crosses the border it comes over. */
const SPREAD_LEAD_MS = 150;
/** Before the shop tray rises over the map, the new map holds long enough to be seen. */
export const SHOP_HOLD_MS = 700;
const SETTLE_HOLD_MS = 150;
/** The ending begins a beat after the last region has changed hands. */
const ENDING_GAP_MS = 300;
const SUNRISE_MS = 900;
const WAVE_MS = 1200;
/** WORLD UNITED: the stamp lifts this long after the wave, then the gold world holds alone before the card. */
const UNITED_STAMP_TAIL_MS = 300;
export const UNITED_HOLD_MS = 1500;
/** The rising run under the WORLD UNITED wave: one note per step, up the scale. */
const UNITED_NOTES = 12;
/** WORLD UNITED's haptic: a long, rising rattle, the longest in the game. */
export const UNITED_BUZZ = [30, 40, 30, 40, 30, 40, 60, 60, 160];
/** CEASEFIRE's haptic: soft, the war stopping. */
export const CEASEFIRE_BUZZ = [40, 80, 40];
const LIGHTS_OUT_MS = 2000;
const CEASEFIRE_HOLD_MS = 1100;
/** The WAR ending's haptic: two heavy knocks and a long fall, unlike any miss. */
export const WAR_ENDING_BUZZ = [120, 60, 120, 60, 300];
/** Reduced motion: the whole outcome (endings included) within 0.45 s. */
export const REDUCED_OUTCOME_BUDGET = 450;

/** The k-th further region's slot (1-based): 0.5 s each after the crisis, packed closer when many. */
function regionSlot(further: number): number {
  if (further <= 0) return REGION_WIN_MS;
  return Math.min(REGION_WIN_MS, Math.floor((WIN_CAP_MS - CRISIS_WIN_MS) / further));
}

/** The outcome, from the score landing in the ring to the screen showing the resolved game. */
export function outcomeSchedule(input: OutcomeInput): Outcome {
  const o = input.reduced ? reducedOutcome(input) : fullOutcome(input);
  o.cues.sort((a, b) => a.t - b.t);
  return o;
}

function fullOutcome(input: OutcomeInput): Outcome {
  const cues: OutcomeCue[] = [];
  const add = (c: OutcomeCue) => cues.push(c);
  let gold = input.goldBefore;
  let red = input.redBefore;
  let coins = input.coinsBefore;
  let t = 0;

  add({ t: 0, do: 'settle' });
  add({ t: 0, do: 'collapse', ms: COLLAPSE_MS });

  if (input.result === 'win' && input.won.length) {
    const [crisis, ...further] = input.won;
    const at = COLLAPSE_MS;
    // The crisis: a white shockwave rolls from it as gold floods it, with the claim's chord.
    gold++;
    if (crisis.wasRed) red--;
    add({ t: at, do: 'shockwave', region: crisis.id });
    add({ t: at, do: 'claim', region: crisis.id, from: crisis.id, ms: CRISIS_INK_MS, wasRed: crisis.wasRed, gold, red });
    add({ t: at, do: 'glow', which: 'gold' });
    add({ t: at, do: 'buzz', pattern: [20, 40, 60] });
    if (!input.riserPlayed) add({ t: at, do: 'sound', sfx: 'roll_success', intensity: 0.8 });
    if (crisis.wasRed) addReclaim(add, at);
    add({ t: at, do: 'coin', region: crisis.id, ms: COIN_MS });
    add({ t: at + COIN_MS, do: 'coins', coins: ++coins });
    add({ t: at + COIN_MS, do: 'sound', sfx: 'capital', intensity: 0.6 });
    let last = at + CRISIS_INK_MS;

    // Each further region: a gold pulse runs along the joins from the crisis, then gold floods it.
    const slot = regionSlot(further.length);
    further.forEach((w, i) => {
      const start = CRISIS_WIN_MS + i * slot;
      const joins = Math.max(1, w.path.length - 1);
      const stepMs = Math.min(TRAVEL_STEP_MS, Math.floor(Math.min(TRAVEL_MAX_MS, slot) / joins));
      const inkAt = start + stepMs * joins;
      gold++;
      if (w.wasRed) red--;
      if (w.path.length > 1) add({ t: start, do: 'travel', path: w.path, stepMs, colour: 'gold' });
      add({ t: inkAt, do: 'claim', region: w.id, from: w.path.length > 1 ? w.path[w.path.length - 2] : input.crisis, ms: REGION_INK_MS, wasRed: w.wasRed, gold, red });
      // Each region rings the next note up the scale; one won back from war adds a deeper chord.
      for (const c of claimNote(inkAt, i + 1, input.won.length)) add(c);
      if (w.wasRed) addReclaim(add, inkAt);
      add({ t: inkAt, do: 'buzz', pattern: w.wasRed ? [18, 30, 24] : 14 });
      add({ t: inkAt, do: 'coin', region: w.id, ms: COIN_MS });
      add({ t: inkAt + COIN_MS, do: 'coins', coins: ++coins });
      add({ t: inkAt + COIN_MS, do: 'sound', sfx: 'capital', intensity: 0.5 + (0.4 * (i + 1)) / Math.max(1, further.length) });
      last = Math.max(last, inkAt + REGION_INK_MS);
    });
    t = Math.max(CRISIS_WIN_MS, last);
    add({ t, do: 'glow', which: null });
    // The tag follows the world: it moves once the regions have changed hands (after war's own
    // spread, when that is still to come).
    if (!input.spread) add({ t, do: 'tag' });
  } else if (input.lost) {
    // A miss: no flourish; the drone dips, red ink runs into the crisis, the room shudders.
    add({ t: 0, do: 'sound', sfx: 'ante_miss', intensity: 0.7 });
    add({ t: 0, do: 'drone', level: 0.05 });
    red++;
    // A red pulse crosses from the war region next to it, then red ink runs in.
    const from = input.lost.from ?? input.lost.id;
    if (from !== input.lost.id) add({ t: 0, do: 'travel', path: [from, input.lost.id], stepMs: MISS_INK_AT, colour: 'red' });
    add({ t: MISS_INK_AT, do: 'take', region: input.lost.id, from, ms: WAR_INK_MS, gold, red });
    add({ t: MISS_INK_AT, do: 'glow', which: 'war' });
    add({ t: MISS_INK_AT, do: 'shake', px: 2, ms: 220 });
    add({ t: MISS_INK_AT, do: 'buzz', pattern: [60, 80, 140] });
    t = MISS_INK_AT + WAR_INK_MS;
    add({ t, do: 'glow', which: null });
    if (!input.spread) add({ t, do: 'tag' });
  } else {
    // A miss in the final push: no region changes. One of the push's lamps beside WAR goes out with
    // a knock; on the last one the war stops where it stands (the ending follows).
    add({ t: 0, do: 'sound', sfx: 'ante_miss', intensity: 0.6 });
    add({ t: 0, do: 'drone', level: 0.05 });
    const at = COLLAPSE_MS;
    add({ t: at, do: 'strike', misses: input.pushMisses ?? 0 });
    add({ t: at, do: 'sound', sfx: 'thump', intensity: 0.7 });
    add({ t: at, do: 'glow', which: 'war' });
    add({ t: at, do: 'shake', px: 2, ms: 220 });
    add({ t: at, do: 'buzz', pattern: [50, 70, 50] });
    t = at + STRIKE_MS;
    add({ t, do: 'glow', which: null });
  }

  // War spreads by itself (after turns 3, 6, 9 ...): a low drum, a red pulse over the border, then
  // red ink into the tagged region (its tag reads WAR · NOW until the ink has run).
  if (input.spread) {
    const drum = t + SPREAD_GAP_MS;
    const from = input.spread.from ?? input.spread.id;
    const at = from !== input.spread.id ? drum + SPREAD_LEAD_MS : drum;
    red++;
    add({ t: drum, do: 'spreadLine', region: input.spread.id });
    add({ t: drum, do: 'sound', sfx: 'flashpoint_hit', intensity: 0.55 });
    add({ t: drum, do: 'sound', sfx: 'thump', intensity: 0.8 });
    add({ t: drum, do: 'buzz', pattern: [40, 60, 40] });
    if (at > drum) add({ t: drum, do: 'travel', path: [from, input.spread.id], stepMs: at - drum, colour: 'red' });
    add({ t: at, do: 'take', region: input.spread.id, from, ms: WAR_INK_MS, gold, red, spread: true });
    add({ t: drum, do: 'glow', which: 'war' });
    t = at + WAR_INK_MS;
    add({ t, do: 'glow', which: null });
    add({ t, do: 'tag' });
  }
  const settled = t;
  add({ t: settled, do: 'clear' });
  add({ t: settled, do: 'sound', sfx: 'slide', intensity: 0.3 });

  const end = input.ending ? endingCues(add, input, t + ENDING_GAP_MS) : t + (input.holdMs ?? SETTLE_HOLD_MS);
  return { cues, end, settled };
}

/** A region won back from war: a deeper chord under the note. */
function addReclaim(add: (c: OutcomeCue) => void, t: number): void {
  add({ t, do: 'sound', sfx: 'tally_slam', intensity: 0.35 });
  add({ t, do: 'sound', sfx: 'meter_up', intensity: 0.6 });
}

/** The note for the k-th region won (1 = the first after the crisis) of n: up the scale, like coins. */
function claimNote(t: number, k: number, n: number): OutcomeCue[] {
  const hz = noteHz(k, n);
  return [
    { t, do: 'sound', sfx: 'tally_tick', intensity: tickAt(hz) },
    { t, do: 'sound', sfx: 'tick', intensity: blipAt(hz) },
    { t, do: 'sound', sfx: 'pin', intensity: 0.5 },
  ];
}

/** The ending's beats from `at`; returns when the end card may show. */
function endingCues(add: (c: OutcomeCue) => void, input: OutcomeInput, at: number): number {
  switch (input.ending) {
    case 'WORLD UNITED': {
      // The loudest beat in the game: the goal of the whole game is met.
      const last = input.won.length ? input.won[input.won.length - 1].id : input.crisis;
      add({ t: at, do: 'ending', ending: 'WORLD UNITED' });
      add({ t: at, do: 'sunrise', ms: SUNRISE_MS });
      add({ t: at, do: 'sound', sfx: 'ante_smash', intensity: 1 });
      add({ t: at, do: 'glow', which: 'gold' });
      // The chord lands as the sunrise reaches the middle: WORLD UNITED slams over the map with the
      // gold bloom and a 6 px shake, and a gold wave pulses every region outward from the last one
      // won, over a rising run of notes and the game's longest haptic.
      const waveAt = at + RISER_MS;
      add({ t: waveAt, do: 'united', region: last });
      add({ t: waveAt, do: 'sound', sfx: 'tally_slam', intensity: 1 });
      add({ t: waveAt, do: 'sound', sfx: 'thump', intensity: 1 });
      add({ t: waveAt, do: 'shake', px: 6, ms: 300 });
      add({ t: waveAt, do: 'wave', region: last, ms: WAVE_MS });
      add({ t: waveAt, do: 'sound', sfx: 'reveal', intensity: 0.8 });
      add({ t: waveAt, do: 'buzz', pattern: UNITED_BUZZ });
      const step = WAVE_MS / UNITED_NOTES;
      for (let k = 1; k <= UNITED_NOTES; k++) for (const c of claimNote(waveAt + Math.round((k - 1) * step), k, UNITED_NOTES)) add(c);
      add({ t: waveAt + WAVE_MS, do: 'glow', which: null });
      add({ t: waveAt + WAVE_MS, do: 'drone', level: 0 });
      // The stamp lifts; the whole gold world holds on its own before the card arrives.
      const off = waveAt + WAVE_MS + UNITED_STAMP_TAIL_MS;
      add({ t: off, do: 'unitedOff' });
      return off + UNITED_HOLD_MS;
    }
    case 'CEASEFIRE':
      add({ t: at, do: 'ending', ending: 'CEASEFIRE' });
      add({ t: at, do: 'ceasefire' });
      add({ t: at, do: 'sound', sfx: 'accident_clear', intensity: 0.7 });
      add({ t: at, do: 'drone', level: 0 });
      add({ t: at, do: 'buzz', pattern: CEASEFIRE_BUZZ });
      add({ t: at + 150, do: 'sound', sfx: 'ending', intensity: 0.5 });
      return at + CEASEFIRE_HOLD_MS;
    case 'WAR':
      add({ t: at, do: 'ending', ending: 'WAR' });
      add({ t: at, do: 'lightsOut', ms: LIGHTS_OUT_MS });
      add({ t: at, do: 'drone', level: 0 });
      add({ t: at, do: 'sound', sfx: 'ending', intensity: 0.8 });
      // Heavier than a miss: the war is lost.
      add({ t: at, do: 'buzz', pattern: WAR_ENDING_BUZZ });
      return at + LIGHTS_OUT_MS + 450;
    default:
      return at;
  }
}

/** Cues that are only motion: reduced motion drops them (every sound and every change of hands stays). */
const MOTION_ONLY = new Set<OutcomeKind>(['travel', 'shake', 'sunrise', 'wave', 'shockwave', 'coin']);

/**
 * Reduced motion: no travel, no waves; every region changes in place within the budget. Its sounds
 * keep their order but no sound repeats closer than CALM_GAP_MS (at most one claim chord in that
 * time), so a big win does not land as one harsh burst.
 */
function reducedOutcome(input: OutcomeInput): Outcome {
  const full = fullOutcome({ ...input, reduced: false });
  const k = REDUCED_OUTCOME_BUDGET / Math.max(1, full.end);
  const cues = full.cues
    .filter((c) => !MOTION_ONLY.has(c.do))
    .map((c): OutcomeCue => {
      const t = Math.round(c.t * k);
      if ('ms' in c) return { ...c, t, ms: c.do === 'lightsOut' ? 200 : 0 } as OutcomeCue;
      return { ...c, t };
    });
  cues.sort((a, b) => a.t - b.t);
  return { cues: thinSounds(cues, CALM_GAP_MS), end: REDUCED_OUTCOME_BUDGET, settled: Math.round(full.settled * k) };
}
