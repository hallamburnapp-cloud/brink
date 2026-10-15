/**
 * The seam between the screens and the director (src/war/ui/director/).
 *
 * The screens never animate a send themselves. On SEND, actions.ts stores the resolved game in
 * `run`, keeps the pre-send game on show (`shown`), and calls `director().playSend(prev, next)`.
 * The director plays the cascade and the outcome over the table, writing the signals below as it
 * goes; when its promise resolves the screens show `next` and every override here is reset.
 *
 * Until a director registers (setDirector), the fallback shows the outcome at once.
 */
import { batch, signal } from '@preact/signals';
import type { GameState } from '../../engine';

export interface Director {
  /**
   * Play one send. `prev` is the game SEND was pressed on (phase 'choose', its pins down); `next` is
   * the resolved game (`next.lastSend` holds the record and its trace). Resolve once the screen may
   * show `next` (the outcome has played: ink, counts, coins). The director may set `shown` to `next`
   * earlier itself (for example when the map's colours should follow the ink).
   */
  playSend(prev: GameState, next: GameState): Promise<void>;
  /** A tap (frame px) or a key (null) during playback: skip ahead if the director allows it. */
  tapSkip(at: { x: number; y: number } | null): void;
  /** Jump to the end of any playback now (leaving the game, the back button). */
  skip(): void;
}

const instant: Director = {
  playSend: () => Promise.resolve(),
  tapSkip: () => {},
  skip: () => {},
};

let current: Director = instant;

/** The director registers itself here (one call, from main.tsx or the director's own module). */
export function setDirector(d: Director | null): void {
  current = d ?? instant;
}

export function director(): Director {
  return current;
}

// ---------------------------------------------------------------- what the HUD shows meanwhile

/** The readout's POINTS and MULTIPLIER during the cascade (null: the live preview). */
export const boxes = signal<{ points: bigint; m10: bigint } | null>(null);

/** Landing pulses: each increment replays a box's pulse (`mult` is the heavier multiplier landing). */
export const bumps = signal({ points: 0, mult: 0 });

/** How hard the latest multiplier lands (×1.5 smaller than ×3), 0.8..1.2. */
export const multWeight = signal(1);

/** The slam: 'slide' while the boxes travel, 'hit' on contact (the readout shows the score plate). */
export const slam = signal<'idle' | 'slide' | 'hit'>('idle');

/** Seat hops: seat index -> counter (each increment hops the seat once). */
export const hops = signal<Record<number, number>>({});

/** A score of 10x the target or more, stamped big over the map (n retriggers it). */
export const showcase = signal<{ text: string; sub: string; n: number } | null>(null);

/**
 * The goal counts while the outcome plays: the GOLD and WAR flaps and bars tick one region at a
 * time in step with the map's ink (null: the shown game's counts).
 */
export const goal = signal<{ gold: number; red: number } | null>(null);

/** A count on the Big Board glows (the intro points at it; the director may on a change). */
export const goalGlow = signal<'gold' | 'war' | null>(null);

/** The coins counted up coin by coin as regions are won (null: the shown game's). */
export const coins = signal<number | null>(null);

/** The SEND lever is held down. */
export const leverDown = signal(false);

/** The shop tray or the end card may show (false while the outcome plays). */
export const revealOutcome = signal(true);

let n = 0;
/** A fresh counter value for retriggering signals. */
export function nextN(): number {
  return ++n;
}

/** Back to following the shown game. */
export function resetPlayback(): void {
  batch(() => {
    boxes.value = null;
    multWeight.value = 1;
    slam.value = 'idle';
    hops.value = {};
    showcase.value = null;
    goal.value = null;
    goalGlow.value = null;
    coins.value = null;
    leverDown.value = false;
    revealOutcome.value = true;
  });
}
