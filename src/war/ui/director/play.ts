/**
 * The director: plays a send over the table (SPEC section 8) and hands the screen back.
 *
 * ENTRY POINTS. Loading this module registers it with app/playback.ts as the Director, so the
 * screens reach it through `director()`:
 *   - `playSend(prev, next)`: call on SEND, with the game SEND was pressed on (`prev`, phase 'choose',
 *     its pins down) and the resolved game (`next`, whose `lastSend` holds the record and the trace).
 *     It plays the cascade, the outcome on the map, war spreading by itself (after turns 3, 6, 9 ...)
 *     and the ending, all read from `next.lastSend`, so there is no separate call for those. It
 *     resolves once the screen may show `next`; the caller then resets the playback signals.
 *   - `tapSkip(at)`: a tap (frame px) or a key (null) during playback.
 *   - `skip()`: jump to the end now (leaving the game, the menu, the back button).
 *
 * WHAT PLAYS (1x; every time is divided by the speed, 2x or 4x):
 *   - Cascade (schedule.ts `sendSchedule`): the lever drops and everything but the pins dims (150 ms);
 *     from 450 ms each pin, west to east, flashes under the scan line and flings '+n' into POINTS and
 *     '+1' into MULTIPLIER (320 ms, 6% quicker each); each staff hops and flings its number (250 ms
 *     each), a per-region staff popping '×1.5' / '×2' off every matching pin (150 ms each, a shudder
 *     on every ×); the ring stamps its ×2; a held breath (240-320 ms); the 200 ms slam, sized by
 *     score ÷ target (at 10x the gold bloom and the showcase over the map); the plate holds 520 ms
 *     (showcase 900 ms) and the score flies into the crisis ring (300 ms). 3.3 s for the first send,
 *     about 6.6 s for the CROWN; capped at 8 s.
 *   - Outcome (`outcomeSchedule`): WIN: the ring collapses (300 ms), a shockwave and gold ink flood
 *     the crisis (600 ms) and its brass pin drops, then each further region gets a gold pulse along
 *     its joins (150 ms a join, at most 450 ms) and gold ink (400 ms), one every 0.5 s (1.0 s + 0.5 s
 *     a region, capped at 5 s); every region ticks GOLD (and WAR, when won back) and flies a coin to
 *     the chip. MISS (0.8 s): the drone dips, red ink runs in from the nearest war region (700 ms),
 *     WAR ticks, a 2 px shake. War spreading: 0.5 s later, a low drum and red ink (700 ms), then the
 *     tag moves. Then the table clears (pins lift, lamps off) and the result holds 150 ms (700 ms
 *     before the shop). Endings: WORLD UNITED (sunrise from the east, then a gold wave from the last
 *     region won, 2.4 s), CEASEFIRE (red stops pulsing, 1.1 s), WAR (lights out over grey, 2.5 s).
 *   - Reduced motion: no flights, shakes or travel; the cascade in 0.55 s and the outcome in 0.45 s.
 *
 * SKIPPING. A tap jumps to the slam having landed (it still sounds, buzzes and shakes) and the
 * outcome then plays; a second tap jumps to the end of the outcome. Taps in the first 700 ms after
 * SEND, or the first 250 ms of the outcome, or on SEND itself, never skip, so a double tap cannot
 * throw the send away; the coached first send plays in full.
 *
 * The UI never computes a score: every number shown here is read from the engine's trace and record.
 */
import { batch } from '@preact/signals';
import { audio } from '../../../audio';
import { formatInt, formatShort, mapView, type GameState, type RegionId, type SendRecord } from '../../engine';
import * as P from '../app/playback';
import { hoverRegion, reduced, speed } from '../app/store';
import { centre, MAP_X, MAP_Y, R, SEAT_H, SEAT_W, SEAT_X, SEAT_Y, type Rect } from '../common/layout';
import type { FlyerLayer, Tone } from '../fx/flyers';
import { buzz, shake, stopShake } from '../fx/shake';
import { ringLayout } from '../map';
import type { MapView } from '../map/contract';
import { getMap, pinOnFrame } from '../table/mapRef';
import {
  outcomeSchedule,
  ratio,
  sendSchedule,
  SHOP_HOLD_MS,
  shakeFor,
  showcaseLine,
  slamIntensity,
  type Anchor,
  type Box,
  type Cue,
  type OutcomeCue,
} from './schedule';
import { Timeline } from './timeline';
import { addBrass, claim, clearTable, take, viewOf, worldFrom, type World } from './world';

