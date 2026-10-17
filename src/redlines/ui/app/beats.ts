/**
 * A week's resolve as beats a watcher can follow: one tape line, one headline, one change on the
 * sheet. The engine writes the week's visible lines in the order things happened (its pushes, the
 * test, the answer, the falls, the way out, the ladder, the bars); each line is read back to its
 * headline kind (words.ts matchHeadline) and that kind says what the beat changes on the map, so
 * the pins drop and the hatching scribbles in as the tape says why. The step is counted along the
 * way (the stamp slams when its word changes) and snapped to the engine's at the end, as are the
 * bars and the whole view. Pure: no DOM, no signals.
 */
import type { PaperView, PieceView, RegionState } from '../paper';
import type { GameState, RegionId, Step } from './engine';
import { matchHeadline } from './words';

export interface Beat {
  /** The tape line and the note. */
  text: string;
  /** The headline kind the line was read as, or null. */
  kind: string | null;
  view: PaperView;
  step: Step;
  war: number;
  treaty: number;
}

export interface BeatInput {
  before: GameState;
  after: GameState;
  /** strings.headlines */
  headlines: Record<string, string>;
  /** A place's printed name → its id. */
  idOf: (name: string) => RegionId | null;
  /** Whether a promise at `region` could be held with these pieces. */
  holdable: (pieces: readonly PieceView[], region: RegionId) => boolean;
  /** The before state as a view (what the sheet shows as the week resolves). */
  startView: PaperView;
  /** The after state as a view (the last beat settles on it). */
  endView: PaperView;
}

/** The tape lines this resolve added: the week's visible lines beyond those the screen already had. */
export function newLines(before: GameState, after: GameState): string[] {
  const week = before.week;
  const had = before.log.find((w) => w.week === week)?.visible.length ?? 0;
  const log = after.log.find((w) => w.week === week);
  return log ? log.visible.slice(had) : [];
}

/** Kinds that certainly move the ladder: up or down one step. */
const STEP_UP = new Set(['lineCrossed', 'takenStepUp', 'jumpy', 'accident', 'backedDown']);
const STEP_DOWN = new Set(['wayOutAccepted', 'summitAccepted']);
/** Kinds that may move the ladder down (a backed promise that was not a feint). */
const STEP_MAYBE_DOWN = new Set(['backed', 'backedFar']);
/** Kinds after which the TREATY bar shows the week's reading. */
const BAR = new Set(['gainedWeek', 'quietWeek', 'blocSigned', 'wayOutAccepted', 'wayOutRefused', 'summitAccepted', 'summitRefused', 'trawlerBacked', 'trawlerDisowned', 'treatySigned']);
/** Kinds after which the promises and the pieces are the engine's (a way out or a pull-back moved them). */
const REDRAW = new Set(['wayOutAccepted', 'bluffPulled', 'unpromisedHeld', 'summitAccepted', 'unpromisedFailed']);

const clampStep = (n: number): Step => (n < 1 ? 1 : n > 5 ? 5 : n) as Step;

function cloneView(v: PaperView): PaperView {
  return { states: { ...v.states }, promises: v.promises.map((p) => ({ ...p })), headings: v.headings.map((h) => ({ ...h })), pieces: v.pieces.map((p) => ({ ...p })), tested: v.tested, pressed: null, lifted: null };
}

function countFighting(v: PaperView): number {
  return Object.values(v.states).filter((s) => s === 'fighting').length;
}

/** The beats of one resolve (SEND ORDERS, or the phone's answer), last beat settled on the after state. */
export function weekBeats(input: BeatInput): Beat[] {
  const { before, after, headlines, idOf, holdable, startView, endView } = input;
  const lines = newLines(before, after);
  const isRegion = (name: string) => idOf(name) !== null;
  const matched = lines.map((text) => ({ text, m: matchHeadline(headlines, text, isRegion) }));

  // The ladder: the certain moves, then whatever is left attributed to a backed promise (or the last beat).
  let certain = before.fed.step as number;
  for (const { m } of matched) {
    if (!m) continue;
    if (STEP_UP.has(m.kind)) certain++;
    else if (STEP_DOWN.has(m.kind)) certain--;
  }
  let leftover = after.fed.step - clampStep(certain);
  const maybeAt = matched.findIndex(({ m }) => m && STEP_MAYBE_DOWN.has(m.kind));

  let view = cloneView(startView);
  let step: number = before.fed.step;
  let treaty = before.treaty;
  const out: Beat[] = [];

  const set = (id: RegionId, state: RegionState) => {
    if (state === 'calm') delete view.states[id];
    else view.states[id] = state;
  };
  const dropPromise = (id: RegionId) => {
    view.promises = view.promises.filter((p) => p.region !== id);
    if (view.tested === id) view.tested = null;
  };
  const afterState = (id: RegionId): RegionState => after.regions[id]?.state ?? 'calm';
  const resolid = () => {
    view.promises = view.promises.map((p) => ({ region: p.region, solid: holdable(view.pieces, p.region) }));
  };

  matched.forEach(({ text, m }, i) => {
    view = cloneView(view);
    const kind = m?.kind ?? null;
    const region = m?.slots.region ? idOf(m.slots.region) : null;
    switch (kind) {
      case 'pushed':
        if (region && view.states[region] !== 'fighting') set(region, 'pressed');
        break;
      case 'tested':
        if (region) view.tested = region;
        break;
      case 'fell':
      case 'waitedFell':
      case 'spread':
        if (region) {
          set(region, 'fighting');
          dropPromise(region);
        }
        break;
      case 'backedDown':
      case 'backFailed':
        if (region) {
          dropPromise(region);
          set(region, afterState(region));
        }
        break;
      case 'backed':
      case 'backedFar':
        if (region) {
          view.tested = null;
          set(region, afterState(region));
        }
        break;
      case 'waited':
        if (region) {
          if (view.states[region] !== 'fighting') set(region, 'pressed');
          view.tested = after.pendingTest ?? view.tested;
        }
        break;
      case 'recovered':
        if (region) set(region, 'pressed');
        break;
      case 'calmed':
        if (region) set(region, 'calm');
        break;
      default:
        break;
    }
    if (kind && REDRAW.has(kind)) {
      view.promises = endView.promises.map((p) => ({ ...p }));
      view.pieces = endView.pieces.map((p) => ({ ...p }));
      if (view.tested && !view.promises.some((p) => p.region === view.tested)) view.tested = null;
    } else if (kind === 'fell' || kind === 'waitedFell' || kind === 'spread' || kind === 'backedDown' || kind === 'backFailed') resolid();

    if (kind && STEP_UP.has(kind)) step++;
    else if (kind && STEP_DOWN.has(kind)) step--;
    if (i === maybeAt && leftover) {
      step += leftover;
      leftover = 0;
    }
    if (kind && BAR.has(kind)) treaty = after.treaty;

    const last = i === matched.length - 1;
    if (last) {
      view = cloneView(endView);
      step = after.fed.step;
      treaty = after.treaty;
    }
    out.push({ text, kind, view, step: clampStep(step), war: last ? after.war : countFighting(view), treaty });
  });

  if (!out.length) out.push({ text: '', kind: null, view: cloneView(endView), step: after.fed.step, war: after.war, treaty: after.treaty });
  return out;
}
