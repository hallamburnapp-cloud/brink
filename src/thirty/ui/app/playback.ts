/**
 * The day's outcome, calm and brief (SPEC "The screen"): a risky roll is a short needle sweep and
 * the result on the hint line for a second; then the regions recolour over 600 ms in trace order
 * while the needle slides and the delta floats for a second; then the next card slides up, and if
 * it brings news (its region heats on arrival) that plays as it arrives. No flying numbers, no
 * cascades, no shakes except a 2 px nudge on WAR. Reduced motion: instant changes, short pauses.
 *
 * The day plays in two beats so cause and effect stay legible: first what the choice did (the
 * delta matches the hint that was tapped), then, only if anything happened, what the night did
 * (war spreading, a crisis heating a neighbour, trouble flaring) with its own delta.
 */
import type { HeatStep } from '../map';
import { danger, type GameState, type Heat, type RegionId } from './engine';
import { getMap } from './mapRef';
import { endingSound, lowTone, rollSweep, tickDay, tonesCrossed } from './sound';
import { applySteps, heatSteps, rollOf, splitDay } from './steps';
import { busy, cardKey, chosen, delta, glow, needle, nudge, reduced, shown, shownHeats, sweep } from './store';

export const TIMES = {
  sweep: 500,
  rollRead: 1000,
  recolour: 600,
  float: 1000,
  arrival: 450,
  reducedPause: 700,
} as const;

function wait(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, Math.max(0, ms)));
}

let needleToken = 0;
/** The playback in progress; a new game or a quit cancels it, so its timers never put a game back on screen. */
let playToken = 0;

export function cancelPlayback(): void {
  playToken++;
  needleToken++;
  busy.value = false;
}

/** The needle slides from one reading to the next (the number counts with it). */
function slideNeedle(from: number, to: number, ms: number): Promise<void> {
  const mine = ++needleToken;
  if (ms <= 0 || from === to) {
    needle.value = to;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = () => {
      if (mine !== needleToken) return resolve();
      const p = Math.min(1, (performance.now() - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      needle.value = Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

let deltaTimer = 0;
let deltaN = 0;
/** The -18 / +9 beside the needle, for a second. */
function floatDelta(n: number, ms: number): void {
  if (n === 0) return;
  delta.value = { n, key: ++deltaN };
  window.clearTimeout(deltaTimer);
  deltaTimer = window.setTimeout(() => (delta.value = null), ms);
}

let glowTimer = 0;
function glowChips(ids: string[], ms: number): void {
  if (!ids.length) return;
  glow.value = ids;
  window.clearTimeout(glowTimer);
  glowTimer = window.setTimeout(() => (glow.value = []), ms);
}

/**
 * Play a resolved day. `before` is the state the screen shows, `after` the engine's result (with
 * the day's trace as its last log entry), `option` the button or region the player chose.
 */
export async function playDay(before: GameState, after: GameState, option: string): Promise<void> {
  const trace = after.log[after.log.length - 1];
  if (!trace) {
    settle(after);
    return;
  }
  const mine = ++playToken;
  const live = () => mine === playToken;
  busy.value = true;
  const r = reduced.value;
  chosen.value = { option, roll: null };

  const roll = rollOf(trace);
  if (roll) {
    if (!r) {
      sweep.value = true;
      rollSweep();
      await wait(TIMES.sweep);
      sweep.value = false;
      if (!live()) return;
    }
    chosen.value = { option, roll: roll.text };
    await wait(r ? TIMES.reducedPause : TIMES.rollRead);
    if (!live()) return;
  }

  // Beat one: the choice. The map recolours in trace order while the needle slides; the delta
  // floats for a second and the chips that fired glow.
  const { choice: choiceSteps, night: nightSteps } = splitDay(trace.steps);
  const map = getMap();
  const afterChoice = applySteps(before.heats, choiceSteps);
  await beat(map, afterChoice, choiceSteps, trace.dangerBefore, trace.dangerAfterChoice, r);
  if (!live()) return;
  glowChips(trace.fired, TIMES.float);
  await wait(r ? TIMES.reducedPause : TIMES.float - TIMES.recolour);
  if (!live()) return;

  // Beat two: the night, when it changed anything.
  const afterTrace = applySteps(afterChoice, nightSteps);
  if (nightSteps.length || trace.dangerAfter !== trace.dangerAfterChoice) {
    await beat(map, afterTrace, nightSteps, trace.dangerAfterChoice, trace.dangerAfter, r);
    if (!live()) return;
    await wait(r ? TIMES.reducedPause : TIMES.float - TIMES.recolour);
    if (!live()) return;
  }

  // The next card (or the offer, or the ending) comes to the table.
  chosen.value = null;
  shown.value = after;
  cardKey.value++;
  if (after.ending) {
    shownHeats.value = null;
    endingSound(after.ending);
    if (after.ending.kind === 'WAR' && !r) nudge.value++;
  } else {
    tickDay();
    await playNews(afterTrace, after);
    if (!live()) return;
  }
  shownHeats.value = null;
  busy.value = false;
}

/** One beat of the day: these steps recolour the map while the needle slides and the delta floats. */
async function beat(map: ReturnType<typeof getMap>, heats: Record<RegionId, Heat>, steps: HeatStep[], from: number, to: number, r: boolean): Promise<void> {
  const recolour = map ? map.recolour(steps, r ? 0 : TIMES.recolour) : Promise.resolve();
  shownHeats.value = heats;
  const slide = slideNeedle(from, to, r ? 0 : TIMES.recolour);
  floatDelta(to - from, r ? TIMES.reducedPause : TIMES.float);
  if (tonesCrossed(from, to).length) window.setTimeout(lowTone, r ? 0 : TIMES.recolour / 2);
  await Promise.all([recolour, slide]);
}

/** After a team pick: the next card comes to the table with its news. */
export async function playArrival(before: GameState, after: GameState): Promise<void> {
  const mine = ++playToken;
  busy.value = true;
  chosen.value = null;
  shown.value = after;
  cardKey.value++;
  tickDay();
  await playNews(before.heats, after);
  if (mine !== playToken) return;
  shownHeats.value = null;
  busy.value = false;
}

/** The arriving card's own heat changes, from `heats` (what the map shows) to the engine's. */
async function playNews(heats: Readonly<Record<RegionId, Heat>>, after: GameState): Promise<void> {
  const steps = heatSteps(after.card?.arrival ?? []);
  const r = reduced.value;
  const target = danger(after);
  if (!steps.length) {
    shownHeats.value = after.heats;
    await slideNeedle(needle.value, target, 0);
    return;
  }
  const map = getMap();
  const from = needle.value;
  const recolour = map ? map.recolour(steps, r ? 0 : TIMES.arrival) : Promise.resolve();
  shownHeats.value = applySteps(heats, steps);
  const slide = slideNeedle(from, target, r ? 0 : TIMES.arrival);
  floatDelta(target - from, r ? TIMES.reducedPause : TIMES.float);
  if (tonesCrossed(from, target).length) lowTone();
  await Promise.all([recolour, slide]);
}

function settle(after: GameState): void {
  chosen.value = null;
  shown.value = after;
  shownHeats.value = null;
  needle.value = danger(after);
  cardKey.value++;
  busy.value = false;
}
