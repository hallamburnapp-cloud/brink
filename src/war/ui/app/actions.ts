/**
 * Everything the player can do, as one function each. Taps, keys and the dev hook all come through
 * here, so they share one code path. Each calls the engine, stores the new game, saves it when the
 * spec says to (after every SEND and every shop action), and on a refusal shows the engine's reason
 * as a short toast above the control that was tapped.
 *
 * SEND is the seam with the director: the resolved game is stored at once, the pre-send game stays
 * on show, and director().playSend(prev, next) plays the cascade and the outcome (playback.ts).
 */
import { batch } from '@preact/signals';
import { audio } from '../../../audio';
import * as E from '../../engine';
import type { GameState, RegionId, Result } from '../../engine';
import { centre, R, type Rect } from '../common/layout';
import { buzz } from '../fx/shake';
import { getMap } from '../table/mapRef';
import { dropCurtain, raiseCurtain, veil, VEIL_MS } from './curtain';
import { coachAfter, coachSend, coachStart, coachStop } from './hints';
import { finishIntro, introRunning, startIntro, stopIntro } from './intro';
import { director, resetPlayback } from './playback';
import {
  balloon,
  busy,
  pressHighlight,
  prefs,
  reduced,
  replacing,
  run,
  saved,
  screen,
  setPrefs,
  sheet,
  showToast,
  shown,
  speed,
  trayLeaving,
} from './store';
import { clearSave, readSave, writeSave } from './storage';
import { turnOneStep } from './teach';

/** Where a refusal toast should sit: above the control that was tapped. */
export function above(r: Rect): { x: number; bottom: number } {
  return { x: centre(r).x, bottom: r[1] - 6 };
}

/** Shop refusals are said just above the tray, never over the cards. */
export const TRAY_TOAST = { x: 195, bottom: R.tray[1] - 8 };

/** The pause after an outcome before the next turn is dealt (1x). */
const OUTCOME_HOLD_MS = 700;
/** The tray's slide away before the next turn is shown (1x). */
const TRAY_LEAVE_MS = 220;

// ---------------------------------------------------------------- saving

function persist(s: GameState): void {
  writeSave(s);
  saved.value = s.phase !== 'over';
}

/** Save the game on show (the page is being hidden). The intro's scenes are never saved. */
export function saveNow(): void {
  const s = run.value;
  if (s && screen.value === 'game' && !introRunning()) persist(s);
}

// ---------------------------------------------------------------- the drone

/** The room's drone follows the war: it rises at 8 and 9 red. Off outside a game. */
export function droneFor(s: GameState | null): void {
  if (!s || s.phase === 'over') {
    audio.drone(false);
    return;
  }
  const red = E.goalView(s).red;
  audio.drone(true, Math.min(1, 0.15 + 0.045 * red + (red >= 8 ? 0.3 : 0)));
}

// ---------------------------------------------------------------- the store

/** Store a result; on refusal, say why. Returns true when the action happened. */
function commit(r: Result, at?: { x: number; bottom: number }): boolean {
  if (!r.ok) {
    showToast(r.reason, at);
    return false;
  }
  const prev = run.value;
  batch(() => {
    run.value = r.state;
    shown.value = r.state;
  });
  coachAfter(prev, r.state);
  return true;
}

/** The game, when the player may act on it (not while a send plays, not during the intro). */
function current(): GameState | null {
  return busy.value || introRunning() ? null : run.value;
}

function clearTransient(): void {
  batch(() => {
    balloon.value = null;
    replacing.value = null;
    pressHighlight.value = null;
  });
}

// ---------------------------------------------------------------- starting and leaving

