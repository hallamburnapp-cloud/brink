/**
 * Everything the player can do, as one function each. Taps, drags and the dev hook all come
 * through here, so they share one code path. Each calls the engine, stores the new run, and on a
 * refusal shows the engine's reason as a short toast.
 */
import { audio } from '../../../audio';
import * as E from '../../engine';
import type { RegionId, Result, RunState } from '../../engine';
import { REGION } from '../../content/map';
import { ORDER } from '../../content/orders';
import { centre, R, type Rect } from '../common/layout';
import { droneFor, isPlaying, playSweep, skip } from '../director/play';
import { resetAnim, trayLeaving } from '../fx/anim';
import { buzz } from '../fx/shake';
import { getMap } from '../table/mapRef';
import { dropCurtain, raiseCurtain, veil, VEIL_MS } from './curtain';
import { hintsAfter, hintsStart, hintsStop, hintTap } from './hints';
import { balloon, busy, cableDrag, pressHighlight, pressNote, prefs, receiptOpen, reduced, run, screen, setPrefs, sheet, showToast, shown, speed } from './store';

/** Where a refusal toast should sit: above the control that was tapped. */
export function above(r: Rect): { x: number; bottom: number } {
  return { x: centre(r).x, bottom: r[1] - 6 };
}

/** Store a result; on refusal, say why. Returns true when the action happened. */
function commit(r: Result, at?: { x: number; bottom: number }): boolean {
  if (!r.ok) {
    showToast(r.reason, at);
    return false;
  }
  const prev = run.value;
  run.value = r.state;
  shown.value = r.state;
  hintsAfter(prev, r.state);
  return true;
}

function current(): RunState | null {
  return busy.value ? null : run.value;
}

// ---------------------------------------------------------------- starting and leaving

