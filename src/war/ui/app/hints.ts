/**
 * Hints (spec section 11). The first night teaches in five single lines on the Big Board; later
 * runs get three one-time lines, remembered in local settings. Each line shows for 3.5 s or until
 * the next tap.
 */
import { signal } from '@preact/signals';
import { litHasJoin, preview, type RegionId, type RunState } from '../../engine';
import { prefs, run, setPrefs } from './store';

export interface BoardHint {
  text: string;
  n: number;
  /** Tap-proof until this time (performance.now()). */
  holdUntil: number;
}
export type HintSpot = 'swap' | 'tray';

/** A line on the Big Board in place of the leverage (first night, and the Gridlock warning). */
export const boardHint = signal<BoardHint | null>(null);
/** A balloon over a control (SWAP, the in-tray). */
export const controlHint = signal<{ text: string; at: HintSpot; n: number } | null>(null);
/** The first night's finger pulse. */
export const finger = signal<RegionId | null>(null);

const HINT_MS = 3500;
let n = 0;
let boardTimer = 0;
let controlTimer = 0;
let introTimer = 0;
/** First-night lines already shown in this run. */
let seen = new Set<string>();

export function showBoardHint(text: string, ms = HINT_MS, holdMs = 250): void {
  n++;
  boardHint.value = { text, n, holdUntil: performance.now() + holdMs };
  clearTimeout(boardTimer);
  const mine = n;
  boardTimer = window.setTimeout(() => {
    if (boardHint.value?.n === mine) boardHint.value = null;
  }, ms);
}

function showControlHint(text: string, at: HintSpot): void {
  n++;
  controlHint.value = { text, at, n };
  clearTimeout(controlTimer);
  const mine = n;
  controlTimer = window.setTimeout(() => {
    if (controlHint.value?.n === mine) controlHint.value = null;
  }, HINT_MS + 1000);
}

/** Any tap ends the line on show (after a short grace, so the tap that caused it doesn't). */
export function hintTap(): void {
  const b = boardHint.value;
  if (b && performance.now() > b.holdUntil) boardHint.value = null;
  if (controlHint.value) controlHint.value = null;
}

function once(key: string): boolean {
  if (prefs.value.hints.includes(key)) return false;
  setPrefs({ hints: [...prefs.value.hints, key] });
  return true;
}

function firstNightOnce(key: string): boolean {
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

/** A run has started: reset, and on the first night open with the scripted lines. */
export function hintsStart(s: RunState): void {
  seen = new Set();
  clearTimeout(introTimer);
  boardHint.value = null;
  controlHint.value = null;
  finger.value = null;
  if (!s.firstNight) {
    hintsAfter(null, s);
    return;
  }
  showBoardHint('Hold the world together until dawn.', 2000, 1200);
  introTimer = window.setTimeout(() => {
    // The player may already have pinned during the opening line.
    if (run.value !== null && run.value.crisis.pins.length) return;
    seen.add('tap');
    showBoardHint('Tap a lit region.');
    finger.value = s.crisis.flashpoint;
  }, 2000);
}

/** The run moved on (a tap, a buy, a new crisis): show whatever line this moment earns. */
export function hintsAfter(prev: RunState | null, next: RunState): void {
  if (next.firstNight) firstNightLines(prev, next);
  laterLines(prev, next);
}

function firstNightLines(prev: RunState | null, s: RunState): void {
  if (s.phase !== 'crisis' || s.log.length > 0) return;
  const pinsNow = s.crisis.pins.length;
  if (pinsNow > 0 && finger.value) finger.value = null;
  if (pinsNow > 0 && (prev?.crisis.pins.length ?? 0) === 0 && firstNightOnce('join')) {
    clearTimeout(introTimer);
    showBoardHint('Pins that touch join up.');
    return;
  }
  if (preview(s).biggestGroup >= 3 && firstNightOnce('sweep')) showBoardHint('Sweep.');
}

function laterLines(prev: RunState | null, s: RunState): void {
  const freshDeal = !prev || prev.crisis.lit.join() !== s.crisis.lit.join() || prev.phase !== 'crisis';
  if (s.phase === 'crisis' && freshDeal && s.crisis.pins.length === 0) {
    // A fresh deal (a new crisis, a refill after a sweep or swap).
    if (!litHasJoin(s) && !(s.firstNight && s.log.length === 0) && once('nojoin')) {
      showControlHint('Nothing joins? Select regions and SWAP them.', 'swap');
    }
  }
  if (prev && s.phase === 'crisis' && prev.phase === 'briefing' && s.crisis.hour === 0 && s.crisis.index === 2) {
    if (s.hour.twist.kind === 'GRIDLOCK' && once('gridlock')) showBoardHint('SUMMIT: GRIDLOCK. Sea lanes are cut.', HINT_MS, 800);
  }
  if (prev && prev.phase === 'briefing' && s.tray.length > prev.tray.length && once('order')) {
    showControlHint('Drag it onto the map.', 'tray');
  }
}

/** The Briefing tray has risen. */
export function hintsBriefing(s: RunState): void {
  if (s.firstNight && s.shop?.briefing === 1 && firstNightOnce('hire')) {
    showBoardHint('Hire staff. They sit at your table and fire every sweep.', HINT_MS, 600);
  }
}

export function hintsStop(): void {
  clearTimeout(introTimer);
  clearTimeout(boardTimer);
  clearTimeout(controlTimer);
  boardHint.value = null;
  controlHint.value = null;
  finger.value = null;
}
