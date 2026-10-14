/**
 * The director: plays a sweep's schedule over the pre-sweep table, then the outcome (clear, miss
 * or carry on), then hands the screen back to the run. A tap jumps to the end of the slam (the slam
 * still lands: sound, haptic, shake); a second tap jumps to the end. Taps right after SWEEP never
 * skip, nor do taps on SWEEP itself, so a double tap cannot throw the scoring away. The UI never
 * computes a score: every number shown here is read from the engine's trace.
 */
import { batch } from '@preact/signals';
import { audio } from '../../../audio';
import { COLOURS } from '../../content/map';
import { PATTERN } from '../../content/patterns';
import { formatShort, type RegionId, type RunState, type SweepRecord } from '../../engine';
import type { MapControllerPlus } from '../art';
import { busy, reduced, run, shown, speed } from '../app/store';
import { curtain, whenTableShown } from '../app/curtain';
import { hintsAfter, hintsBriefing } from '../app/hints';
import { centre, R, SEAT_H, SEAT_W, SEAT_X, SEAT_Y, type Rect } from '../common/layout';
import * as A from '../fx/anim';
import type { FlyerLayer } from '../fx/flyers';
import { buzz, shake, stopShake } from '../fx/shake';
import { getMap, pinOnFrame } from '../table/mapRef';
import {
  outcomeSchedule,
  shakeFor,
  shareOfNeed,
  slamIntensity,
  sweepSchedule,
  type Anchor,
  type Box,
  type Cue,
  type OutcomeCue,
} from './schedule';

let flyers: FlyerLayer | null = null;
export function setFlyerLayer(layer: FlyerLayer | null): void {
  flyers = layer;
}

/** Runs timed cues against the clock, at the current speed. */
class Timeline<C extends { t: number }> {
  private idx = 0;
  private t0 = 0;
  private raf = 0;
  private timer = 0;
  private done = false;
  private resolve: (() => void) | null = null;

  constructor(
    private readonly cues: readonly C[],
    private readonly end: number,
    private readonly exec: (c: C) => void,
    private readonly rate: number,
  ) {}

  start(): Promise<void> {
    this.t0 = performance.now();
    return new Promise((res) => {
      this.resolve = res;
      this.tick();
      // A slow backup keeps cues firing when frames stop (a hidden tab).
      this.timer = window.setInterval(() => this.tick(), 50);
    });
  }

  /** Real milliseconds since the line started. */
  elapsed(): number {
    return performance.now() - this.t0;
  }

  /** Stop now without running the remaining cues. */
  finish(): void {
    if (this.done) return;
    this.done = true;
    cancelAnimationFrame(this.raf);
    clearInterval(this.timer);
    this.resolve?.();
  }

  private tick = (): void => {
    if (this.done) return;
    const el = (performance.now() - this.t0) * this.rate;
    while (this.idx < this.cues.length && this.cues[this.idx].t <= el) {
      const c = this.cues[this.idx++];
      try {
        this.exec(c);
      } catch (e) {
        console.error('[war] cue failed', c, e);
      }
    }
    if (this.idx >= this.cues.length && el >= this.end) {
      this.finish();
      return;
    }
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.tick);
  };
}

interface Playing {
  stage: 'score' | 'outcome';
  line: Timeline<Cue> | Timeline<OutcomeCue>;
  /** Taps may not skip this sweep (the first night's first crisis teaches the cascade). */
  noSkip: boolean;
}
let playing: Playing | null = null;

/** What the current sweep has already shown, for a skip to land the rest. */
const progress = { collided: false, riser: false, tapSkipped: false };

/** No skip in the first 700 ms after SWEEP (at 1x), or the first 250 ms of the outcome. */
const SKIP_GUARD_MS = 700;
const OUTCOME_GUARD_MS = 250;

/** Jump ahead now, unconditionally: to the end of the slam, or (during the outcome) to the end. */
export function skip(): void {
  playing?.line.finish();
}