function randomSeed(): string {
  const bytes = new Uint8Array(4);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < 4; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return `NIGHT-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function begin(s: RunState): void {
  // From the title, the title stays up until the war room's table has drawn.
  if (screen.value === 'title') raiseCurtain();
  skip();
  cancelLeaving();
  cancelQuit();
  resetAnim();
  getMap()?.fx.reset();
  balloon.value = null;
  receiptOpen.value = null;
  pressHighlight.value = null;
  pressNote.value = null;
  sheet.value = null;
  run.value = s;
  shown.value = s;
  screen.value = 'game';
  hintsStart(s);
  droneFor(s);
}

/** NEW NIGHT: the scripted first night on first launch, a fresh seed after that. */
export function newNight(): void {
  begin(E.newRun(prefs.value.playedFirstNight ? randomSeed() : E.FIRST_NIGHT_SEED));
}

export function startSeed(seed: string): void {
  begin(E.newRun(seed));
}

export function startSandbox(kind: 'late' | 'mid'): void {
  begin(E.newSandbox(kind));
}

/** Tests and screenshots only (the dev hook): put any engine state on the table as a fresh start. */
export function loadState(s: RunState): void {
  begin(s);
}

let quitting = 0;

function cancelQuit(): void {
  clearTimeout(quitting);
  quitting = 0;
  veil.value = false;
}

/** Back to the title: the war room fades to the table colour, then the title comes up. */
export function quitToTitle(): void {
  const s = run.value;
  // A first night left after its first sweep has done its teaching: the next night is a fresh map.
  if (s?.firstNight && s.sweepsTaken > 0 && !prefs.value.playedFirstNight) setPrefs({ playedFirstNight: true });
  skip();
  cancelLeaving();
  hintsStop();
  audio.drone(false);
  balloon.value = null;
  receiptOpen.value = null;
  sheet.value = null;
  pressHighlight.value = null;
  pressNote.value = null;
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
  resetAnim();
  screen.value = 'title';
  run.value = null;
  shown.value = null;
}

// ---------------------------------------------------------------- the table

/** A tap on the map: pin or unpin, or feed the armed Order. */
export function tapRegion(id: RegionId): void {
  const s = current();
  if (!s) return;
  balloon.value = null;
  if (s.armed) {
    const { order, chosen } = s.armed;
    const r = E.tapArmed(s, id);
    if (commit(r, above(R.readout)) && !r.state.armed) afterOrder(order, [...chosen, id], s, r.state);
    return;
  }
  if (s.phase !== 'crisis') return;
  const pinned = s.crisis.pins.includes(id);
  const r = E.togglePin(s, id);
  if (commit(r, above(R.readout))) {
    buzz(pinned ? 4 : 8);
    // A brass pin into glass, a step brighter per pin; the tally tick is kept for the scoring.
    audio.play('pin', { intensity: pinned ? 0.1 : Math.min(1, 0.2 * r.state.crisis.pins.length) });
    // A blacked-out region still makes the shape but adds nothing: say so as it goes down.
    const t = E.twistInForce(s);
    if (!pinned && t?.kind === 'BLACKOUT' && s.world.colour[id] === t.colour) showToast('BLACKOUT: this region adds nothing.', above(R.readout));
  }
}

/** Effects of an Order that just applied: its thunk, the map's ink, and a line naming where it went. */
function afterOrder(order: E.OrderId, targets: RegionId[], before: RunState, after: RunState): void {
  if (after.tray.length >= before.tray.length && order !== 'AIRLIFT') return;
  audio.play('tally_slam', { intensity: 0.15 });
  buzz(12);
  const names = [...new Set(targets)].map((id) => REGION[id].name);
  if (names.length) showToast(`${ORDER[order].name} → ${names.join(order === 'CABLE' ? ' – ' : ', ')}`, above(R.readout));
  if (order === 'DEFECT') {
    const changed = Object.keys(after.world.colour).filter((id) => after.world.colour[id] !== before.world.colour[id]);
    if (changed.length) void getMap()?.fx.inkSpread(targets[0], changed);
  }
}

export async function sweepNow(): Promise<void> {
  const s = current();
  if (!s || isPlaying()) return;
  balloon.value = null;
  receiptOpen.value = null;
  const r = E.sweep(s);
  if (!r.ok) {
    showToast(r.reason, above(R.sweep));
    return;
  }
  // The lines about choosing have done their work once the lever is pulled.
  hintTap();
  if (s.firstNight && !prefs.value.playedFirstNight && (r.state.crisis.cleared || r.state.phase === 'missed')) {
    setPrefs({ playedFirstNight: true });
  }
  run.value = r.state;
  await playSweep(s, r.state);
}

export function swapNow(): void {
  const s = current();
  if (!s) return;
  balloon.value = null;
  if (commit(E.swap(s), above(R.swap))) {
    audio.play('slide', { intensity: 0.5 });
    buzz(10);
  }
}

// ---------------------------------------------------------------- Orders

export function armSlot(slot: number, at: Rect): void {
  const s = current();
  if (!s) return;
  if (commit(E.armOrder(s, slot), above(at))) audio.play('tick', { intensity: 0.3 });
}

export function confirmOrder(): void {
  const s = current();
  if (!s) return;
  const armed = s.armed;
  const r = E.confirmArmed(s);
  if (armed && commit(r, above(R.readout))) afterOrder(armed.order, armed.chosen, s, r.state);
}

export function cancelOrder(): void {
  const s = current();
  if (!s || !s.armed) return;
  commit(E.disarm(s));
  cableDrag.value = null;
}

/** Drop a dragged paper (or finish a LAY CABLE drag) with explicit targets. */
export function applyOrder(slot: number, targets: RegionId[]): boolean {
  const s = current();
  if (!s) return false;
  const order = s.tray[slot]?.id;
  const r = E.useOrder(s, slot, targets);
  if (order && commit(r, above(R.readout))) {
    afterOrder(order, targets, s, r.state);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------- the Briefing

/**
 * Where a Briefing refusal is said: one reserved spot on the map just above the tray, never over
 * the cards (the card tapped shakes its own price tag).
 */
export const BRIEFING_TOAST = above(R.tray);

/** Each returns false on a refusal, so the thing tapped can show it. */
export function buyOffer(slot: number): boolean {
  const s = current();
  if (!s) return false;
  if (!commit(E.buyOffer(s, slot), BRIEFING_TOAST)) return false;
  audio.play('capital', { intensity: 0.6 });
  buzz(12);
  return true;
}

export function openFolder(): boolean {
  const s = current();
  if (!s) return false;
  if (!commit(E.buyFolder(s), BRIEFING_TOAST)) return false;
  audio.play('offer', { intensity: 0.6 });
  return true;
}

export function pickCard(i: number): boolean {
  const s = current();
  if (!s) return false;
  if (!commit(E.pickFromFolder(s, i), BRIEFING_TOAST)) return false;
  audio.play('capital', { intensity: 0.6 });
  buzz(12);
  return true;
}

export function skipFolder(): void {
  const s = current();
  if (!s) return;
  commit(E.skipFolder(s), BRIEFING_TOAST);
}

export function rerollOffers(): boolean {
  const s = current();
  if (!s) return false;
  if (!commit(E.reroll(s), BRIEFING_TOAST)) return false;
  audio.play('offer', { intensity: 0.5 });
  return true;
}

/** The tray's slide away before a new crisis is shown (1x). */
const TRAY_LEAVE_MS = 220;
let leaving = 0;

function cancelLeaving(): void {
  clearTimeout(leaving);
  leaving = 0;
  trayLeaving.value = false;
}

/**
 * NEXT CRISIS: the run moves on at once, and the screen follows once the tray has slid away, so the
 * new crisis arrives whole: a blank board, an empty rule, and eight regions lighting one by one.
 */
export function nextCrisis(): void {
  const s = current();
  if (!s || leaving) return;
  const r = E.nextCrisis(s);
  if (!r.ok) {
    showToast(r.reason, BRIEFING_TOAST);
    return;
  }
  resetAnim();
  getMap()?.fx.reset();
  receiptOpen.value = null;
  run.value = r.state;
  const show = () => {
    leaving = 0;
    trayLeaving.value = false;
    // A tap on the table during the slide has already put the new crisis on show.
    if (run.value !== r.state || shown.value === r.state) return;
    shown.value = r.state;
    hintsAfter(s, r.state);
    audio.play('tally_slam', { intensity: 0.2 });
    droneFor(r.state);
  };
  if (reduced.value) {
    show();
    return;
  }
  trayLeaving.value = true;
  audio.play('slide', { intensity: 0.6 });
  leaving = window.setTimeout(show, TRAY_LEAVE_MS / speed.value);
}

export function keepGoing(): void {
  const s = current();
  if (!s) return;
  if (commit(E.keepGoing(s), above(R.endButton))) resetAnim();
}

export function sellSeat(seat: number): void {
  const s = current();
  if (!s) return;
  if (commit(E.sellStaff(s, seat), BRIEFING_TOAST)) {
    balloon.value = null;
    audio.play('capital', { intensity: 0.4 });
  }
}

export function sellTray(slot: number): void {
  const s = current();
  if (!s) return;
  if (commit(E.sellPaper(s, slot), above(slot === 0 ? R.tray0 : R.tray1))) {
    balloon.value = null;
    audio.play('capital', { intensity: 0.4 });
  }
}

export function moveSeat(from: number, to: number): void {
  const s = current();
  if (!s || from === to) return;
  if (commit(E.moveSeat(s, from, to), above(R.rail))) {
    audio.play('tick', { intensity: 0.2 });
    buzz(8);
  }
}