let flyers: FlyerLayer | null = null;
/** The flying-number canvas registers itself here (FlyerCanvas). */
export function setFlyerLayer(layer: FlyerLayer | null): void {
  flyers = layer;
}

/** One send on show. */
interface Show {
  prev: GameState;
  next: GameState;
  rec: SendRecord;
  rate: number;
  reduced: boolean;
  /** The table as it was sent: the outcome's views are this with the world's ownership. */
  base: MapView;
  /** The resolved game's view (where the war tag moves to). */
  after: MapView;
  world: World;
  collided: boolean;
  tapSkipped: boolean;
  /** The claim's chord started rising during the cascade. */
  riserPlayed: boolean;
  /** skip(): every remaining stage jumps to its end. */
  aborted: boolean;
}

interface Playing {
  stage: 'score' | 'outcome';
  line: Timeline<Cue> | Timeline<OutcomeCue>;
  /** Taps may not skip this send (the coached first send teaches the cascade). */
  noSkip: boolean;
}

let show: Show | null = null;
let playing: Playing | null = null;

/** No skip in the first 700 ms after SEND (at 1x), or the first 250 ms of the outcome. */
const SKIP_GUARD_MS = 700;
const OUTCOME_GUARD_MS = 250;
const GOLD = '#F2D27A';

// ---------------------------------------------------------------- entry points

/** Jump to the end now, whatever is playing. */
export function skip(): void {
  if (show) show.aborted = true;
  playing?.line.finish();
}

/**
 * A tap (frame px) or a key (null) during playback: skip ahead unless the send has only just started,
 * the tap is on SEND itself, or this is the coached first send.
 */
export function tapSkip(at: { x: number; y: number } | null): void {
  const p = playing;
  if (!p || p.noSkip || !show) return;
  const rate = show.rate;
  if (p.stage === 'score') {
    if (p.line.elapsed() < SKIP_GUARD_MS / rate) return;
    if (at && inside(R.send, at)) return;
    show.tapSkipped = true;
  } else if (p.line.elapsed() < OUTCOME_GUARD_MS / rate) {
    return;
  }
  p.line.finish();
}

/** Plays a send from `prev` (the table as it was sent) to `next` (the resolved game). */
export async function playSend(prev: GameState, next: GameState): Promise<void> {
  const rec = next.lastSend;
  if (!rec || show) return;
  const base = mapView(prev);
  const s: Show = {
    prev,
    next,
    rec,
    rate: speed.value,
    reduced: reduced.value,
    base,
    after: mapView(next),
    world: worldFrom(base),
    collided: false,
    tapSkipped: false,
    riserPlayed: false,
    aborted: false,
  };
  show = s;
  // The map is driven from here until the end: a stray hover must not redraw the table under it.
  hoverRegion.value = null;
  batch(() => {
    P.revealOutcome.value = false;
    P.boxes.value = { points: 0n, m10: 0n };
    P.goal.value = { gold: rec.goldBefore, red: rec.redBefore };
    P.coins.value = rec.coinsBefore;
  });
  const noSkip = prev.mode === 'first' && prev.turn === 1;
  try {
    await playCascade(s, noSkip);
    endCascade(s);
    const playedOut = await playOutcome(s);
    endOutcome(s, playedOut);
  } finally {
    playing = null;
    show = null;
  }
}

P.setDirector({ playSend, tapSkip, skip });

// ---------------------------------------------------------------- the cascade

async function playCascade(s: Show, noSkip: boolean): Promise<void> {
  const { rec, prev } = s;
  const newSeats = new Set(prev.seats.flatMap((seat, i) => (rec.newHires.includes(seat.uid) ? [i] : [])));
  const sched = sendSchedule({
    trace: rec.trace,
    score: rec.score,
    target: rec.target,
    win: rec.result === 'win',
    newSeats,
    reduced: s.reduced,
    rate: s.rate,
  });
  if (s.aborted) return;
  const line = new Timeline<Cue>(sched.cues, sched.end, (c) => scoreCue(c, s), s.rate);
  playing = { stage: 'score', line, noSkip };
  await line.start();
}

