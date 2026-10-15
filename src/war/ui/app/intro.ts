/**
 * The explanation at the start (SPEC section 3): three screens on the real map, each a 4-6 s
 * animation and then a tap to go on (taps are ignored for the first 1.5 s). The copy sits on the
 * coach strip; the Big Board, the readout and the SEND label are live, because the screens play
 * real games of seed FIRST-WORLD on the table. SKIP leaves at once.
 *
 * First launch: PLAY → the intro → TRY IT starts the coached first turn on this same map.
 * How to play (title or menu): the intro, then the rules sheet.
 */
import { batch, signal } from '@preact/signals';
import { audio } from '../../../audio';
import { must, newGame, pin, send, warSource, warSpreadTarget, type GameState, type RegionId, type StaffId } from '../../engine';
import { DEAL_GAP_MS } from '../table/deal';
import { getMap } from '../table/mapRef';
import { INTRO_COPY } from './copy';
import { whenTableShown } from './curtain';
import * as P from './playback';
import { reduced, shown, speed } from './store';

export type IntroScreen = 1 | 2 | 3;

export interface IntroView {
  screen: IntroScreen;
  /** The copy on the coach strip. */
  text: string;
  /** The world before a crisis: every region lit, no ring (screen 1). */
  calm: boolean;
  finger: RegionId | null;
  highlight: RegionId[] | null;
  /** Taps are listened to (1.5 s in). */
  tapReady: boolean;
  /** The tap-to-continue label. */
  tapLabel: string;
  /** Screen 3 keeps war's tag on the region it spreads to (undefined: the game's own tag). */
  warNext?: { id: RegionId; turns: number } | null;
}

export const introView = signal<IntroView | null>(null);
/** Screen 3's last beat: an empty seat lights with a desk lamp and '+4'. */
export const introSeat = signal<{ seat: number; id: StaffId; chip: string } | null>(null);

/** Taps are ignored for this long on each screen. */
export const TAP_GUARD_MS = 1500;
/** Screen 2's finger: the crisis, then across the causeway and the sea lane (WINS 2). */
export const INTRO_PINS: readonly RegionId[] = ['SHL', 'LNK', 'PBB', 'MRM'];

interface Run {
  /** 'play': TRY IT starts the first game. 'rules': the intro was asked for (How to play). */
  then: 'play' | 'rules';
  done: () => void;
  start: GameState;
  timers: number[];
}

let active: Run | null = null;

function at(ms: number, fn: () => void): void {
  if (!active) return;
  const run = active;
  run.timers.push(window.setTimeout(() => active === run && fn(), reduced.value ? 0 : ms / speed.value));
}

function clearTimers(): void {
  active?.timers.forEach((t) => clearTimeout(t));
  if (active) active.timers = [];
}

function set(patch: Partial<IntroView>): void {
  if (introView.value) introView.value = { ...introView.value, ...patch };
}

/** Start the intro. `done` runs when it ends (TRY IT, the last tap, or SKIP). */
export function startIntro(then: 'play' | 'rules', done: () => void): void {
  stopIntro();
  const run: Run = { then, done, start: newGame('FIRST-WORLD'), timers: [] };
  active = run;
  // The world is drawn at once; the first screen's animation waits until the title has lifted.
  batch(() => {
    shown.value = run.start;
    introView.value = { screen: 1, text: INTRO_COPY[1], calm: true, finger: null, highlight: null, tapReady: false, tapLabel: 'TAP TO CONTINUE' };
  });
  void whenTableShown().then(() => active === run && showScreen(1));
}

/** A tap anywhere on the frame while the intro is up. */
export function introTap(): void {
  const v = introView.value;
  if (!v || !v.tapReady) return;
  if (v.screen === 3) finishIntro();
  else showScreen((v.screen + 1) as IntroScreen);
}

/** SKIP, or the back button. */
export function finishIntro(): void {
  const run = active;
  if (!run) return;
  stopIntro();
  run.done();
}

/** Tear the intro down without running its ending (leaving the game, a new game). */
export function stopIntro(): void {
  clearTimers();
  active = null;
  batch(() => {
    introView.value = null;
    introSeat.value = null;
  });
  P.resetPlayback();
  getMap()?.fx.reset();
}

export function introRunning(): boolean {
  return active !== null;
}

function showScreen(screen: IntroScreen): void {
  const run = active;
  if (!run) return;
  clearTimers();
  getMap()?.fx.reset();
  P.resetPlayback();
  introSeat.value = null;
  const label = screen === 3 && run.then === 'play' ? 'TRY IT' : 'TAP TO CONTINUE';
  batch(() => {
    shown.value = run.start;
    introView.value = { screen, text: INTRO_COPY[screen], calm: screen === 1, finger: null, highlight: null, tapReady: false, tapLabel: label };
  });
  // The tap guard is real time: it is about the player's hands, not the animation's speed.
  run.timers.push(window.setTimeout(() => active === run && set({ tapReady: true }), TAP_GUARD_MS));
  if (screen === 1) screenOne();
  else if (screen === 2) screenTwo(run.start);
  else screenThree(run.start);
}

