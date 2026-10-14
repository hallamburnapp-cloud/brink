/**
 * The war room's state: one signal for the engine's run, one for the run the screen is drawing
 * (it lags behind during a sweep so the animation can play the trace over the pre-sweep table),
 * and the UI-only state beside them. Components read signals; only actions.ts and the director
 * write the run.
 */
import { computed, signal } from '@preact/signals';
import type { RunState } from '../../engine';
import type { RegionId } from '../art';
import { readPrefs, writePrefs, type Prefs } from './storage';

export type Screen = 'title' | 'game';
export type Sheet = 'menu' | 'runinfo' | 'howto' | 'quit' | null;

/** The engine's state: the truth. */
export const run = signal<RunState | null>(null);
/** What the screen draws. Equal to `run` except while a sweep is being played back. */
export const shown = signal<RunState | null>(null);
export const screen = signal<Screen>('title');
export const sheet = signal<Sheet>(null);

/** A sweep or an outcome sequence is playing: taps skip instead of acting. */
export const busy = signal(false);

// ---------------------------------------------------------------- preferences

export const prefs = signal<Prefs>(readPrefs());

export function setPrefs(patch: Partial<Prefs>): void {
  prefs.value = { ...prefs.value, ...patch };
  writePrefs(prefs.value);
}

const systemReduced = signal(
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
);
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

export type BalloonKind = 'seat' | 'paper' | 'summit' | 'region';
export interface Balloon {
  kind: BalloonKind;
  /** Seat index, tray slot, or 0 for the Summit chip and a region. */
  index: number;
  /** For a region's card (a long-press on the map). */
  region?: RegionId;
}
/** The rule balloon under a seat / above a paper / under the Summit chip / beside a held region. */
export const balloon = signal<Balloon | null>(null);

/** The LAST SWEEP receipt is unfolded: from the readout's sum, or from the Briefing's ticket. */
export const receiptOpen = signal<'readout' | 'briefing' | null>(null);

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

/** A short line for a refusal ('Not enough Funds.'), placed above the control that was tapped. */
export function showToast(text: string, at?: { x: number; bottom: number }): void {
  toastN++;
  toast.value = { text, x: at?.x ?? null, bottom: at?.bottom ?? 684, n: toastN };
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.value = null), 2400);
}

/** Long-press highlight of where an offer acts (the Briefing). */
export const pressHighlight = signal<RegionId[] | null>(null);
/**
 * Long-press of a card that has no place on the map (a desk staff, a rule) or a Playbook: its line
 * over the readout, and the box it feeds (which pulses).
 */
export const pressNote = signal<{ head: string; text: string; box: 'inf' | 'mom' | null } | null>(null);
/** A teaching spotlight: the regions a first-night line is about (the pins and what joins them). */
export const spotlight = signal<RegionId[] | null>(null);
/** An Order being dragged from the in-tray: the regions it may land on. */
export const dragTargets = signal<RegionId[] | null>(null);
/** What the map lights up: a long-press wins, then a dragged Order's targets, then the teaching spotlight. */
export const highlight = computed(() => pressHighlight.value ?? dragTargets.value ?? spotlight.value);

/** The region under a mouse pointer (desktop): it breathes, and the cursor says it can be tapped. */
export const hoverRegion = signal<RegionId | null>(null);

/** LAY CABLE drag in progress, in map points. */
export const cableDrag = signal<{ from: RegionId; x: number; y: number } | null>(null);

/** Frame scale (window px per frame px), for mapping pointer deltas. */
export const frameScale = signal(1);
