/**
 * The director: plays a sweep's schedule over the pre-sweep table, then the outcome (clear, miss
 * or carry on), then hands the screen back to the run. A tap anywhere jumps to the end of the
 * slam; a second tap jumps to the end. The UI never computes a score: every number shown here is
 * read from the engine's trace.
 */
import { audio } from '../../../audio';
import { COLOURS } from '../../content/map';
import { PATTERN } from '../../content/patterns';
import { formatShort, type RunState, type SweepRecord } from '../../engine';
import { busy, reduced, run, shown, speed } from '../app/store';
import { hintsAfter, hintsBriefing } from '../app/hints';
import { seatCentre, centre, R } from '../common/layout';
import * as A from '../fx/anim';
import type { FlyerLayer } from '../fx/flyers';
import { buzz, shake, stopShake } from '../fx/shake';
import { getMap, pinOnFrame } from '../table/mapRef';
import { outcomeSchedule, sweepSchedule, type Anchor, type Cue, type OutcomeCue } from './schedule';

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
}
let playing: Playing | null = null;

/** Jump ahead: to the end of the slam, or (during the outcome) to the end. */
export function skip(): void {
  playing?.line.finish();
}

export function isPlaying(): boolean {
  return playing !== null;
}

function anchorPoint(a: Anchor): { x: number; y: number } {
  return 'seat' in a ? seatCentre(a.seat) : pinOnFrame(a.region);
}

const BOX_CENTRE = { inf: centre(R.inf), mom: centre(R.mom) };

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
  });

  shown.value = prev;
  const line = new Timeline<Cue>(sched.cues, sched.end, (c) => scoreCue(c, rec, prev, rate, isReduced), rate);
  playing = { stage: 'score', line };
  await line.start();
  endScoring(rec);

  const kind = missed ? 'miss' : rec.cleared ? 'clear' : 'carryOn';
  const clear = next.lastClear;
  const outcome = outcomeSchedule({
    kind,
    fundsBefore: clear?.fundsBefore ?? next.funds,
    fundsAfter: clear?.fundsAfter ?? next.funds,
    reduced: isReduced,
  });
  const line2 = new Timeline<OutcomeCue>(outcome.cues, outcome.end, (c) => outcomeCue(c, rec, prev, next), rate);
  playing = { stage: 'outcome', line: line2 };
  await line2.start();
  endOutcome(next);
  playing = null;
  busy.value = false;
}

function scoreCue(c: Cue, rec: SweepRecord, prev: RunState, rate: number, isReduced: boolean): void {
  const map = getMap();
  switch (c.do) {
    case 'press':
      A.leverDown.value = true;
      break;
    case 'dim':
      map?.fx.dimExcept(rec.scoringSet);
      break;
    case 'stamp':
      A.stampedPattern.value = { name: c.name, level: c.level, n: (A.stampedPattern.value?.n ?? 0) + 1 };
      break;
    case 'base':
      A.boxes.value = { I: c.I, M10: c.M10 };
      A.baseFlip.value++;
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
      const to = BOX_CENTRE[c.box];
      const riseMs = c.rise ? 60 / rate : 0;
      flyers?.launch({
        text: c.text,
        tone: c.box,
        x0: from.x,
        y0: from.y,
        x1: to.x,
        y1: to.y,
        rise: riseMs,
        ms: c.ms / rate,
        big: c.big,
      });
      break;
    }
    case 'land': {
      const b = A.boxes.value ?? { I: rec.baseInfluence, M10: rec.baseM10 };
      if (c.box === 'inf') A.boxes.value = { ...b, I: c.value > b.I ? c.value : b.I };
      else A.boxes.value = { ...b, M10: c.value > b.M10 ? c.value : b.M10 };
      const k = A.bumps.value;
      A.bumps.value = c.mult ? { ...k, mult: k.mult + 1 } : c.box === 'inf' ? { ...k, inf: k.inf + 1 } : { ...k, mom: k.mom + 1 };
      break;
    }
    case 'sound':
      audio.play(c.sfx, { intensity: c.intensity });
      break;
    case 'buzz':
      buzz(c.ms);
      break;
    case 'shake':
      if (!isReduced) shake(c.px, c.ms / rate);
      break;
    case 'heat':
      A.heat.value = c.on;
      map?.fx.heat(c.on);
      break;
    case 'slide':
      A.slam.value = 'slide';
      break;
    case 'collide':
      map?.fx.scanTo(null);
      A.slam.value = 'hit';
      A.boxes.value = { I: rec.influence, M10: rec.m10 };
      break;
    case 'mapFlash': {
      const colour = prev.world.colour[c.region];
      map?.fx.mapFlash(COLOURS[colour].hex);
      break;
    }
    case 'cascade':
      // The sweep's leverage stays on the readout; the board's tiles cascade to the new crisis total.
      A.boardShow.value = { mode: 'cascade', text: formatShort(rec.totalAfter, 7), ms: c.ms / rate, n: A.nextBoardN() };
      for (let i = 0; i < 5; i++) window.setTimeout(() => audio.play('tick', { intensity: 0.04 }), (i * 40) / rate);
      break;
    case 'tick':
      // The total settles: the progress rule fills and the flashpoint ring shrinks to match.
      A.totalShown.value = rec.totalAfter;
      break;
    case 'release':
      A.leverDown.value = false;
      break;
  }
}