function randomSeed(): string {
  const bytes = new Uint8Array(4);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < 4; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return `WORLD-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** Put a game on the table. */
function begin(s: GameState): void {
  // From the title, the title stays up until the war room's table has drawn.
  if (screen.value === 'title') raiseCurtain();
  stopIntro();
  director().skip();
  cancelTimers();
  resetPlayback();
  getMap()?.fx.reset();
  clearTransient();
  batch(() => {
    sheet.value = null;
    busy.value = false;
    run.value = s;
    shown.value = s;
    screen.value = 'game';
  });
  persist(s);
  coachStart(s);
  droneFor(s);
}

/** The first game on a device is FIRST-WORLD (coached); every game after it is a fresh world. */
function freshGame(): GameState {
  return prefs.value.playedFirst ? E.newGame(randomSeed()) : E.newGame(E.FIRST_WORLD_SEED);
}

/** The intro on the game screen, over a game in progress or from the title. */
function runIntro(then: 'play' | 'rules', done: () => void): void {
  if (screen.value === 'title') raiseCurtain();
  coachStop();
  clearTransient();
  sheet.value = null;
  screen.value = 'game';
  audio.drone(false);
  startIntro(then, () => {
    setPrefs({ introSeen: true });
    done();
  });
}

/** PLAY: on a first launch the intro, then the coached first game; after that a new world. */
export function play(): void {
  if (!prefs.value.introSeen) {
    runIntro('play', () => begin(E.newGame(E.FIRST_WORLD_SEED)));
    return;
  }
  newGameNow();
}

/** NEW GAME (the title with a save, the end card): a new deal at once. */
export function newGameNow(): void {
  clearSave();
  saved.value = false;
  begin(freshGame());
}

/** CONTINUE: the saved game, where it was left. A finished turn deals the next one. */
export function continueGame(): void {
  const s = readSave();
  if (!s) {
    saved.value = false;
    return;
  }
  const r = s.phase === 'outcome' ? E.nextTurn(s) : null;
  begin(r?.ok ? r.state : s);
}

/** PRACTICE (the rules sheet): the coached first game again. */
export function practice(): void {
  begin(E.newGame(E.FIRST_WORLD_SEED));
}

/** CROWN DEMO: Example 3, the break, set up at turn 14. */
export function crownDemo(): void {
  begin(E.newGame(E.CROWN_SEED, { demo: 'crown' }));
}

/** HOW TO PLAY (title or menu): the three intro screens, then the rules sheet. */
export function howToPlay(): void {
  if (busy.value) director().skip();
  const fromGame = screen.value === 'game' && run.value !== null;
  runIntro('rules', () => {
    if (fromGame && run.value) {
      shown.value = run.value;
      coachStart(run.value);
      droneFor(run.value);
    } else {
      dropCurtain();
      screen.value = 'title';
      shown.value = null;
    }
    sheet.value = 'rules';
  });
}

/** Leave the intro (SKIP, the back button). */
export function skipIntro(): void {
  finishIntro();
}

let quitting = 0;

function cancelQuit(): void {
  clearTimeout(quitting);
  quitting = 0;
  veil.value = false;
}

/** Back to the title: the game is saved, the war room fades to the table colour, the title comes up. */
export function quitToTitle(): void {
  saveNow();
  director().skip();
  stopIntro();
  coachStop();
  cancelTimers();
  audio.drone(false);
  clearTransient();
  sheet.value = null;
  if (screen.value !== 'game' || reduced.value) {
    leaveGame();
    return;
  }
  if (quitting) return;
  veil.value = true;
  quitting = window.setTimeout(leaveGame, VEIL_MS);
}

function leaveGame(): void {
  cancelQuit();
  dropCurtain();
  resetPlayback();
  batch(() => {
    busy.value = false;
    screen.value = 'title';
    run.value = null;
    shown.value = null;
  });
}

// ---------------------------------------------------------------- the turn

/** A tap on the map: pin or lift. On the coached first turn only what the step names can be tapped. */
export function tapRegion(id: RegionId): void {
  const s = current();
  if (!s || s.phase !== 'choose') return;
  balloon.value = null;
  const step = turnOneStep(s);
  if (step?.tappable && !step.tappable.includes(id)) {
    showToast('Tap the white ring first.', above(R.readout));
    return;
  }
  const lifting = s.deal.pins.includes(id);
  if (commit(E.togglePin(s, id), above(R.readout))) {
    buzz(lifting ? 4 : 8);
    audio.play('pin', { intensity: lifting ? 0.1 : Math.min(1, 0.2 * (run.value?.deal.pins.length ?? 1)) });
  }
}

export function swapNow(): void {
  const s = current();
  if (!s || s.phase !== 'choose') return;
  balloon.value = null;
  if (commit(E.swap(s), above(R.swap))) {
    audio.play('slide', { intensity: 0.5 });
    buzz(10);
  }
}

let advanceTimer = 0;

function cancelTimers(): void {
  clearTimeout(advanceTimer);
  clearTimeout(leaveTimer);
  advanceTimer = 0;
  leaveTimer = 0;
  trayLeaving.value = false;
}

/** SEND: resolve the turn, play it, then show the outcome (and deal the next turn, or open the shop). */
export async function sendNow(): Promise<void> {
  const s = current();
  if (!s || s.phase !== 'choose') return;
  const step = turnOneStep(s);
  if (step && !step.send) {
    showToast(`Beat ${E.formatInt(s.deal.target)} first: add regions.`, above(R.send));
    return;
  }
  const r = E.send(s);
  if (!r.ok) {
    showToast(r.reason, above(R.send));
    return;
  }
  const next = r.state;
  clearTransient();
  coachSend();
  if (s.mode === 'first' && !prefs.value.playedFirst) setPrefs({ playedFirst: true });
  busy.value = true;
  run.value = next;
  persist(next);
  try {
    await director().playSend(s, next);
  } catch (e) {
    console.error('[war] playback failed', e);
  }
  // The game was left or replaced while it played.
  if (run.value !== next) return;
  batch(() => {
    resetPlayback();
    shown.value = next;
    busy.value = false;
  });
  coachAfter(s, next);
  droneFor(next);
  if (next.phase === 'outcome') {
    advanceTimer = window.setTimeout(() => {
      if (run.value === next) advance(next);
    }, OUTCOME_HOLD_MS / speed.value);
  }
}

/** Deal the next turn. */
function advance(s: GameState): void {
  const prev = s;
  const r = E.nextTurn(s);
  if (!r.ok) return;
  getMap()?.fx.reset();
  clearTransient();
  batch(() => {
    run.value = r.state;
    shown.value = r.state;
  });
  persist(r.state);
  coachAfter(prev, r.state);
  droneFor(r.state);
  audio.play('flap', { intensity: 0.4 });
}

let leaveTimer = 0;

/** NEXT TURN (the shop): the tray slides away, then the next turn is dealt. */
export function nextTurnNow(): void {
  const s = current();
  if (!s || (s.phase !== 'shop' && s.phase !== 'outcome') || leaveTimer) return;
  if (s.phase === 'outcome' || reduced.value) {
    advance(s);
    return;
  }
  trayLeaving.value = true;
  audio.play('slide', { intensity: 0.6 });
  leaveTimer = window.setTimeout(() => {
    leaveTimer = 0;
    trayLeaving.value = false;
    if (run.value === s) advance(s);
  }, TRAY_LEAVE_MS / speed.value);
}

// ---------------------------------------------------------------- the shop

/** Hire offer `slot` (into the leftmost free seat, or in place of `replaceSeat`). False on a refusal. */
export function buyOffer(slot: number, replaceSeat?: number): boolean {
  const s = current();
  if (!s) return false;
  if (!commit(E.buy(s, slot, replaceSeat), TRAY_TOAST)) return false;
  clearTransient();
  persist(run.value!);
  audio.play('capital', { intensity: 0.6 });
  buzz(12);
  return true;
}

export function sellSeat(seat: number): void {
  const s = current();
  if (!s) return;
  if (commit(E.sell(s, seat), TRAY_TOAST)) {
    clearTransient();
    persist(run.value!);
    audio.play('capital', { intensity: 0.4 });
  }
}

export function rerollOffers(): boolean {
  const s = current();
  if (!s) return false;
  if (!commit(E.reroll(s), TRAY_TOAST)) return false;
  replacing.value = null;
  persist(run.value!);
  audio.play('offer', { intensity: 0.5 });
  return true;
}

export function moveSeat(from: number, to: number): void {
  const s = current();
  if (!s || from === to) return;
  if (commit(E.moveSeat(s, from, to), above(R.rail))) {
    if (balloon.value) balloon.value = { seat: to };
    if (s.phase === 'shop') persist(run.value!);
    audio.play('tick', { intensity: 0.2 });
    buzz(8);
  }
}

// ---------------------------------------------------------------- tests and screenshots

/** The dev hook's setOwner: redraw who owns what (the turn is dealt again on the new map). */
export function setOwnersNow(owners: string | Partial<Record<RegionId, E.Owner>>): boolean {
  const s = run.value;
  if (!s || busy.value || !commit(E.setOwners(s, owners))) return false;
  persist(run.value!);
  droneFor(run.value);
  return true;
}

/** The dev hook: start a game from a seed. */
export function startSeed(seed: string): void {
  begin(E.newGame(seed));
}
