/**
 * Teaching (spec 11, rewritten after the play-tests). No line ever covers the goal: lines about
 * the map and the staff are typed on a paper tape pinned under the rail, along the map's top edge;
 * lines about a control sit in a balloon on that control; the Briefing's lines lie on its tray.
 * The first night teaches in single lines with the regions a line is about lit up; later runs get
 * one-time lines, remembered in local settings. Each line shows for 3.5 s or until the next tap.
 */
import { signal } from '@preact/signals';
import { boardOf, formatShort, litHasJoin, preview, type RegionId, type RunState } from '../../engine';
import { STAFF_DEF, type StaffId } from '../../content/staff';
import { whenTableShown } from './curtain';
import { prefs, run, setPrefs, spotlight } from './store';

/** Where a coach line lies: the tape along the map's top edge, or the Briefing tray's lip. */
export type CoachSpot = 'map' | 'tray';
export interface CoachLine {
  /** One line; *starred* words are typed in stamp ink. */
  text: string;
  at: CoachSpot;
  n: number;
  /** Tap-proof until this time (performance.now()), so the tap that caused it doesn't end it. */
  holdUntil: number;
}
export const coach = signal<CoachLine | null>(null);

/** A balloon over a control. */
export type HintSpot = 'swap' | 'tray' | 'sweep' | 'lamp';
export const controlHint = signal<{ text: string; at: HintSpot; n: number; holdUntil: number } | null>(null);
/** The first night's finger pulse. */
export const finger = signal<RegionId | null>(null);

const LINE_MS = 3500;
let n = 0;
let coachTimer = 0;
let controlTimer = 0;
/** Runs when the coach line on show ends (its time is up or a tap ends it), unless replaced. */
let afterCoach: (() => void) | null = null;
/** First-night lines already shown in this run. */
let seen = new Set<string>();
/** Counts runs started, so a late opening line never lands on the next run. */
let starts = 0;

function showCoach(text: string, at: CoachSpot = 'map', ms = LINE_MS, holdMs = 250, then: (() => void) | null = null): void {
  n++;
  coach.value = { text, at, n, holdUntil: performance.now() + holdMs };
  afterCoach = then;
  clearTimeout(coachTimer);
  const mine = n;
  coachTimer = window.setTimeout(() => endCoach(mine), ms);
}

function endCoach(which: number): void {
  if (coach.value?.n !== which) return;
  coach.value = null;
  const then = afterCoach;
  afterCoach = null;
  then?.();
}

function showControlHint(text: string, at: HintSpot, ms = LINE_MS + 1000): void {
  n++;
  controlHint.value = { text, at, n, holdUntil: performance.now() + 250 };
  clearTimeout(controlTimer);
  const mine = n;
  controlTimer = window.setTimeout(() => {
    if (controlHint.value?.n === mine) controlHint.value = null;
  }, ms);
}

/** Any tap ends the lines on show (after a short grace, so the tap that caused one doesn't). */
export function hintTap(): void {
  const now = performance.now();
  const c = coach.value;
  if (c && now > c.holdUntil) endCoach(c.n);
  const h = controlHint.value;
  if (h && now > h.holdUntil) controlHint.value = null;
  spotlight.value = null;
}

function once(key: string): boolean {
  if (prefs.value.hints.includes(key)) return false;
  setPrefs({ hints: [...prefs.value.hints, key] });
  return true;
}