/**
 * A tap (or a key) during playback, at `at` in frame px (null for a key): skip ahead unless the
 * sweep has only just started, the tap is on SWEEP itself, or this sweep is one the first night
 * plays in full.
 */
export function tapSkip(at: { x: number; y: number } | null): void {
  const p = playing;
  if (!p || p.noSkip) return;
  const rate = speed.value;
  if (p.stage === 'score') {
    if (p.line.elapsed() < SKIP_GUARD_MS / rate) return;
    if (at && inside(R.sweep, at)) return;
    progress.tapSkipped = true;
  } else if (p.line.elapsed() < OUTCOME_GUARD_MS / rate) {
    return;
  }
  p.line.finish();
}

function inside(r: Rect, p: { x: number; y: number }): boolean {
  return p.x >= r[0] && p.x <= r[0] + r[2] && p.y >= r[1] && p.y <= r[1] + r[3];
}

export function isPlaying(): boolean {
  return playing !== null;
}

/** Where a staff number pops: just under its seat's chip, on the table's top edge. */
function seatLaunch(seat: number): { x: number; y: number } {
  const x = SEAT_X[Math.max(0, Math.min(SEAT_X.length - 1, seat))];
  return { x: x + SEAT_W / 2, y: SEAT_Y + SEAT_H + 9 };
}

function anchorPoint(a: Anchor): { x: number; y: number } {
  return 'seat' in a ? seatLaunch(a.seat) : pinOnFrame(a.region);
}

/** Numbers land on a box's top edge, so they never cover the digits they change. */
function boxEdge(box: Box): { x: number; y: number } {
  const r = box === 'inf' ? R.inf : R.mom;
  return { x: centre(r).x, y: r[1] + 3 };
}

/** The Big Board's leverage tiles, where the product lands. */
const BOARD_TILES = { x: 182, y: 76 };
/** The product lifts off the top of the sum's plate (the plate keeps its own copy). */
const PLATE_TOP = { x: 285, y: 690 };
const MAP_CENTRE = centre(R.map);

/** Drone: brighter the further the crisis is from its target. */
export function droneFor(s: RunState | null): void {
  if (!s || s.phase !== 'crisis') {
    audio.drone(false);
    return;
  }
  const t = s.crisis.target;
  const left = t > 0n ? Number(((t - s.crisis.total) * 1000n) / t) / 1000 : 0;
  audio.drone(true, 0.2 + 0.6 * Math.max(0, Math.min(1, left)));
}

/** Time between regions lighting on a deal (1x). */
const DEAL_GAP_MS = 70;
/** Longer than the curtain can ever stay up: the regions wait dark until it lifts. */
const CURTAIN_HOLD_MS = 10_000;

/**
 * A deal or a refill: the regions light one by one in deal order, each with a soft tick a step
 * higher than the last.
 */
export function dealIn(map: MapControllerPlus, ids: RegionId[]): void {
  if (reduced.value) {
    audio.play('tick', { intensity: 0.2 });
    return;
  }
  // The night's first deal waits, dark, until the title has lifted off the table, so the player
  // sees all eight regions light (DESIGN, first 60 seconds).
  if (curtain.value !== null) {
    map.lightUp(ids, 0, CURTAIN_HOLD_MS);
    void whenTableShown().then(() => {
      if (getMap() === map) dealIn(map, ids);
    });
    return;
  }
  const gap = DEAL_GAP_MS / speed.value;
  map.lightUp(ids, DEAL_GAP_MS);
  ids.forEach((_, i) => window.setTimeout(() => audio.play('tick', { intensity: Math.min(0.6, 0.15 + 0.06 * i) }), i * gap));
}

