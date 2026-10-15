/**
 * window.__war: a scripting hook for tests and screenshots (SPEC section 15), installed in dev
 * builds or with VITE_WAR_HOOK=1. Every call drives the same functions a tap does; send() resolves
 * once the send has played and the screen shows its outcome.
 */
import { CROWN_SEED, hashState, hashTrace, newGame, type GameState, type Owner, type RegionId } from '../../engine';
import type { MapView } from '../map/contract';
import { mapViewFor, NO_EXTRAS } from '../table/view';
import * as act from './actions';
import { introTap } from './intro';
import { director } from './playback';
import { busy, run, screen, setPrefs, sheet, shown, type Sheet } from './store';

export interface WarHook {
  seed(seed: string): GameState;
  state(): GameState | null;
  /** Pin these regions (in this order) if they are not pinned already. */
  pin(ids: string[]): GameState | null;
  send(): Promise<GameState | null>;
  swap(): GameState | null;
  buy(slot: number, replaceSeat?: number): GameState | null;
  sell(seat: number): GameState | null;
  reroll(): GameState | null;
  next(): GameState | null;
  demo(kind: 'crown'): GameState;
  /** setOwner: a 30-character map ('.' grey, 'G' gold, 'R' red, in id order) or a partial map. */
  setOwner(map: string | Partial<Record<RegionId, Owner>>): GameState | null;
  /** Extras for screenshots and tests. */
  move(from: number, to: number): GameState | null;
  intro(): void;
  tap(): void;
  play(): void;
  speed(n: 1 | 2 | 4): void;
  motion(m: 'full' | 'reduce' | 'system'): void;
  skip(): void;
  sheet(name: Sheet): void;
  title(): void;
  busy(): boolean;
  /** FNV-1a hashes of the last send's trace and of the whole game, for determinism checks. */
  hash(): { trace: string | null; state: string | null };
  /** The map view the table draws for the game on show (without the HUD's extras). */
  view(): MapView | null;
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
      for (const id of ids) if (!run.value?.deal.pins.includes(id)) act.tapRegion(id);
      return run.value;
    },
    async send() {
      await act.sendNow();
      return run.value;
    },
    swap() {
      act.swapNow();
      return run.value;
    },
    buy(slot, replaceSeat) {
      act.buyOffer(slot, replaceSeat);
      return run.value;
    },
    sell(seat) {
      act.sellSeat(seat);
      return run.value;
    },
    reroll() {
      act.rerollOffers();
      return run.value;
    },
    next() {
      act.nextTurnNow();
      return run.value;
    },
    demo() {
      act.crownDemo();
      return run.value ?? newGame(CROWN_SEED, { demo: 'crown' });
    },
    setOwner(map) {
      act.setOwnersNow(map);
      return run.value;
    },
    move(from, to) {
      act.moveSeat(from, to);
      return run.value;
    },
    intro: act.howToPlay,
    tap: introTap,
    play: act.play,
    speed(n) {
      setPrefs({ speed: n });
    },
    motion(m) {
      setPrefs({ motion: m });
    },
    skip: () => director().skip(),
    sheet(name) {
      sheet.value = name;
    },
    title() {
      act.quitToTitle();
      screen.value = 'title';
    },
    busy: () => busy.value,
    hash() {
      const s = run.value;
      return { trace: s?.lastSend ? hashTrace(s.lastSend.trace) : null, state: s ? hashState(s) : null };
    },
    view: () => (shown.value ? mapViewFor(shown.value, NO_EXTRAS) : null),
  };
  window.__war = hook;
}
