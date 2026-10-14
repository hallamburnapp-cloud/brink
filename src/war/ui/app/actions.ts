/**
 * Everything the player can do, as one function each. Taps, drags and the dev hook all come
 * through here, so they share one code path. Each calls the engine, stores the new run, and on a
 * refusal shows the engine's reason as a short toast.
 */
import { audio } from '../../../audio';
import * as E from '../../engine';
import type { RegionId, Result, RunState } from '../../engine';
import { centre, R, type Rect } from '../common/layout';
import { droneFor, isPlaying, playSweep, skip } from '../director/play';
import { resetAnim } from '../fx/anim';
import { buzz } from '../fx/shake';
import { getMap } from '../table/mapRef';
import { hintsAfter, hintsStart, hintsStop } from './hints';
import { balloon, busy, cableDrag, highlight, prefs, run, screen, setPrefs, sheet, showToast, shown } from './store';

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
  skip();
  resetAnim();
  getMap()?.fx.reset();
  balloon.value = null;
  highlight.value = null;
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

export function quitToTitle(): void {
  skip();
  hintsStop();
  resetAnim();
  audio.drone(false);
  balloon.value = null;
  sheet.value = null;
  highlight.value = null;
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
    if (commit(r, above(R.readout)) && !r.state.armed) afterOrder(order, chosen[0] ?? id, s, r.state);
    return;
  }
  if (s.phase !== 'crisis') return;
  const pinned = s.crisis.pins.includes(id);
  const r = E.togglePin(s, id);
  if (commit(r, above(R.readout))) {
    buzz(pinned ? 4 : 8);
    audio.play('tally_tick', { intensity: pinned ? 0.05 : 0.15 + 0.08 * r.state.crisis.pins.length });
  }
}

/** Effects of an Order that just applied (the map draws the result; DEFECT gets its ink). */
function afterOrder(order: E.OrderId, source: RegionId, before: RunState, after: RunState): void {
  if (after.tray.length >= before.tray.length && order !== 'AIRLIFT') return;
  audio.play('tally_slam', { intensity: 0.15 });
  buzz(12);
  if (order === 'DEFECT') {
    const changed = Object.keys(after.world.colour).filter((id) => after.world.colour[id] !== before.world.colour[id]);
    if (changed.length) void getMap()?.fx.inkSpread(source, changed);
  }
}

export async function sweepNow(): Promise<void> {
  const s = current();
  if (!s || isPlaying()) return;
  balloon.value = null;
  const r = E.sweep(s);
  if (!r.ok) {
    showToast(r.reason, above(R.sweep));
    return;
  }
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
  if (armed && commit(r, above(R.readout))) afterOrder(armed.order, armed.chosen[0], s, r.state);
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
    afterOrder(order, targets[0], s, r.state);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------- the Briefing

export function buyOffer(slot: number, at: Rect): void {
  const s = current();
  if (!s) return;
  if (commit(E.buyOffer(s, slot), above(at))) {
    audio.play('capital', { intensity: 0.6 });
    buzz(12);
  }
}

export function openFolder(): void {
  const s = current();
  if (!s) return;
  if (commit(E.buyFolder(s), above(R.folder))) audio.play('offer', { intensity: 0.6 });
}

export function pickCard(i: number, at: Rect): void {
  const s = current();
  if (!s) return;
  if (commit(E.pickFromFolder(s, i), above(at))) {
    audio.play('capital', { intensity: 0.6 });
    buzz(12);
  }
}

export function skipFolder(): void {
  const s = current();
  if (!s) return;
  commit(E.skipFolder(s), above(R.folder));
}

export function rerollOffers(): void {
  const s = current();
  if (!s) return;
  if (commit(E.reroll(s), above(R.reroll))) audio.play('offer', { intensity: 0.5 });
}

export function nextCrisis(): void {
  const s = current();
  if (!s) return;
  if (commit(E.nextCrisis(s), above(R.next))) {
    resetAnim();
    getMap()?.fx.reset();
    audio.play('tally_slam', { intensity: 0.2 });
    droneFor(run.value);
  }
}

export function keepGoing(): void {
  const s = current();
  if (!s) return;
  if (commit(E.keepGoing(s), above(R.endButton))) resetAnim();
}

export function sellSeat(seat: number): void {
  const s = current();
  if (!s) return;
  if (commit(E.sellStaff(s, seat), above(R.rail))) {
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