/** Plays the sweep from `prev` (the table as it was) to `next` (the run after the sweep). */
export async function playSweep(prev: RunState, next: RunState): Promise<void> {
  const rec = next.lastSweep;
  if (!rec || playing) return;
  busy.value = true;
  const rate = speed.value;
  const isReduced = reduced.value;
  const map = getMap();
  map?.setSpeed(rate);
  map?.setReducedMotion(isReduced);
  progress.collided = false;
  progress.riser = false;
  progress.tapSkipped = false;

  const missed = next.phase === 'missed';
  const sched = sweepSchedule({
    trace: rec.trace,
    leverage: rec.leverage,
    target: rec.target,
    totalBefore: rec.totalBefore,
    topRegion: rec.topRegion,
    patternName: PATTERN[rec.pattern].name,
    reduced: isReduced,
    quiet: missed,
    clears: rec.cleared,
    rate,
  });

  shown.value = prev;
  const line = new Timeline<Cue>(sched.cues, sched.end, (c) => scoreCue(c, rec, prev, rate), rate);
  playing = { stage: 'score', line, noSkip: prev.firstNight && prev.sweepsTaken < 2 };
  await line.start();
  // A tap skipped the slam: it still lands, so the payoff is never silent.
  if (progress.tapSkipped && !progress.collided) slamNow(rec, prev, missed, isReduced);
  endScoring(rec);

  const kind = missed ? 'miss' : rec.cleared ? 'clear' : 'carryOn';
  const clear = next.lastClear;
  const outcome = outcomeSchedule({
    kind,
    fundsBefore: clear?.fundsBefore ?? next.funds,
    fundsAfter: clear?.fundsAfter ?? next.funds,
    reduced: isReduced,
    riserPlayed: progress.riser,
  });
  const line2 = new Timeline<OutcomeCue>(outcome.cues, outcome.end, (c) => outcomeCue(c, rec, prev, next), rate);
  playing = { stage: 'outcome', line: line2, noSkip: false };
  await line2.start();
  endOutcome(next);
  playing = null;
  busy.value = false;
}