function scoreCue(c: Cue, s: Show): void {
  const map = getMap();
  const { rec } = s;
  switch (c.do) {
    case 'press':
      P.leverDown.value = true;
      break;
    case 'dim':
      map?.fx.dimExcept(rec.pins);
      break;
    case 'scan':
      if (map) map.fx.scanTo(map.pinPos(c.region).x);
      break;
    case 'scanOff':
      map?.fx.scanTo(null);
      break;
    case 'flash':
      map?.fx.flash(c.region);
      break;
    case 'hop':
      P.hops.value = { ...P.hops.value, [c.seat]: (P.hops.value[c.seat] ?? 0) + 1 };
      break;
    case 'fly':
      launchNumber(c, s);
      break;
    case 'land':
      land(c.box, c.value, c.mult, c.weight);
      break;
    case 'ringStamp':
      map?.fx.ringStamp();
      break;
    case 'sound':
      audio.play(c.sfx, { intensity: c.intensity });
      break;
    case 'buzz':
      buzz(c.pattern);
      break;
    case 'shake':
      if (!s.reduced) shake(c.px, c.ms / s.rate);
      break;
    case 'breath':
      // Both boxes pulse once, lightly, in the held beat before the slam.
      batch(() => {
        P.multWeight.value = 0.3;
        P.bumps.value = { points: P.bumps.value.points + 1, mult: P.bumps.value.mult + 1 };
      });
      break;
    case 'slide':
      P.slam.value = 'slide';
      break;
    case 'collide':
      s.collided = true;
      map?.fx.scanTo(null);
      batch(() => {
        P.slam.value = 'hit';
        P.boxes.value = { points: rec.points, m10: rec.m10 };
      });
      break;
    case 'bloom':
      map?.fx.bloom(rec.crisis, GOLD, 600);
      break;
    case 'showcase':
      P.showcase.value = { text: formatShort(rec.score, 10), sub: showcaseLine(c.r, rec.regions), n: P.nextN() };
      break;
    case 'toRing':
      scoreToRing(c.from, c.ms, s);
      break;
    case 'riser':
      s.riserPlayed = true;
      audio.play('ante_smash', { intensity: Math.min(1, 0.5 + 0.1 * rec.regions) });
      break;
    case 'release':
      P.leverDown.value = false;
      break;
    case 'landed':
      // The score hits the ring: the crisis flashes white as the ring takes it.
      map?.fx.flash(rec.crisis);
      break;
  }
}

/** A number lands in its box: the box shows the running value (never less than it showed) and bumps. */
function land(box: Box, value: bigint, mult: boolean, weight: number): void {
  const b = P.boxes.value ?? { points: 0n, m10: 0n };
  batch(() => {
    if (box === 'points') P.boxes.value = { ...b, points: value > b.points ? value : b.points };
    else P.boxes.value = { ...b, m10: value > b.m10 ? value : b.m10 };
    P.multWeight.value = mult ? weight : Math.min(weight, 0.6);
    const k = P.bumps.value;
    P.bumps.value = box === 'points' ? { ...k, points: k.points + 1 } : { ...k, mult: k.mult + 1 };
  });
}

/** Where a staff number pops: just under its seat's chip, on the map's top edge. */
function seatLaunch(seat: number): { x: number; y: number } {
  const x = SEAT_X[Math.max(0, Math.min(SEAT_X.length - 1, seat))];
  return { x: x + SEAT_W / 2, y: SEAT_Y + SEAT_H + 9 };
}

/** The ring's ×2 chip, joined to the right of the target on the badge above the ring. */
function ringChipPoint(crisis: RegionId, targetText: string): { x: number; y: number } {
  const L = ringLayout(crisis);
  // The badge is the target (13 pt mono, about 7.9 pt a glyph, padded) plus the 24 pt ×2 segment.
  const width = targetText.length * 7.9 + 14 + 24;
  return { x: MAP_X + L.badge.x + width / 2 - 12, y: MAP_Y + L.badge.y };
}

function anchorPoint(a: Anchor, s: Show): { x: number; y: number } {
  if ('seat' in a) return seatLaunch(a.seat);
  if ('ringChip' in a) return ringChipPoint(a.ringChip, formatInt(s.rec.target));
  return pinOnFrame(a.region);
}

/** Numbers land on a box's top edge, so they never cover the digits they change. */
function boxEdge(box: Box): { x: number; y: number } {
  const r = box === 'points' ? R.points : R.mult;
  return { x: centre(r).x, y: r[1] + 3 };
}

const LOOK = {
  pin: { size: 18, trail: false, ease: 'inOut' },
  one: { size: 12, trail: false, ease: 'inOut' },
  staff: { size: 20, trail: true, ease: 'in' },
  pop: { size: 22, trail: true, ease: 'in' },
  crisis: { size: 28, trail: true, ease: 'in' },
} as const;

