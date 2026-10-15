/**
 * window.__thirty: a scripting hook for tests and screenshots, installed in dev builds or with
 * VITE_THIRTY_HOOK=1. Every call drives the same functions a tap does; choose() and tap() resolve
 * once the day's outcome has played and the screen shows the next card.
 */
import { content, danger, loadGame, preview, saveGame, type GameState, type Preview, type RegionId } from './engine';
import { R } from './layout';
import * as act from './actions';
import { getMap } from './mapRef';
import { writeSave } from './storage';
import { busy, cardKey, explain, needle, run, screen, sheet, shown, shownHeats, type Sheet } from './store';

export interface ThirtyHook {
  seed(seed: string): GameState;
  state(): GameState | null;
  choose(side: 'left' | 'right'): Promise<GameState | null>;
  tap(id: RegionId): Promise<GameState | null>;
  pick(i: number | null): GameState | null;
  preview(option: 'left' | 'right' | RegionId): Preview | null;
  /** Extras for screenshots and tests. */
  play(): void;
  title(): void;
  explain(step: 1 | 2 | null): void;
  sheet(name: Sheet): void;
  busy(): boolean;
  /** A region's centre in frame px (for tapping the map in tests), or null without a map. */
  centre(id: RegionId): { x: number; y: number } | null;
  /** Put a state on the table as the truth (through the save format, so only a sound state is taken). */
  load(state: GameState): GameState | null;
  /** Patch the state on the table (heats, team, phase ...): screenshots of states a game takes long to reach. */
  set(patch: Partial<GameState>): GameState | null;
}

declare global {
  interface Window {
    __thirty?: ThirtyHook;
  }
}

export function installDevHook(): void {
  const hook: ThirtyHook = {
    seed(seed) {
      return act.startGame(seed);
    },
    state: () => run.value,
    async choose(side) {
      await act.chooseSide(side);
      return run.value;
    },
    async tap(id) {
      await act.tapTarget(id);
      return run.value;
    },
    pick(i) {
      act.pickPiece(i);
      return run.value;
    },
    preview(option) {
      const s = run.value;
      return s ? preview(content, s, option) : null;
    },
    play: act.play,
    title: act.quitToTitle,
    explain(step) {
      if (step === null) act.explainSkip();
      else {
        if (screen.value !== 'game') act.howToPlay();
        explain.value = step;
      }
    },
    sheet(name) {
      sheet.value = name;
    },
    busy: () => busy.value,
    centre(id) {
      const m = getMap();
      if (!m) return null;
      const c = m.centre(id);
      return { x: R.map[0] + c.x, y: R.map[1] + c.y };
    },
    load(state) {
      const s = loadGame(content, saveGame(state));
      if (!s) return null;
      run.value = s;
      shown.value = s;
      shownHeats.value = null;
      needle.value = danger(s);
      writeSave(s);
      screen.value = 'game';
      explain.value = null;
      cardKey.value++;
      return s;
    },
    set(patch) {
      const s = run.value;
      if (!s) return null;
      return hook.load({ ...s, ...patch });
    },
  };
  window.__thirty = hook;
}
