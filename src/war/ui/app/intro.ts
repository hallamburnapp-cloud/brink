/**
 * The explanation at the start (SPEC section 3): three screens on the real map. Each screen plays
 * its lesson in short beats (the coach strip says what the map is doing as it does it), then waits
 * for a tap. A tap before the lesson has played does not leave it: it hurries the rest along at
 * twice the speed (and ends a send that is playing), so nobody skips the stakes by accident. SKIP
 * leaves at once.
 *
 * The screens play real games of seed FIRST-WORLD on the table, and screen 3 plays its sends through
 * the director, exactly as the game will (scan, flying numbers, slam, the score into the ring, ink),
 * at 2x. The console only wakes once the lesson reaches it: screen 1 is the goal alone.
 *
 * First launch: PLAY → the intro → TRY IT starts the coached first turn on this same map.
 * How to play (title or menu): the intro, then the rules sheet.
 */
import { batch, signal } from '@preact/signals';
import { audio } from '../../../audio';
import { must, newGame, pin, send, warSpreadTarget, type GameState, type RegionId, type StaffId } from '../../engine';
import { DEAL_GAP_MS } from '../table/deal';
import { getMap } from '../table/mapRef';
import { mapViewFor } from '../table/view';
import { INTRO_COPY } from './copy';
import { whenTableShown } from './curtain';
import * as P from './playback';
import { prefs, reduced, screen, shown, speedBoost } from './store';

export type IntroScreen = 1 | 2 | 3;

/** How much of the console the lesson has reached. */
export type IntroConsole = 'off' | 'target' | 'live';

export interface IntroView {
  screen: IntroScreen;
  /** The beat on the coach strip now. */
  text: string;
  /** The world before a crisis: every region lit, no ring (screen 1). */
  calm: boolean;
  finger: RegionId | null;
  highlight: RegionId[] | null;
  /** The lesson has played: a tap goes on (before this a tap hurries the lesson). */
  tapReady: boolean;
  /** The tap-to-continue label. */
  tapLabel: string;
  /** 'off': the readout and controls rest dimmed and blank (no crisis yet); 'target': TARGET only; 'live'. */
  console: IntroConsole;
  /** Screen 3 keeps war's tag on the region it spreads to (undefined: the game's own tag). */
  warNext?: { id: RegionId; turns: number } | null;
  /** Screen 3 replays the same table: a small label says so ('AGAIN, WITH STAFF'). */
  replay: string | null;
}

export const introView = signal<IntroView | null>(null);
/** Screen 3's last beat: a desk lamp shows in the first seat, as a ghost ('+4', hire after turn 2). */
export const introSeat = signal<{ seat: number; id: StaffId; chip: string; fired?: boolean } | null>(null);

/** Screen 2's finger: the crisis, then across the causeway and the sea lane (WINS 2). */
export const INTRO_PINS: readonly RegionId[] = ['SHL', 'LNK', 'PBB', 'MRM'];

/**
 * The intro's clock: virtual time that runs at `rate` (a tap before the lesson ends doubles it), so a
 * hurried screen keeps its order and only plays faster. Waits are in ms at 1x and follow the speed
 * setting; they never fire for a screen that has gone.
 */
class Clock {
  private vt = 0;
  private last = performance.now();
  private timer = 0;
  private waits: Array<{ at: number; go: () => void }> = [];
  private rate = 1;

  setRate(r: number): void {
    this.sync();
    this.rate = r;
  }

  wait(ms: number): Promise<void> {
    this.sync();
    return new Promise((go) => {
      this.waits.push({ at: this.vt + ms / prefs.value.speed, go });
      this.arm();
    });
  }

  stop(): void {
    clearTimeout(this.timer);
    this.timer = 0;
    this.waits = [];
  }

  private sync(): void {
    const now = performance.now();
    this.vt += (now - this.last) * this.rate;
    this.last = now;
  }

  private arm(): void {
    if (!this.timer) this.timer = window.setTimeout(this.tick, 16);
  }