/** The goal: Lantern Key gold, three red; a gold wave over the whole world, then war. */
function screenOne(): void {
  at(300, () => {
    P.goalGlow.value = 'gold';
    void getMap()?.fx.shockwave('LNK', 600);
    audio.play('tick', { intensity: 0.4 });
  });
  at(1000, () => {
    void getMap()?.fx.wave('LNK', 'gold', 1200);
    audio.play('capital', { intensity: 0.5 });
  });
  // The GOLD bar fills to 30 and empties with the wave, in steps the flaps can show cleanly.
  [8, 18, 30, 30, 18, 8, 1].forEach((gold, i) => at(1050 + i * 170, () => (P.goal.value = { gold, red: 3 })));
  at(2300, () => {
    P.goal.value = null;
    P.goalGlow.value = null;
  });
  at(2600, () => {
    P.goalGlow.value = 'war';
    audio.play('thump', { intensity: 0.3 });
  });
  const red = ['DNM', 'ORN', 'FLE'];
  [2700, 3300].forEach((t) => {
    at(t, () => set({ highlight: red }));
    at(t + 300, () => set({ highlight: null }));
  });
  at(4400, () => (P.goalGlow.value = null));
}

/** The turn: the crisis and its target, ten regions light, a ghost finger pins four. */
function screenTwo(start: GameState): void {
  const map = getMap();
  // The light-up is set before the update that shows the regions lit.
  if (map && !reduced.value) map.lightUp(start.deal.lit, DEAL_GAP_MS, 400);
  audio.play('tick', { intensity: 0.3 });
  let s = start;
  INTRO_PINS.forEach((id, i) => {
    const t = 2000 + i * 750;
    at(t, () => set({ finger: id }));
    at(t + 300, () => {
      s = must(pin(s, id));
      shown.value = s;
      audio.play('pin', { intensity: 0.2 + 0.15 * i });
    });
  });
  at(2000 + INTRO_PINS.length * 750, () => set({ finger: null }));
}

/** The outcome: a win floods gold; rewound, a miss turns the crisis red; then war spreads by itself. */
function screenThree(start: GameState): void {
  const map = getMap();
  const run = active;
  const live = () => active === run && introView.value?.screen === 3;
  let pinned = start;
  for (const id of INTRO_PINS) pinned = must(pin(pinned, id));
  const won = must(send(pinned));
  shown.value = pinned;
  // The send, at 2x: the ring collapses, gold ink floods Shoal, a gold pulse runs to Pebbleby, which floods.
  at(100, async () => {
    if (!map) return;
    await map.fx.ringCollapse(150);
    if (!live()) return;
    audio.play('capital', { intensity: 0.6 });
    P.goal.value = { gold: 2, red: 3 };
    await map.fx.inkSpread('SHL', ['SHL'], 'gold', 300);
    if (!live()) return;
    const path = won.lastSend?.won[1]?.path ?? ['SHL', 'PBB'];
    await map.fx.travel(path, 'gold', 75);
    if (!live()) return;
    audio.play('capital', { intensity: 0.7 });
    P.goal.value = { gold: 3, red: 3 };
    await map.fx.inkSpread('SHL', ['PBB'], 'gold', 200);
  });
  at(1500, () => {
    shown.value = won;
    P.goal.value = null;
  });
  // Rewind (0.4 s) and replay as a miss: Shoal alone, 14.
  const alone = must(pin(start, 'SHL'));
  const missed = must(send(alone));
  at(1800, () => {
    map?.fx.reset();
    shown.value = alone;
    audio.play('slide', { intensity: 0.4 });
  });
  at(2200, async () => {
    if (!map) return;
    audio.play('ante_miss', { intensity: 0.4 });
    P.goal.value = { gold: 1, red: 4 };
    await map.fx.inkSpread(missed.lastSend?.lost?.from ?? 'SHL', ['SHL'], 'red', 600);
  });
  at(3000, () => {
    shown.value = missed;
    P.goal.value = null;
  });
  // War spreads by itself: a drum, red ink from Floe End into Marram, the region its tag has been
  // on since the start (SPEC 3), so the tag stays there through the miss and goes with the spread.
  const target = warSpreadTarget(start.owner) ?? 'MRM';
  const spread: GameState = { ...missed, owner: { ...missed.owner, [target]: 'red' } };
  at(3000, () => set({ warNext: { id: target, turns: 1 } }));
  at(3200, async () => {
    if (!map) return;
    audio.play('thump', { intensity: 0.8 });
    P.goal.value = { gold: 1, red: 5 };
    await map.fx.inkSpread(warSource(start.owner, target) ?? target, [target], 'red', 700);
  });
  at(4000, () => {
    batch(() => {
      shown.value = spread;
      set({ warNext: null });
    });
    P.goal.value = null;
  });
  // The map resets to the start; an empty seat lights with a desk lamp and '+4'.
  at(4400, () => {
    map?.fx.reset();
    set({ warNext: undefined });
    shown.value = start;
    introSeat.value = { seat: 0, id: 'DUTY', chip: '+4' };
    audio.play('capital', { intensity: 0.4 });
  });
}