function launchNumber(c: Extract<Cue, { do: 'fly' }>, s: Show): void {
  if (!flyers) return;
  const from = anchorPoint(c.from, s);
  const to = boxEdge(c.box);
  const look = LOOK[c.look];
  const hot = c.text.startsWith('×');
  const size = (hot && c.look === 'staff' ? 26 * c.weight : c.look === 'pop' ? look.size * c.weight : look.size) * (c.isNew ? 1.5 : 1);
  // The '+1' sits beside the pin's own number as it rises, so the two never overlap.
  const dx = c.look === 'one' ? 17 : 0;
  flyers.launch({
    text: c.text,
    suffix: c.isNew ? '· new' : undefined,
    tone: c.box === 'points' ? 'points' : 'mult',
    x0: from.x + dx,
    y0: from.y,
    x1: to.x,
    y1: to.y,
    pop: c.pop / s.rate,
    rise: c.rise,
    ms: c.ms / s.rate,
    size,
    trail: look.trail,
    hot,
    ease: look.ease,
    underline: c.isNew,
  });
}

/** The plate's result line, where the score leaves the readout. */
const PLATE_SCORE = { x: 285, y: 718 };
const MAP_CENTRE = centre(R.map);

/** The score leaves the readout (or the showcase over the map) and lands in the crisis ring. */
function scoreToRing(from: 'plate' | 'showcase', ms: number, s: Show): void {
  const start = from === 'showcase' ? MAP_CENTRE : PLATE_SCORE;
  if (from === 'showcase') P.showcase.value = null;
  const ring = pinOnFrame(s.rec.crisis);
  flyers?.launch({
    text: formatShort(s.rec.score, from === 'showcase' ? 10 : 7),
    tone: 'score',
    x0: start.x,
    y0: start.y,
    x1: ring.x,
    y1: ring.y,
    pop: 0,
    rise: 0,
    ms: ms / s.rate,
    size: from === 'showcase' ? 52 : 24,
    trail: true,
    hot: false,
    ease: 'in',
  });
}

/** The cascade is over (played out or skipped): show its final state. A skipped slam still lands. */
function endCascade(s: Show): void {
  const { rec } = s;
  flyers?.clear();
  stopShake();
  getMap()?.fx.scanTo(null);
  batch(() => {
    P.leverDown.value = false;
    P.boxes.value = { points: rec.points, m10: rec.m10 };
    P.slam.value = 'hit';
    P.showcase.value = null;
    P.hops.value = {};
  });
  if (!s.collided && !s.aborted) slamNow(s);
}

/** A skipped slam still lands: its sound, its haptic, its shake and (at 10x) its bloom. */
function slamNow(s: Show): void {
  const { rec } = s;
  const r = ratio(rec.score, rec.target);
  const quiet = rec.result !== 'win';
  const loud = slamIntensity(rec.score, r, quiet);
  audio.play('tally_slam', { intensity: loud });
  audio.play('thump', { intensity: loud });
  buzz(30);
  if (s.reduced || quiet) return;
  shake(shakeFor(r), 250);
  if (r >= 10) getMap()?.fx.bloom(rec.crisis, GOLD, 600);
}

// ---------------------------------------------------------------- the outcome

/** Plays the outcome; true when it played to its end (not skipped). */
async function playOutcome(s: Show): Promise<boolean> {
  if (s.aborted) return false;
  const { rec } = s;
  const outcome = outcomeSchedule({
    crisis: rec.crisis,
    result: rec.result,
    won: rec.won,
    lost: rec.lost,
    spread: rec.spread,
    ending: rec.ending,
    coinsBefore: rec.coinsBefore,
    goldBefore: rec.goldBefore,
    redBefore: rec.redBefore,
    reduced: s.reduced,
    riserPlayed: s.riserPlayed,
    // The shop tray rises over the bottom of the map: the new map holds a moment first.
    holdMs: s.next.phase === 'shop' ? SHOP_HOLD_MS : undefined,
  });
  const line = new Timeline<OutcomeCue>(outcome.cues, outcome.end, (c) => outcomeCue(c, s), s.rate);
  playing = { stage: 'outcome', line, noSkip: false };
  await line.start();
  return line.playedOut && !s.aborted;
}

/** Show the world as it now stands. */
function draw(s: Show): void {
  getMap()?.update(viewOf(s.base, s.world));
}