  private tick = (): void => {
    this.timer = 0;
    this.sync();
    const due = this.waits.filter((w) => w.at <= this.vt);
    this.waits = this.waits.filter((w) => w.at > this.vt);
    for (const w of due) w.go();
    if (this.waits.length) this.arm();
  };
}

interface Run {
  /** 'play': TRY IT starts the first game. 'rules': the intro was asked for (How to play). */
  then: 'play' | 'rules';
  done: () => void;
  start: GameState;
  clock: Clock;
  /** Counts screens shown: a screen's steps stop once another has replaced it. */
  token: number;
  /** A tap came before the lesson had played: the rest of the screen runs at 2x. */
  hurry: boolean;
  /** A send is playing through the director (it resolves once the send has unwound). */
  sending: Promise<void> | null;
}

let active: Run | null = null;

function set(patch: Partial<IntroView>): void {
  if (introView.value) introView.value = { ...introView.value, ...patch };
}

/** The speed boost: 2x while a send plays (SPEC 3), and 2x again when hurried. */
function boost(run: Run): void {
  if (active === run) speedBoost.value = (run.sending ? 2 : 1) * (run.hurry ? 2 : 1);
}

/** Start the intro. `done` runs when it ends (TRY IT, the last tap, or SKIP). */
export function startIntro(then: 'play' | 'rules', done: () => void): void {
  stopIntro();
  const run: Run = { then, done, start: newGame('FIRST-WORLD'), clock: new Clock(), token: 0, hurry: false, sending: null };
  active = run;
  // The world is drawn at once; the first screen's animation waits until the title has lifted.
  batch(() => {
    shown.value = run.start;
    introView.value = view(1, run);
  });
  void whenTableShown().then(() => active === run && showScreen(1));
}

function view(screen: IntroScreen, run: Run): IntroView {
  return {
    screen,
    text: INTRO_COPY[screen][0],
    calm: screen === 1,
    finger: null,
    highlight: null,
    tapReady: false,
    tapLabel: screen === 3 && run.then === 'play' ? 'TRY IT' : 'TAP TO CONTINUE',
    console: screen === 1 ? 'off' : screen === 2 ? 'target' : 'live',
    replay: null,
  };
}

/** A rewind on screen 3 cross-fades the map instead of snapping (with a label that it is a replay). */
const REWIND_FADE_MS = 300;

/** A tap anywhere on the frame while the intro is up. */
export function introTap(): void {
  const v = introView.value;
  const run = active;
  if (!v || !run) return;
  if (!v.tapReady) {
    hurry(run);
    return;
  }
  if (v.screen === 3) finishIntro();
  else showScreen((v.screen + 1) as IntroScreen);
}

/** A tap before the lesson has played: a send playing jumps to its end, the rest runs at 2x. */
function hurry(run: Run): void {
  if (run.sending) P.director().skip();
  if (run.hurry) return;
  run.hurry = true;
  run.clock.setRate(2);
  boost(run);
}

/** SKIP, or the back button. A send playing unwinds first, so nothing of it lands on the game. */
export function finishIntro(): void {
  const run = active;
  if (!run) return;
  const sending = run.sending;
  stopIntro();
  if (sending) void sending.then(() => run.done());
  else run.done();
}

/** Tear the intro down without running its ending (leaving the game, a new game). */
export function stopIntro(): void {
  const run = active;
  if (run) {
    run.clock.stop();
    run.token++;
    if (run.sending) {
      P.director().skip(true);
      // Whatever replaced the intro draws its own table; redraw it once the send has unwound.
      void run.sending.then(() => {
        if (active) return;
        P.resetPlayback();
        redrawTable();
      });
    }
  }
  active = null;
  speedBoost.value = 1;
  batch(() => {
    introView.value = null;
    introSeat.value = null;
  });
  P.resetPlayback();
  getMap()?.fx.reset();
}

/** The table shows the game on show again (after a send the intro cut short). */
function redrawTable(): void {
  const s = shown.value;
  if (s && screen.value === 'game') getMap()?.update(mapViewFor(s, { highlight: null, finger: null, hover: null, calm: false }));
}

