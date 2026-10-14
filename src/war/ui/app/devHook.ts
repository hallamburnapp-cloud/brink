/**
 * window.__war: a scripting hook for tests and screenshots (spec 14), installed in dev builds or
 * with VITE_WAR_HOOK=1. Every call drives the same functions a tap does; sweep() resolves when the
 * animation has finished.
 */
import { hashState, hashTrace, type RunState } from '../../engine';
import { skip } from '../director/play';
import * as act from './actions';
import { busy, run, screen, setPrefs, sheet, type Sheet } from './store';

export interface WarHook {
  seed(seed: string): RunState;
  state(): RunState | null;
  pin(ids: string[]): RunState | null;
  sweep(): Promise<RunState | null>;
  swap(ids?: string[]): RunState | null;
  buy(slot: number): RunState | null;
  next(): RunState | null;
  sandbox(kind: 'late' | 'mid'): RunState;
  speed(n: 1 | 2 | 4): void;
  skip(): void;
  /** Extras for screenshots and tests. */
  folder(): RunState | null;
  pick(i: number): RunState | null;
  keepGoing(): RunState | null;
  sheet(name: Sheet): void;
  title(): void;
  motion(m: 'full' | 'reduce' | 'system'): void;
  busy(): boolean;
  /** Put any engine state on the table (built from state() in the page). */
  load(s: RunState): RunState | null;
  /** FNV-1a hashes of the last sweep's trace and of the whole run, for determinism checks. */
  hash(): { trace: string | null; state: string | null };
}

declare global {
  interface Window {
    __war?: WarHook;
  }
}

export function installDevHook(): void {
  const hook: WarHook = {
    seed(seed) {
      act.startSeed(seed);
      return run.value!;
    },
    state: () => run.value,
    pin(ids) {
      for (const id of ids) if (!run.value?.crisis.pins.includes(id)) act.tapRegion(id);
      return run.value;
    },
    async sweep() {
      await act.sweepNow();
      return run.value;
    },
    swap(ids) {
      if (ids) hook.pin(ids);
      act.swapNow();
      return run.value;
    },
    buy(slot) {
      act.buyOffer(slot);
      return run.value;
    },
    next() {
      act.nextCrisis();
      return run.value;
    },
    sandbox(kind) {
      act.startSandbox(kind);
      return run.value!;
    },
    speed(n) {
      setPrefs({ speed: n });
    },
    skip,
    folder() {
      act.openFolder();
      return run.value;
    },
    pick(i) {
      act.pickCard(i);
      return run.value;
    },
    keepGoing() {
      act.keepGoing();
      return run.value;
    },
    sheet(name) {
      sheet.value = name;
    },
    title() {
      act.quitToTitle();
      screen.value = 'title';
    },
    motion(m) {
      setPrefs({ motion: m });
    },
    busy: () => busy.value,
    load(s) {
      act.loadState(s);
      return run.value;
    },
    hash() {
      const s = run.value;
      return { trace: s?.lastSweep ? hashTrace(s.lastSweep.trace) : null, state: s ? hashState(s) : null };
    },
  };
  window.__war = hook;
}
