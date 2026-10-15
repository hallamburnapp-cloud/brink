/**
 * The war room's state: one signal for the engine's game, one for the game the screen is drawing
 * (it lags behind while a send plays back, so the cascade can play over the table as it was), and
 * the UI-only state beside them. Components read signals; only actions.ts, the intro and the
 * director write the game.
 */
import { computed, signal } from '@preact/signals';
import type { GameState, RegionId } from '../../engine';
import { hasSave, readPrefs, writePrefs, type Prefs } from './storage';

export type Screen = 'title' | 'game';
export type Sheet = 'menu' | 'quit' | 'rules' | null;

/** The engine's state: the truth. */
export const run = signal<GameState | null>(null);
/** What the screen draws. Equal to `run` except while a send plays back or the intro runs. */
export const shown = signal<GameState | null>(null);
export const screen = signal<Screen>('title');
export const sheet = signal<Sheet>(null);

/** A send is playing back: taps skip instead of acting. */
export const busy = signal(false);

/** A game is saved and can be continued from the title. */
export const saved = signal(hasSave());

// ---------------------------------------------------------------- preferences

export const prefs = signal<Prefs>(readPrefs());

export function setPrefs(patch: Partial<Prefs>): void {
  prefs.value = { ...prefs.value, ...patch };
  writePrefs(prefs.value);
}

const systemReduced = signal(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
if (typeof matchMedia !== 'undefined') {
  try {
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => (systemReduced.value = e.matches));
  } catch {
    /* old Safari: the value read at start-up stands */
  }
}

/** Reduced motion: the menu's choice, else the system setting. */
export const reduced = computed(() => {
  const m = prefs.value.motion;
  return m === 'reduce' || (m === 'system' && systemReduced.value);
});

export const speed = computed(() => prefs.value.speed);

// ---------------------------------------------------------------- transient UI

/** The rule balloon under a seat (tap a seat, or keys 1-5). */
export const balloon = signal<{ seat: number } | null>(null);

/**
 * The shop's full-table flow: the offer slot tapped while all five seats are taken. Each seat then
 * shows the number it would make if replaced; tapping a seat hires into it.
 */
export const replacing = signal<number | null>(null);

export interface Toast {
  text: string;
  /** Centre x of the control it refers to (frame px), or null for the default spot. */
  x: number | null;
  /** Bottom edge (frame px) the toast sits above. */
  bottom: number;
  n: number;
}
export const toast = signal<Toast | null>(null);
let toastN = 0;
let toastTimer = 0;

/** A short line for a refusal ('Not enough coins.'), placed above the control that was tapped. */
export function showToast(text: string, at?: { x: number; bottom: number }): void {
  toastN++;
  toast.value = { text, x: at?.x ?? null, bottom: at?.bottom ?? 684, n: toastN };
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.value = null), 2400);
}

/** NEXT TURN was pressed: the shop tray slides away before the next turn is dealt. */
export const trayLeaving = signal(false);

/** A long-press on a shop card: the regions it acts on light up on the map. */
export const pressHighlight = signal<RegionId[] | null>(null);

/** The region under a mouse pointer (desktop): it breathes, and the cursor says it can be tapped. */
export const hoverRegion = signal<RegionId | null>(null);

/** Frame scale (window px per frame px), for mapping pointer deltas. */
export const frameScale = signal(1);