export function introRunning(): boolean {
  return active !== null;
}

function showScreen(n: IntroScreen): void {
  const run = active;
  if (!run) return;
  run.clock.stop();
  run.clock.setRate(1);
  run.hurry = false;
  boost(run);
  const token = ++run.token;
  getMap()?.fx.reset();
  P.resetPlayback();
  introSeat.value = null;
  batch(() => {
    shown.value = run.start;
    introView.value = view(n, run);
  });
  const steps: Steps = {
    live: () => active === run && run.token === token,
    wait: (ms) => run.clock.wait(ms),
    beat: (i) => set({ text: INTRO_COPY[n][i] }),
    send: (prev, next, after) => playSend(run, token, prev, next, after),
  };
  const lesson = n === 1 ? screenOne(steps) : n === 2 ? screenTwo(steps, run.start) : screenThree(steps, run.start);
  void lesson.then(() => {
    if (steps.live()) set({ tapReady: true });
  });
}

interface Steps {
  /** This screen is still the one on show. */
  live: () => boolean;
  wait: (ms: number) => Promise<void>;
  /** Put beat i of this screen's copy on the strip. */
  beat: (i: number) => void;
  /**
   * Play a send through the director; false if the screen went meanwhile. `after` changes the view
   * in the same commit that shows the result.
   */
  send: (prev: GameState, next: GameState, after?: Partial<IntroView>) => Promise<boolean>;
}

/** A send through the director, at 2x. The screen then shows its result. */
async function playSend(run: Run, token: number, prev: GameState, next: GameState, after?: Partial<IntroView>): Promise<boolean> {
  if (active !== run || run.token !== token) return false;
  shown.value = prev;
  // The boost is set before the director reads the speed (it takes its rate as the send starts).
  let settle = (): void => {};
  run.sending = new Promise<void>((resolve) => (settle = resolve));
  boost(run);
  try {
    // A tag the lesson sets for after the send rests there as the send ends, not on the turn after's count.
    await P.director().playSend(prev, next, after?.warNext !== undefined ? { afterTag: after.warNext } : {});
  } catch (e) {
    console.error('[war] intro send failed', e);
  } finally {
    settle();
  }
  run.sending = null;
  boost(run);
  if (active !== run || run.token !== token) return false;
  batch(() => {
    P.resetPlayback();
    if (after) set(after);
    shown.value = next;
  });
  return true;
}

/** The goal: Lantern Key gold, three red; a gold wave over the whole world, then war. */
async function screenOne(s: Steps): Promise<void> {
  if (!(await step(s, 300))) return;
  P.goalGlow.value = 'gold';
  void getMap()?.fx.shockwave('LNK', 600);
  audio.play('tick', { intensity: 0.4 });
  if (!(await step(s, 700))) return;
  void getMap()?.fx.wave('LNK', 'gold', 1200);
  audio.play('capital', { intensity: 0.5 });
  // The GOLD bar fills to 30 and empties with the wave (the board sets these at once, never rolling).
  for (const gold of [6, 12, 18, 24, 30, 30, 24, 18, 12, 6, 1]) {
    P.goal.value = { gold, red: 3 };
    if (!(await step(s, 110))) return;
  }
  P.goal.value = null;
  P.goalGlow.value = null;
  if (!(await step(s, 300))) return;
  s.beat(1);
  P.goalGlow.value = 'war';
  audio.play('thump', { intensity: 0.3 });
  const red = ['DNM', 'ORN', 'FLE'];
  for (let i = 0; i < 2; i++) {
    set({ highlight: red });
    if (!(await step(s, 300))) return;
    set({ highlight: null });
    if (!(await step(s, 300))) return;
  }
  if (!(await step(s, 900))) return;
  P.goalGlow.value = null;
}

/** Screen 3 goes back to the table as it was: effects stop, and the map cross-fades to it. */
function rewind(): void {
  const map = getMap();
  map?.fx.reset();
  map?.fx.crossFade?.(REWIND_FADE_MS);
}