function scoreCue(c: Cue, rec: SweepRecord, prev: RunState, rate: number): void {
  const map = getMap();
  switch (c.do) {
    case 'press':
      A.leverDown.value = true;
      break;
    case 'dim':
      map?.fx.dimExcept(rec.scoringSet);
      break;
    case 'stamp':
      A.stampedPattern.value = { name: c.name, level: c.level, n: A.nextN() };
      break;
    case 'base':
      // The boxes already show the pattern's base while choosing: the stamp locks them in place.
      batch(() => {
        A.boxes.value = { I: c.I, M10: c.M10 };
        A.bumps.value = { ...A.bumps.value, base: A.bumps.value.base + 1 };
      });
      break;
    case 'scan': {
      const x = map?.pinPos(c.region).x ?? 0;
      if (c.again) map?.fx.scanAgain(x);
      else map?.fx.scanTo(x);
      break;
    }
    case 'flash':
      map?.fx.flash(c.region);
      break;
    case 'thread':
      map?.pulseThreadAmount(c.from, c.to, c.amount);
      break;
    case 'stampPulse':
      map?.fx.stampPulse(c.region);
      break;
    case 'standby':
      map?.fx.standbyPulse(c.region);
      break;
    case 'hop':
      A.hops.value = { ...A.hops.value, [c.seat]: (A.hops.value[c.seat] ?? 0) + 1 };
      break;
    case 'fly': {
      const from = anchorPoint(c.from);
      const to = boxEdge(c.box);
      const mult = c.text.startsWith('×');
      flyers?.launch({
        text: c.text,
        tone: c.box,
        x0: from.x,
        y0: from.y,
        x1: to.x,
        y1: to.y,
        pop: c.pop / rate,
        rise: c.rise,
        ms: c.ms / rate,
        size: mult ? 26 * c.weight : c.big ? 20 : 18,
        trail: c.big,
        hot: mult,
        ease: c.big ? 'in' : 'inOut',
      });
      break;
    }
    case 'land': {
      const b = A.boxes.value ?? { I: rec.baseInfluence, M10: rec.baseM10 };
      batch(() => {
        if (c.box === 'inf') A.boxes.value = { ...b, I: c.value > b.I ? c.value : b.I };
        else A.boxes.value = { ...b, M10: c.value > b.M10 ? c.value : b.M10 };
        const k = A.bumps.value;
        if (c.mult) A.multWeight.value = c.weight;
        A.bumps.value = c.mult ? { ...k, mult: k.mult + 1 } : c.box === 'inf' ? { ...k, inf: k.inf + 1 } : { ...k, mom: k.mom + 1 };
      });
      break;
    }
    case 'sound':
      audio.play(c.sfx, { intensity: c.intensity });
      break;
    case 'buzz':
      buzz(c.ms);
      break;
    case 'shake':
      if (!reduced.value) shake(c.px, c.ms / rate);
      break;
    case 'heat':
      A.heat.value = c.on;
      map?.fx.heat(c.on);
      break;
    case 'breath':
      A.breath.value++;
      break;
    case 'slide':
      A.slam.value = 'slide';
      break;
    case 'collide':
      progress.collided = true;
      map?.fx.scanTo(null);
      batch(() => {
        A.slam.value = 'hit';
        A.boxes.value = { I: rec.influence, M10: rec.m10 };
      });
      break;
    case 'mapFlash':
      map?.bloom(c.region, COLOURS[prev.world.colour[c.region]].hex);
      break;
    case 'showcase':
      A.showcase.value = { text: formatShort(rec.leverage, 7), sub: `×${c.r >= 100 ? Math.round(c.r) : c.r.toFixed(1)} THE TARGET`, n: A.nextN() };
      break;
    case 'print': {
      // The product leaves the readout (or the showcase) for the Big Board.
      const from = c.from === 'map' ? MAP_CENTRE : PLATE_TOP;
      if (c.from === 'map') A.showcase.value = null;
      flyers?.launch({
        text: formatShort(rec.leverage, 7),
        tone: 'lev',
        x0: from.x,
        y0: from.y,
        x1: BOARD_TILES.x,
        y1: BOARD_TILES.y,
        pop: 0,
        rise: 0,
        ms: c.ms / rate,
        size: c.from === 'map' ? 52 : 20,
        trail: true,
        hot: false,
        ease: 'in',
      });
      break;
    }
    case 'roll':
      // The total rolls up to meet it; the progress rule fills and the ring's arc empties with it.
      batch(() => {
        A.boardRoll.value = { from: rec.totalBefore, to: rec.totalAfter, ms: c.ms / rate, n: A.nextN() };
        A.totalShown.value = rec.totalAfter;
        if (rec.cleared) A.ringHold.value = true;
      });
      break;
    case 'riser':
      progress.riser = true;
      audio.play('ante_smash', { intensity: 0.8 });
      break;
    case 'release':
      A.leverDown.value = false;
      break;
  }
}

/** A skipped slam still lands: its sound, its haptic, its shake and (at 10x) its bloom. */
function slamNow(rec: SweepRecord, prev: RunState, quiet: boolean, isReduced: boolean): void {
  const r = shareOfNeed(rec.leverage, rec.target, rec.totalBefore);
  const loud = slamIntensity(rec.leverage, r, quiet);
  audio.play('tally_slam', { intensity: loud });
  audio.play('thump', { intensity: loud });
  buzz(30);
  if (isReduced || quiet) return;
  shake(shakeFor(r), 250);
  if (r >= 10) getMap()?.bloom(rec.topRegion, COLOURS[prev.world.colour[rec.topRegion]].hex);
}