/** The scoring is over (played out or skipped): show its final state. */
function endScoring(rec: SweepRecord): void {
  const map = getMap();
  flyers?.clear();
  stopShake();
  map?.fx.scanTo(null);
  map?.fx.heat(false);
  A.heat.value = false;
  A.leverDown.value = false;
  A.boxes.value = { I: rec.influence, M10: rec.m10 };
  A.slam.value = 'hit';
  A.boardShow.value = null;
  A.totalShown.value = rec.totalAfter;
  A.hops.value = {};
}

function outcomeCue(c: OutcomeCue, rec: SweepRecord, prev: RunState, next: RunState): void {
  const map = getMap();
  switch (c.do) {
    case 'settle':
      map?.fx.dimExcept(null);
      if (next.phase === 'missed') {
        A.keepLit.value = true;
        A.revealOutcome.value = false;
        audio.drone(false);
      } else if (rec.cleared) {
        A.holdCleared.value = true;
        A.brassHold.value = next.lastClear?.brass ?? rec.topRegion;
        A.fundsShown.value = next.lastClear?.fundsBefore ?? prev.funds;
        A.revealOutcome.value = false;
        audio.drone(false);
      }
      // A plain carry-on clears the readout now; a clear or a miss keeps the slam on show.
      if (next.phase === 'crisis') clearReadout();
      A.totalShown.value = null;
      shown.value = next;
      hintsAfter(prev, next);
      break;
    case 'collapse':
      break;
    case 'shockwave':
      void map?.fx.shockwave(next.crisis.flashpoint);
      break;
    case 'cleared':
      A.holdCleared.value = false;
      A.clearedStamp.value++;
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
      A.fundsShown.value = null;
      A.revealOutcome.value = true;
      clearReadout();
      hintsBriefing(next);
      break;
    case 'lightsOut':
      void map?.fx.lightsOut(2000);
      break;
    case 'card':
      A.keepLit.value = false;
      map?.fx.reset();
      A.revealOutcome.value = true;
      clearReadout();
      break;
    case 'sound':
      audio.play(c.sfx, { intensity: c.intensity });
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
  if (shown.value !== cur) {
    shown.value = cur;
    hintsAfter(next, cur);
  }
  const wasClear = A.holdCleared.value || A.brassHold.value !== null;
  A.resetAnim();
  if (wasClear) A.clearedStamp.value++;
  flyers?.clear();
  if (cur.phase !== 'crisis') map?.fx.reset();
  droneFor(cur);
}