/** A wait that reports whether the screen is still on show. */
async function step(s: Steps, ms: number): Promise<boolean> {
  await s.wait(ms);
  return s.live();
}

/** The turn: the crisis and its target, ten regions light, a ghost finger pins four. */
async function screenTwo(s: Steps, start: GameState): Promise<void> {
  const map = getMap();
  // The light-up is set before the update that shows the regions lit (showScreen's).
  if (map && !reduced.value) map.lightUp(start.deal.lit, DEAL_GAP_MS, 400);
  audio.play('tick', { intensity: 0.3 });
  if (!(await step(s, 1900))) return;
  s.beat(1);
  let game = start;
  for (const [i, id] of INTRO_PINS.entries()) {
    if (!(await step(s, i === 0 ? 400 : 450))) return;
    set({ finger: id });
    if (!(await step(s, 300))) return;
    game = must(pin(game, id));
    shown.value = game;
    audio.play('pin', { intensity: 0.2 + 0.15 * i });
    if (i === 0) set({ console: 'live' });
    if (i === 1) {
      // 'Add their numbers' is POINTS, 'times how many' is MULTIPLIER: both boxes pulse as it is said.
      s.beat(2);
      P.multWeight.value = 0.8;
      P.bumps.value = { points: P.bumps.value.points + 1, mult: P.bumps.value.mult + 1 };
    }
  }
  if (!(await step(s, 500))) return;
  set({ finger: null });
  s.beat(3);
  await s.wait(2000);
}

/**
 * The outcome, through the director: the four pins win (gold floods Shoal, then Pebbleby); rewound,
 * Shoal alone misses and war takes it, then war spreads by itself into the tagged region; last, a
 * desk lamp in the first seat lifts the multiplier: staff boost the same send.
 */
async function screenThree(s: Steps, start: GameState): Promise<void> {
  let pinned = start;
  for (const id of INTRO_PINS) pinned = must(pin(pinned, id));
  const won = must(send(pinned));
  shown.value = pinned;
  if (!(await step(s, 300))) return;
  if (!(await s.send(pinned, won))) return;
  if (!(await step(s, 500))) return;

  // Rewind: Shoal alone (14), a miss. Played as turn 3, so war also spreads by itself, exactly as the
  // engine resolves it: into the region the tag points at once Shoal is lost (its tag says THIS TURN).
  // The lesson's numbers stay the lesson's: the readout keeps TARGET 64 (not turn 4's) and the tag
  // keeps 'WAR · THIS TURN' on where war goes next.
  rewind();
  audio.play('slide', { intensity: 0.4 });
  const alone: GameState = { ...must(pin(start, 'SHL')), turn: 3 };
  const spread = must(send(alone));
  batch(() => {
    set({ replay: 'AGAIN: SHOAL ALONE' });
    shown.value = alone;
  });
  s.beat(1);
  if (!(await step(s, 700))) return;
  const next = warSpreadTarget(spread.owner);
  if (!(await s.send(alone, spread, { warNext: next ? { id: next, turns: 1 } : null }))) return;
  if (!(await step(s, 500))) return;

  // Staff: the same four pins, and a desk lamp's +4 lifts the multiplier from 8 to 12 (264 → 396).
  rewind();
  batch(() => {
    set({ replay: 'AGAIN, WITH STAFF', warNext: undefined });
    shown.value = pinned;
  });
  s.beat(2);
  introSeat.value = { seat: 0, id: 'DUTY', chip: '+4' };
  audio.play('capital', { intensity: 0.4 });
  P.boxes.value = { points: 33n, m10: 80n };
  if (!(await step(s, 600))) return;
  P.boxes.value = { points: 33n, m10: 120n };
  P.bumps.value = { ...P.bumps.value, mult: P.bumps.value.mult + 1 };
  introSeat.value = { seat: 0, id: 'DUTY', chip: '+4', fired: true };
  audio.play('tick', { intensity: 0.6 });
  await s.wait(1400);
}
