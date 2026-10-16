/**
 * The day's outcome, calm and brief (SPEC "The screen"), in beats a watcher can follow:
 *
 *  1. The choice. A risky roll is a short needle sweep and its result on the hint line for a
 *     second. Then the regions the button changed recolour over 600 ms while the needle slides and
 *     a -7 floats beside it for a second; the chips that fired glow. The float finishes before
 *     anything else moves, so the number matches the hint that was tapped.
 *  2. The night, only when it changed anything: one plain line in the card ('Overnight · the war
 *     in Highmarch spread to Edda Vale') with its own +N, the map recolouring under it, held long
 *     enough to read.
 *  3. The next card (or the offer, or the ending) slides up. Once it is readable, the news it
 *     brings recolours its region under the ring (no float: the ring's label says 'now tense').
 *
 * No flying numbers, no cascades, no shakes except a 2 px nudge on WAR. Reduced motion: instant
 * changes, short pauses.
 */
import type { HeatStep } from '../map';
import { danger, nightDelta, nightLine, nightSteps, type GameState, type Heat, type RegionId } from './engine';
import { getMap } from './mapRef';
import { endingSound, lowTone, rollSweep, tickDay, tonesCrossed } from './sound';
import { applySteps, heatSteps, rollOf, splitDay } from './steps';
import { busy, cardKey, chosen, delta, glow, needle, night, nudge, reduced, shown, shownHeats, sweep } from './store';
import { arrivalPieces } from './words';

export const TIMES = {
  sweep: 500,
  rollRead: 1000,
  recolour: 600,
  float: 1000,
  /** A breath after the choice's float, before the night begins. */
  breath: 120,
  /** How long the night's line stays, from its appearance (the recolouring runs inside it): one clause, two, three or more. */
  nightHoldShort: 1000,
  nightHold: 1300,
  nightHoldLong: 1500,
  /** The new card is on the table this long before its news recolours the map. */
  read: 400,
  arrival: 450,
  reducedPause: 700,
} as const;

function wait(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, Math.max(0, ms)));
}

/** The night's line is held long enough to read: a clause a second, within limits (pure, for the test). */
export function nightHoldFor(line: string | null): number {
  const clauses = line ? line.split('; ').length : 1;
  return clauses <= 1 ? TIMES.nightHoldShort : clauses === 2 ? TIMES.nightHold : TIMES.nightHoldLong;
}

let needleToken = 0;
/** The playback in progress; a new game or a quit cancels it, so its timers never put a game back on screen. */
let playToken = 0;

export function cancelPlayback(): void {
  playToken++;
  needleToken++;
  night.value = null;
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

  const { choice: choiceSteps, night: nightHeats } = splitDay(trace.steps);
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
  // floats for a second and the chips that fired glow. It finishes before the night starts.
  const map = getMap();
  const afterChoice = applySteps(before.heats, choiceSteps);
  await beat(map, afterChoice, choiceSteps, trace.dangerBefore, trace.dangerAfterChoice, r);
  if (!live()) return;
  glowChips(trace.fired, TIMES.float);
  await wait(r ? TIMES.reducedPause : TIMES.float - TIMES.recolour + TIMES.breath);
  if (!live()) return;

  // Beat two: the night, when it changed anything, with its line in the card.
  const afterTrace = applySteps(afterChoice, nightHeats);
  const line = nightLine(trace);
  if (line || nightHeats.length || nightDelta(trace) !== 0) {
    night.value = { text: line ?? 'A quiet night.', delta: nightDelta(trace) };
    const started = performance.now();
    await beat(map, afterTrace, nightHeats, trace.dangerAfterChoice, trace.dangerAfter, r);
    if (!live()) return;
    // A piece that acted at night takes credit as it would by day.
    glowChips(arrivalPieces(nightSteps(trace)), TIMES.float);
    await wait(r ? TIMES.reducedPause + 300 : nightHoldFor(line) - (performance.now() - started));
    if (!live()) return;
    night.value = null;
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
    await playNews(afterTrace, after, live);
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

/** After a team pick: the next card comes to the table, and then its news. */
export async function playArrival(before: GameState, after: GameState): Promise<void> {
  const mine = ++playToken;
  const live = () => mine === playToken;
  busy.value = true;
  chosen.value = null;
  night.value = null;
  shown.value = after;
  cardKey.value++;
  tickDay();
  await playNews(before.heats, after, live);
  if (!live()) return;
  shownHeats.value = null;
  busy.value = false;
}

/**
 * The arriving card's own heat changes, from `heats` (what the map shows) to the engine's: once the
 * card is readable, its region recolours under the ring and the needle slides. No float: the ring's
 * label carries the news. The pieces that acted on arrival (the Hotline) glow.
 */
async function playNews(heats: Readonly<Record<RegionId, Heat>>, after: GameState, live: () => boolean): Promise<void> {
  const steps = heatSteps(after.card?.arrival ?? []);
  const r = reduced.value;
  const target = danger(after);
  if (!steps.length) {
    shownHeats.value = after.heats;
    await slideNeedle(needle.value, target, 0);
    return;
  }
  shownHeats.value = heats;
  await wait(r ? TIMES.reducedPause : TIMES.read);
  if (!live()) return;
  const map = getMap();
  const from = needle.value;
  const recolour = map ? map.recolour(steps, r ? 0 : TIMES.arrival) : Promise.resolve();
  shownHeats.value = applySteps(heats, steps);
  const slide = slideNeedle(from, target, r ? 0 : TIMES.arrival);
  glowChips(arrivalPieces(after.card?.arrival ?? []), TIMES.float);
  if (tonesCrossed(from, target).length) lowTone();
  await Promise.all([recolour, slide]);
}

function settle(after: GameState): void {
  chosen.value = null;
  night.value = null;
  shown.value = after;
  shownHeats.value = null;
  needle.value = danger(after);
  cardKey.value++;
  busy.value = false;
}
