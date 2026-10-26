/**
 * window.__redlines: a scripting hook for tests and screenshots, installed in dev builds or with
 * VITE_REDLINES_HOOK=1 (BUILD.md). Every call drives the same functions a tap does; endWeek() and
 * answer() resolve once the week's outcome has played on the sheet.
 */
import type { PaperView } from '../paper';
import * as act from './actions';
import { content, loadGame, saveGame, type GameState, type PieceKind, type RegionId, type WayOutTerm } from './engine';
import { getMap } from './mapRef';
import { writeSave } from './storage';
import { busy, explain, frameFit, run, saved, screen, sheet, type ExplainStep, type Sheet } from './store';
import { mapView } from './view';

export interface RedlinesHook {
  /** A new game on this seed, with no explanation. */
  seed(seed: string): GameState;
  state(): GameState | null;
  promise(region: RegionId): GameState | null;
  withdraw(region: RegionId): GameState | null;
  move(kind: PieceKind, region: RegionId): GameState | null;
  wayOut(term: WayOutTerm, detail?: RegionId | PieceKind): GameState | null;
  /** SEND ORDERS; resolves when the playback has finished (the phone may then be ringing). */
  endWeek(): Promise<GameState | null>;
  /** The phone's answer; resolves when the rest of the week has played. */
  answer(key: 'back' | 'down' | 'wait'): Promise<GameState | null>;
  /** Patch the state on the desk (through the save format, so only a sound state is taken). */
  set(patch: Partial<GameState>): GameState | null;
  busy(): boolean;
  /** A region's centre in frame px (for a real tap), or null without a map. */
  centre(region: RegionId): { x: number; y: number } | null;
  title(): void;
  explain(step: ExplainStep): void;
  // ---- extras for screenshots and tests ----
  play(): void;
  continue(): void;
  load(state: GameState): GameState | null;
  sheet(name: Sheet): void;
  /** Finish a playback at once. */
  skip(): void;
  debrief(page: number | null): void;
  /** The slip a hold would put down on this place. */
  arm(region: RegionId): void;
  /** Pick a counter up (or put it down with null). */
  lift(kind: PieceKind | null): void;
  /** Where the frame sits in the window (window px per frame px and its top-left). */
  frame(): { scale: number; left: number; top: number };
  view(): PaperView;
  words(): typeof content.strings;
}

declare global {
  interface Window {
    __redlines?: RedlinesHook;
  }
}

export function installDevHook(): void {
  const hook: RedlinesHook = {
    seed(seed) {
      return act.startGame(seed, { explain: false });
    },
    state: () => run.value,
    promise(region) {
      act.doPromise(region);
      return run.value;
    },
    withdraw(region) {
      act.doWithdraw(region);
      return run.value;
    },
    move(kind, region) {
      act.moveTo(kind, region);
      return run.value;
    },
    wayOut(term, detail) {
      act.offer(term, detail);
      return run.value;
    },
    async endWeek() {
      await act.sendOrders();
      return run.value;
    },
    async answer(key) {
      await act.answer(key);
      return run.value;
    },
    set(patch) {
      const s = run.value;
      if (!s) return null;
      return hook.load({ ...s, ...patch });
    },
    busy: () => busy.value,
    centre(region) {
      return getMap()?.centre(region) ?? null;
    },
    title: act.quitToTitle,
    explain(step) {
      if (step === null) {
        act.explainSkip();
        return;
      }
      if (screen.value !== 'game' || !run.value) act.startGame(act.randomSeed(), { explain: false });
      sheet.value = null;
      explain.value = step;
    },
    play: act.play,
    continue: act.continueGame,
    load(state) {
      const s = loadGame(saveGame(state));
      if (!s) return null;
      act.cancelPlayback();
      run.value = s;
      // The sheet shows the state at once (no playback), through the same path a continue takes.
      writeSave(s);
      saved.value = true;
      act.continueGame();
      return run.value;
    },
    sheet(name) {
      sheet.value = name;
    },
    skip: act.skipPlayback,
    debrief(page) {
      act.debriefGo(page);
    },
    arm: act.armRegion,
    lift: act.liftPiece,
    frame: () => frameFit.value,
    view: () => mapView.value,
    words: () => content.strings,
  };
  window.__redlines = hook;
}
