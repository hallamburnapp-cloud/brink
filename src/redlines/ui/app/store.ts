/**
 * The screens' state: one signal for the engine's game (the truth), one for the state the screen
 * is showing (it lags behind while a week's resolve plays), and the small UI state beside them:
 * which layer is up, what the finger is doing on the sheet, the playback's frame. Components read
 * signals; only actions.ts and the playback write the game.
 */
import { computed, signal } from '@preact/signals';
import type { PaperView } from '../paper';
import type { GameState, PieceKind, RegionId, Step } from './engine';
import { hasSave, readPrefs, writePrefs, type Prefs } from './storage';
import type { TapeLine } from './words';

export type Screen = 'title' | 'game';
/** What sits over the room: the menu, the quit question, HOW TO PLAY, the way-out form. */
export type Sheet = 'menu' | 'quit' | 'how' | 'wayout' | null;
/** The explanation: three typed lines (1..3) over the live map, then the collision on a slip (4). */
export type ExplainStep = 1 | 2 | 3 | 4 | null;

export type ArmedAct = 'promise' | 'withdraw' | 'refused';
/** A region held long enough: the slip offering PROMISE TO DEFEND or WITHDRAW (or saying why not). */
export interface Armed {
  region: RegionId;
  act: ArmedAct;
  /** The refusal, in the content's words, when act is 'refused'. */
  reason?: string;
}

/** One beat of a week's resolve on screen: the map, the card's numbers, the note and the tape. */
export interface PlayFrame {
  view: PaperView;
  step: Step;
  war: number;
  treaty: number;
  /** The beat's headline, written large on the sheet for the watcher. */
  note: string;
  tape: TapeLine[];
}

/** The engine's state: the truth. */
export const run = signal<GameState | null>(null);
/** The state the screen draws: equal to `run` except while a week's resolve plays. */
export const shown = signal<GameState | null>(null);
export const screen = signal<Screen>('title');
export const sheet = signal<Sheet>(null);
export const explain = signal<ExplainStep>(null);

/** A week's resolve is playing: the slips are down and taps on the sheet wait. */
export const busy = signal(false);
/** A game is saved and can be continued from the title. */
export const saved = signal(hasSave());

/** The world under the title: the saved game, or a sample world (never saved). */
export const titleWorld = signal<GameState | null>(null);
/** The title lifting off the desk into a game (the curtain). */
export const curtain = signal<'lifting' | null>(null);

// ---------------------------------------------------------------- the finger on the sheet

/** The region under a finger that is pressing and holding. */
export const held = signal<RegionId | null>(null);
/** The slip the hold put down. */
export const armed = signal<Armed | null>(null);
/** The counter picked up to move (tap a counter, then a place). */
export const lifted = signal<PieceKind | null>(null);
/** A refused order, in the content's words, on a torn slip for a moment. */
export const refusal = signal<{ text: string; key: number } | null>(null);
/** The way-out form's open term (which promise to drop, which piece to pull back). */
export const wayOutTerm = signal<'drop-promise' | 'pull-back' | null>(null);

// ---------------------------------------------------------------- the playback and the end

/** The resolve's frame while it plays; null otherwise. */
export const play = signal<PlayFrame | null>(null);
/** The debrief: null shows the ending card; 0..n-1 a week's page; n the closing card. */
export const debriefPage = signal<number | null>(null);

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

/** Where the frame sits in the window (window px per frame px, and its top-left), for mapping pointer positions. */
export const frameFit = signal({ scale: 1, left: 0, top: 0 });

/** The sheet shows a game (the title has lifted), not the title's world. */
export const inGame = computed(() => screen.value === 'game' && shown.value !== null);