function firstNightOnce(key: string): boolean {
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

/**
 * The pins and the lit regions a further pin would join to them: what the first night lights up
 * while it teaches joins. Null when there is nothing to add (no pins, five pins, nothing joins).
 */
export function joinSpotlight(s: RunState): RegionId[] | null {
  const pins = s.crisis.pins;
  if (pins.length === 0 || pins.length >= 5) return null;
  const board = boardOf(s);
  const joinable = s.crisis.lit.filter((r) => !pins.includes(r) && pins.some((p) => board.joined(p, r)));
  return joinable.length ? [...pins, ...joinable] : null;
}

/** A staff whose rule multiplies Momentum: seat order starts to matter once one is seated. */
function multiplies(id: StaffId): boolean {
  return /x[\d.]+ Momentum/.test(STAFF_DEF[id].rule);
}

/** The opening line: the goal, the limit and what a miss means, in the crisis's own numbers. */
export function goalLine(s: RunState): string {
  return `Reach *${formatShort(s.crisis.target, 7)}* in *${s.crisis.sweepsLeft} sweeps*, or the world tips.`;
}

/** A run has started: reset, and on the first night open with the scripted lines. */
export function hintsStart(s: RunState): void {
  seen = new Set();
  clearTimeout(coachTimer);
  clearTimeout(controlTimer);
  afterCoach = null;
  coach.value = null;
  controlHint.value = null;
  finger.value = null;
  spotlight.value = null;
  if (!s.firstNight || s.phase !== 'crisis' || s.crisis.sweeps.length > 0) {
    hintsAfter(null, s);
    return;
  }
  const mine = ++starts;
  // The opening line waits until the title has lifted off the table.
  void whenTableShown().then(() => {
    if (mine !== starts || !run.value?.firstNight) return;
    showCoach(goalLine(s), 'map', 4000, 1200, () => {
      // The player may already have pinned during the opening line.
      const now = run.value;
      if (mine !== starts || !now?.firstNight || now.crisis.pins.length || now.crisis.sweeps.length) return;
      seen.add('tap');
      showCoach('Tap a lit region. *The red ring scores twice.*', 'map', 5000);
      finger.value = s.crisis.flashpoint;
    });
  });
}

/** The run moved on (a tap, a buy, a sweep, a new crisis): show whatever line this moment earns. */
export function hintsAfter(prev: RunState | null, next: RunState): void {
  if (next.firstNight) firstNightLines(prev, next);
  laterLines(prev, next);
}

function firstNightLines(prev: RunState | null, s: RunState): void {
  if (s.phase !== 'crisis' || s.log.length > 0) return;
  const c = s.crisis;
  if (c.pins.length > 0) finger.value = null;
  // After a sweep the board carries the count ('3 SWEEPS LEFT'); DESIGN 0:17 leaves the next deal to the player.
  if (prev && c.sweeps.length > prev.crisis.sweeps.length) return;
  const p = preview(s);
  if (p.clears && !(prev && preview(prev).clears) && firstNightOnce('lamp')) {
    showControlHint('Green lamp: this sweep clears the crisis.', 'lamp');
    return;
  }
  // The first deal teaches joins, pin by pin.
  const added = c.pins.length > (prev?.crisis.pins.length ?? 0);
  if (!added || c.sweeps.length > 0) return;
  if (p.biggestGroup >= 3) {
    if (firstNightOnce('sweep')) {
      spotlight.value = null;
      showControlHint('Sweep.', 'sweep');
    }
    return;
  }
  if (p.biggestGroup === 2 && firstNightOnce('shapes')) {
    showCoach('Joined pins make shapes. *Bigger shapes multiply.*');
    spotlight.value = joinSpotlight(s);
    return;
  }
  if (c.pins.length === 1 && firstNightOnce('join')) {
    showCoach('Pin a neighbour to join it: by border, bridge or sea lane.');
    spotlight.value = joinSpotlight(s);
  }
}

function laterLines(prev: RunState | null, s: RunState): void {
  const c = s.crisis;
  const sameCrisis = !!prev && prev.phase === 'crisis' && s.phase === 'crisis' && prev.crisis.hour === c.hour && prev.crisis.index === c.index;
  const freshDeal = !sameCrisis || prev.crisis.lit.join() !== c.lit.join();
  if (s.phase === 'crisis' && freshDeal && c.pins.length === 0) {
    // A fresh deal (a new crisis, a refill after a sweep or swap).
    if (!litHasJoin(s) && !(s.firstNight && s.log.length === 0) && once('nojoin')) {
      showControlHint('Nothing joins? Pin regions, then SWAP them out.', 'swap');
    }
  }
  if (sameCrisis && c.swapsLeft < prev.crisis.swapsLeft && once('swap')) {
    showCoach('Swapped regions are spent for this crisis. New ones light.');
  }
  if (prev && s.phase === 'crisis' && prev.phase === 'briefing' && c.hour === 0 && c.index === 2) {
    if (s.hour.twist.kind === 'GRIDLOCK' && once('gridlock')) showCoach('*SUMMIT: GRIDLOCK.* Sea lanes are cut for this crisis.', 'map', 4500, 800);
  }
  if (prev && prev.phase === 'briefing' && s.tray.length > prev.tray.length && once('order')) {
    showControlHint('Drag it onto the map.', 'tray');
  }
  if (prev && s.staff.length > prev.staff.length && s.staff.length >= 2 && s.staff.some((st) => multiplies(st.id)) && once('seats')) {
    showCoach('Seats fire *1 to 5*. Hold one and drag to reorder.', 'map', 5000, 600);
  }
  // In the Briefing (a reroll, a buy) when no other line is on show; the tray's rise is hintsBriefing.
  if (prev?.phase === 'briefing' && !coach.value) playbookLine(s);
}

/** The first Playbook on offer gets one line, on the tray beside it. */
function playbookLine(s: RunState): void {
  if (s.phase === 'briefing' && s.shop?.offers.some((o) => o?.kind === 'playbook') && once('playbook')) {
    showCoach('Playbooks level a pattern up for the rest of the night.', 'tray', 4500, 600);
  }
}

/** The Briefing tray has risen. */
export function hintsBriefing(s: RunState): void {
  if (s.firstNight && s.shop?.briefing === 1 && firstNightOnce('hire')) {
    showCoach('Hire staff: they fire every sweep. *Hold a card* to see where.', 'tray', 5000, 600);
    return;
  }
  playbookLine(s);
}

export function hintsStop(): void {
  starts++;
  clearTimeout(coachTimer);
  clearTimeout(controlTimer);
  afterCoach = null;
  coach.value = null;
  controlHint.value = null;
  finger.value = null;
  spotlight.value = null;
}