/** The scoring is over (played out or skipped): show its final state. */
function endScoring(rec: SweepRecord): void {
  const map = getMap();
  flyers?.clear();
  stopShake();
  map?.fx.scanTo(null);
  // A clear keeps the white-hot light on until CLEARED is stamped.
  if (!rec.cleared) map?.fx.heat(false);
  batch(() => {
    if (!rec.cleared) A.heat.value = false;
    A.leverDown.value = false;
    A.boxes.value = { I: rec.influence, M10: rec.m10 };
    A.slam.value = 'hit';
    A.boardRoll.value = null;
    A.showcase.value = null;
    A.totalShown.value = rec.totalAfter;
    A.ringHold.value = rec.cleared;
    A.hops.value = {};
  });
}

function outcomeCue(c: OutcomeCue, rec: SweepRecord, prev: RunState, next: RunState): void {
  const map = getMap();
  switch (c.do) {
    case 'settle':
      // One write: the map must never see the run move on without the totals and holds that go with it.
      batch(() => {
        if (next.phase === 'missed') {
          // The table stays as it was swept (no refill) until the lights have gone out.
          A.tableKeep.value = { lit: prev.crisis.lit, pins: prev.crisis.pins, joins: rec.threads };
          A.revealOutcome.value = false;
        } else if (rec.cleared) {
          // The scored pins stay in, lit, until the Briefing rises.
          A.tableKeep.value = { lit: [], pins: rec.scoringSet, joins: rec.threads };
          A.holdCleared.value = true;
          A.brassHold.value = next.lastClear?.brass ?? rec.topRegion;
          A.fundsShown.value = next.lastClear?.fundsBefore ?? prev.funds;
          A.revealOutcome.value = false;
        } else {
          // A plain carry-on: the readout keeps the sweep's sum until the next pin (Readout).
          clearReadout();
        }
        A.totalShown.value = null;
        shown.value = next;
      });
      if (next.phase !== 'crisis') audio.drone(false);
      else map?.fx.dimExcept(null);
      hintsAfter(prev, next);
      break;
    case 'collapse':
      A.ringHold.value = false;
      map?.collapseRing();
      break;
    case 'shockwave':
      void map?.fx.shockwave(next.crisis.flashpoint);
      break;
    case 'cleared':
      batch(() => {
        A.holdCleared.value = false;
        A.heat.value = false;
        A.clearedStamp.value++;
      });
      map?.fx.heat(false);
      break;
    case 'drop': {
      const at = A.brassHold.value;
      A.brassHold.value = null;
      if (at) void map?.fx.dropBrass(at);
      break;
    }
    case 'coin':
      A.fundsShown.value = c.funds;
      break;
    case 'rise':
      batch(() => {
        A.fundsShown.value = null;
        A.revealOutcome.value = true;
        A.tableKeep.value = null;
        clearReadout();
      });
      map?.fx.dimExcept(null);
      hintsBriefing(next);
      break;
    case 'lightsOut':
      void map?.fx.lightsOut(c.ms);
      break;
    case 'card':
      batch(() => {
        A.tableKeep.value = null;
        A.revealOutcome.value = true;
        clearReadout();
      });
      map?.fx.reset();
      break;
    case 'sound':
      audio.play(c.sfx, { intensity: c.intensity });
      break;
    case 'buzz':
      buzz(c.pattern);
      break;
  }
}

function clearReadout(): void {
  A.boxes.value = null;
  A.slam.value = 'idle';
  A.stampedPattern.value = null;
}

function endOutcome(next: RunState): void {
  const map = getMap();
  const cur = run.value ?? next;
  const moved = shown.value !== cur;
  const wasClear = A.holdCleared.value || A.brassHold.value !== null;
  const wasKept = A.tableKeep.value !== null;
  batch(() => {
    shown.value = cur;
    A.resetAnim();
    if (wasClear) A.clearedStamp.value++;
  });
  if (moved) hintsAfter(next, cur);
  flyers?.clear();
  if (cur.phase !== 'crisis') map?.fx.reset();
  else if (wasKept) map?.fx.dimExcept(null);
  droneFor(cur);
}
