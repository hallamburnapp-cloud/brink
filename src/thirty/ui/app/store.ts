/**
 * The screens' state: one signal for the engine's game (the truth), one for the day the screen is
 * showing (it lags behind for a second while the day's outcome plays), and the small UI state
 * beside them. Components read signals; only actions.ts and the playback write the game.
 */
import { computed, signal } from '@preact/signals';
import type { GameState, Heat, PieceId, RegionId } from './engine';
import { hasSave, readPrefs, writePrefs, type Prefs } from './storage';

export type Screen = 'title' | 'game';
export type Sheet = 'menu' | 'quit' | null;
/** The two explanation screens, over the live map; null while the game itself is on. */
export type Explain = 1 | 2 | null;

/** The engine's state: the truth. */
export const run = signal<GameState | null>(null);
/** The state the screen draws: equal to `run` except while a day's outcome plays. */
export const shown = signal<GameState | null>(null);
export const screen = signal<Screen>('title');
export const sheet = signal<Sheet>(null);
export const explain = signal<Explain>(null);
/** Where HOW TO PLAY returns to: the title, or the game it was opened over. */
export const explainFrom = signal<Screen>('title');

/** A day's outcome is playing: the buttons are down and taps wait. */
export const busy = signal(false);

/** A game is saved and can be continued from the title. */
export const saved = signal(hasSave());

// ---------------------------------------------------------------- what the day's playback animates

/** The heats the map draws (the engine's, or the day's steps as they play). */
export const shownHeats = signal<Record<RegionId, Heat> | null>(null);
/** The number at the needle. */
export const needle = signal(0);
/** The floating -18 / +9 beside the needle, for one second. */
export const delta = signal<{ n: number; key: number } | null>(null);
/** A RISKY roll sweeping the needle. */
export const sweep = signal(false);
/** The option pressed while the outcome plays, and the roll's result on its hint line. */
export const chosen = signal<{ option: string; roll: string | null } | null>(null);
/** Chips that changed today's outcome: they glow for a second. */
export const glow = signal<PieceId[]>([]);
/** Bumps when a new card comes to the table, so it slides up. */
export const cardKey = signal(0);
/** The WAR ending's 2 px nudge. */
export const nudge = signal(0);
/** The chip whose rule the team row is showing. */
export const chipOpen = signal<PieceId | null>(null);

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

/** Reduced motion follows the system setting: every change is instant. */
export const reduced = computed(() => systemReduced.value);

/** Frame scale (window px per frame px), for mapping pointer positions. */
export const frameScale = signal(1);