function outcomeCue(c: OutcomeCue, s: Show): void {
  const map = getMap();
  switch (c.do) {
    case 'settle':
      // The score is in the ring: the whole world comes back to full light.
      map?.fx.dimExcept(null);
      draw(s);
      break;
    case 'collapse':
      if (!map) break;
      void map.fx.ringCollapse(c.ms).then(() => {
        if (show !== s) return;
        s.world = { ...s.world, crisis: null };
        draw(s);
      });
      break;
    case 'shockwave':
      void map?.fx.shockwave(c.region, 600);
      break;
    case 'travel':
      void map?.fx.travel(c.path, 'gold', c.stepMs);
      break;
    case 'claim':
      // The view takes the new owner in the same tick as the ink (the map's ownership rule).
      s.world = claim(s.world, c.region);
      draw(s);
      void map?.fx.inkSpread(c.from, [c.region], 'gold', c.ms);
      P.goal.value = { gold: c.gold, red: c.red };
      break;
    case 'coin':
      launchCoin(c.region, c.ms, s);
      break;
    case 'coins':
      P.coins.value = c.coins;
      break;
    case 'brass':
      s.world = addBrass(s.world, c.region);
      draw(s);
      void map?.fx.dropBrass(c.region);
      break;
    case 'take':
      s.world = take(s.world, c.region);
      draw(s);
      void map?.fx.inkSpread(c.from, [c.region], 'red', c.ms);
      P.goal.value = { gold: c.gold, red: c.red };
      break;
    case 'tag':
      s.world = { ...s.world, warNext: s.after.warNext };
      draw(s);
      break;
    case 'clear':
      s.world = clearTable(s.world);
      draw(s);
      break;
    case 'glow':
      P.goalGlow.value = c.which;
      break;
    case 'drone':
      if (c.level <= 0) audio.drone(false);
      else audio.drone(true, c.level);
      break;
    case 'ceasefire':
      s.world = { ...s.world, ceased: true };
      draw(s);
      break;
    case 'sunrise':
      flyers?.sunrise(R.map, c.ms / s.rate);
      break;
    case 'wave':
      void map?.fx.wave(c.region, 'gold', c.ms);
      break;
    case 'lightsOut':
      void map?.fx.lightsOut(c.ms);
      break;
    case 'sound':
      audio.play(c.sfx, { intensity: c.intensity });
      break;
    case 'buzz':
      buzz(c.pattern);
      break;
    case 'shake':
      if (!s.reduced) shake(c.px, c.ms / s.rate);
      break;
  }
}

/** The coin chip's coin, where coins land. */
const COIN_AT = { x: R.coins[0] + 22, y: centre(R.coins).y };

function launchCoin(region: RegionId, ms: number, s: Show): void {
  const from = pinOnFrame(region);
  flyers?.launch({
    text: '',
    coin: true,
    tone: 'coin' satisfies Tone,
    x0: from.x,
    y0: from.y,
    x1: COIN_AT.x,
    y1: COIN_AT.y,
    pop: 60 / s.rate,
    rise: 10,
    ms: ms / s.rate,
    size: 16,
    trail: true,
    hot: false,
    ease: 'in',
  });
}

/** The world once every change has played: the resolved game's, so the screen hands over seamlessly. */
function finalWorld(s: Show): World {
  const { next } = s;
  return clearTable({ ...s.world, owner: { ...next.owner }, brass: new Set(next.brass), warNext: s.after.warNext, ceased: next.ending === 'CEASEFIRE' });
}

/** The outcome is over (played out or skipped): the map, the counts and the coins show the result. */
function endOutcome(s: Show, playedOut: boolean): void {
  const map = getMap();
  const { rec } = s;
  flyers?.clear();
  stopShake();
  if (!playedOut && map) {
    // Effects still running (ink, travel, the wave) stop where they are; the world jumps to the end.
    map.fx.reset();
    if (rec.ending === 'WAR') void map.fx.lightsOut(200);
  }
  s.world = finalWorld(s);
  draw(s);
  batch(() => {
    P.goal.value = { gold: rec.gold, red: rec.red };
    P.coins.value = rec.coinsAfter;
    P.goalGlow.value = null;
  });
}

function inside(r: Rect, p: { x: number; y: number }): boolean {
  return p.x >= r[0] && p.x <= r[0] + r[2] && p.y >= r[1] && p.y <= r[1] + r[3];
}
