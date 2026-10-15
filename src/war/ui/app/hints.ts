/**
 * The coach (SPEC section 4): one line at a time on the linen strip along the map's top edge (or
 * on the shop tray's lip). teach.ts decides which lines a moment earns; this module plays them in
 * order, drops the one-time lines this device has seen, and lets a tap end a timed line early.
 * Sticky lines (the first turn's steps) stay until the next line replaces them.
 */
import { signal } from '@preact/signals';
import type { GameState, RegionId } from '../../engine';
import { whenTableShown } from './curtain';
import { prefs, setPrefs } from './store';
import { linesFor, turnOneStep, type CoachSpot, type Line } from './teach';

export interface CoachLine {
  text: string;
  at: CoachSpot;
  n: number;
  /** A tap may not end it before this time (performance.now()), so the tap that caused it doesn't. */
  holdUntil: number;
  /** The SEND lever beckons while it shows. */
  beckon: boolean;
  sticky: boolean;
}

export const coach = signal<CoachLine | null>(null);
/** The teaching finger (turn 1 step 1). */
export const finger = signal<RegionId | null>(null);

const HOLD_MS = 350;
/** A timed line stays at least this long before a newer line may take its place. */
const MIN_SHOW_MS = 1500;
let n = 0;
let timer = 0;
let shownAt = 0;
let queue: Line[] = [];
/** Game-scoped one-time lines already shown. */
let seenInGame = new Set<string>();
/** Counts games started, so a late line never lands on the next game. */
let games = 0;

function wanted(l: Line): boolean {
  if (l.once === 'device') return !prefs.value.hints.includes(l.key);
  if (l.once === 'game') return !seenInGame.has(l.key);
  return true;
}

function remember(l: Line): void {
  if (l.once === 'device') setPrefs({ hints: [...prefs.value.hints, l.key] });
  if (l.once === 'game') seenInGame.add(l.key);
}

function show(l: Line): void {
  remember(l);
  n++;
  shownAt = performance.now();
  coach.value = { text: l.text, at: l.at, n, holdUntil: shownAt + HOLD_MS, beckon: !!l.beckon, sticky: l.ms === Infinity };
  clearTimeout(timer);
  if (l.ms !== Infinity) {
    const mine = n;
    timer = window.setTimeout(() => end(mine), queue.length ? Math.min(l.ms, MIN_SHOW_MS) : l.ms);
  }
}

/** The line on show is done: the next queued line takes its place. */
function end(which: number): void {
  if (coach.value?.n !== which) return;
  coach.value = null;
  playNext();
}

function playNext(): void {
  while (queue.length) {
    const l = queue.shift()!;
    if (wanted(l)) {
      show(l);
      return;
    }
  }
}

/**
 * Queue lines. A sticky line on show gives way at once; a timed one gives way once it has been read
 * (MIN_SHOW_MS), so the coach never lags behind the game.
 */
function enqueue(lines: Line[]): void {
  const fresh = lines.filter(wanted);
  if (!fresh.length) return;
  // A new sticky step replaces whatever sticky step is waiting in the queue.
  queue = [...queue.filter((q) => q.ms !== Infinity || fresh.every((f) => f.ms !== Infinity)), ...fresh];
  const on = coach.value;
  if (!on || on.sticky) {
    clearTimeout(timer);
    coach.value = null;
    playNext();
    return;
  }
  const left = MIN_SHOW_MS - (performance.now() - shownAt);
  const mine = on.n;
  clearTimeout(timer);
  timer = window.setTimeout(() => end(mine), Math.max(0, left));
}

function syncFinger(s: GameState): void {
  finger.value = turnOneStep(s)?.finger ?? null;
}

/** A game is put on the table (a new game, CONTINUE, PRACTICE). */
export function coachStart(s: GameState): void {
  coachStop();
  seenInGame = new Set();
  const mine = ++games;
  // The opening line waits until the title has lifted off the table.
  void whenTableShown().then(() => {
    if (mine !== games) return;
    syncFinger(s);
    enqueue(linesFor(null, s));
  });
}

/** The game moved on (a tap, a swap, a send that has played, a new turn, a shop action). */
export function coachAfter(prev: GameState | null, next: GameState): void {
  syncFinger(next);
  enqueue(linesFor(prev, next));
}

/** SEND was pressed: the lines about choosing have done their work. */
export function coachSend(): void {
  finger.value = null;
  queue = [];
  clearTimeout(timer);
  coach.value = null;
}

/** Any tap ends a timed line on show (after a short grace). */
export function coachTap(): void {
  const c = coach.value;
  if (c && !c.sticky && performance.now() > c.holdUntil) end(c.n);
}

export function coachStop(): void {
  games++;
  clearTimeout(timer);
  queue = [];
  coach.value = null;
  finger.value = null;
}
