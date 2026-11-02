/**
 * A week's resolve as beats a watcher can follow: one tape line, one headline, one change on the
 * sheet. The engine writes the week's visible lines in the order things happened, cause before effect
 * (its pushes, the test, the answer, the falls, the way out, the ladder, the bars), and beside each line
 * its facts (WeekLog.beats: the headline kind, the place it names, and the ladder's step, the TREATY bar
 * and the WAR count right after it). The kind says what the beat changes on the map, so the pins drop
 * and the hatching scribbles in as the tape says why; the stamp and the bar are the engine's own numbers
 * beat by beat, and the WAR boxes are counted from the very sheet the beat draws (a test plays real games
 * through this and checks the two counts agree on every beat). A save from before the facts has none:
 * then each line is read back to its kind (words.ts matchHeadline), the step is counted along the way
 * (a line that says "· now MASSING" sets the stamp to that word) and the bar moves by each mover's own
 * amount (`barMove`). Either way the last beat settles on the engine's state. Pure: no DOM, no signals.
 */
import type { PaperView, PieceView, RegionState } from '../paper';
import type { GameState, HeadlineKind, LogBeat, RegionId, Step } from './engine';
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
  /** The ladder's words in order (TESTING first), to read a line's "· now {step}" back to a step. */
  steps?: readonly string[];
  /** How much a line of this kind moves the TREATY bar (its slots filled), or null when it does not. */
  barMove?: (kind: string, slots: Record<string, string>) => number | null;
}

/** The tape lines this resolve added: the week's visible lines beyond those the screen already had. */
export function newLines(before: GameState, after: GameState): string[] {
  const week = before.week;
  const had = before.log.find((w) => w.week === week)?.visible.length ?? 0;
  const log = after.log.find((w) => w.week === week);
  return log ? log.visible.slice(had) : [];
}

/** The engine's facts for those lines (WeekLog.beats), in step with them; null for a log written before the engine kept them. */
export function newFacts(before: GameState, after: GameState): LogBeat[] | null {
  const week = before.week;
  const had = before.log.find((w) => w.week === week)?.visible.length ?? 0;
  const log = after.log.find((w) => w.week === week);
  if (!log?.beats || log.beats.length !== log.visible.length) return null;
  return log.beats.slice(had);
}

/**
 * The rules' own lists, by the engine's headline kinds (a renamed kind fails the build here): the kinds that
 * move the ladder a step up or down when the line does not say "· now {step}" itself, SPEC-SMALL "The other
 * side": a real line crossed, a place taken that something of yours could have reached, a jumpy step, an
 * accident, a back-down; down for a way out or their summit accepted, and a back-down that eases a scared
 * Federation.
 */
export const STEP_UP: ReadonlySet<HeadlineKind> = new Set<HeadlineKind>(['lineCrossed', 'takenStepUp', 'jumpy', 'accident', 'backedDown']);
export const STEP_DOWN: ReadonlySet<HeadlineKind> = new Set<HeadlineKind>(['wayOutAccepted', 'summitAccepted', 'backedDownEased']);
/** Kinds that may move the ladder down (a backed promise that was not a feint). */
const STEP_MAYBE_DOWN: ReadonlySet<HeadlineKind> = new Set<HeadlineKind>(['backed', 'backedFar']);
/**
 * The TREATY bar's movers (SPEC-SMALL "The two bars": a quiet week, a bloc signing, a way out or their summit
 * accepted, a place taken, their summit refused in public), and the signing itself, on which whatever the movers
 * do not account for lands. A way out of yours they refuse, and the trawler, never move it.
 */
export const BAR: ReadonlySet<HeadlineKind> = new Set<HeadlineKind>(['gainedWeek', 'quietWeek', 'blocSigned', 'wayOutAccepted', 'summitAccepted', 'summitRefused', 'treatySigned']);
/** Kinds after which the promises and the pieces are the engine's (a way out or a pull-back moved them). */
const REDRAW: ReadonlySet<HeadlineKind> = new Set<HeadlineKind>(['wayOutAccepted', 'bluffPulled', 'unpromisedHeld', 'summitAccepted', 'unpromisedFailed']);
/** Kinds after which a place is fighting on the sheet. */
const FALLS: ReadonlySet<HeadlineKind> = new Set<HeadlineKind>(['fell', 'fellOutOfReach', 'waitedFell', 'spread']);

/** The bar's numbers, as the engine's RULES has them. */
export type BarRules = { readonly willQuiet: number; readonly willBloc: number; readonly willWayOut: number; readonly willPerGain: number; readonly willHumiliated: number };

/**
 * How much a tape line of this kind moves the TREATY bar, by the rules' own numbers: +willQuiet, +willBloc,
 * +willWayOut (a way out or their summit accepted), −willPerGain for each place taken ("They took two places this
 * week": the number word, or a digit, from the pack's numbers), −willHumiliated for their summit refused. Null for
 * a line that does not move it.
 */
export function barMover(R: BarRules, numbers: readonly string[]): (kind: string, slots: Record<string, string>) => number | null {
  return (kind, slots) => {
    switch (kind as HeadlineKind) {
      case 'quietWeek':
        return R.willQuiet;
      case 'blocSigned':
        return R.willBloc;
      case 'wayOutAccepted':
      case 'summitAccepted':
        return R.willWayOut;
      case 'summitRefused':
        return -R.willHumiliated;
      case 'gainedWeek': {
        const first = (slots.n ?? '').trim().split(/\s+/)[0] ?? '';
        const idx = numbers.indexOf(first);
        const n = idx >= 0 ? idx : parseInt(first, 10);
        return -R.willPerGain * (Number.isFinite(n) && n > 0 ? n : 1);
      }
      default:
        return null;
    }
  };
}

const clampStep = (n: number): Step => (n < 1 ? 1 : n > 5 ? 5 : n) as Step;
const clamp100 = (n: number): number => (n < 0 ? 0 : n > 100 ? 100 : n);

function cloneView(v: PaperView): PaperView {
  return {
    states: { ...v.states },
    promises: v.promises.map((p) => ({ ...p })),
    headings: v.headings.map((h) => ({ ...h })),
    pieces: v.pieces.map((p) => ({ ...p })),
    tested: v.tested,
    pressed: null,
    lifted: null,
    clocks: { ...(v.clocks ?? {}) },
  };
}

/** The places fighting on a sheet: the WAR boxes a beat shows are counted from the very sheet it draws, so the two never disagree. */
export function countFighting(v: PaperView): number {
  return Object.values(v.states).filter((s) => s === 'fighting').length;
}

/** A pressed place keeps the clock it had (or the one it ends the week with, when it was pressed this week); any other place has none. */
function clocksFor(v: PaperView, start: PaperView, end: PaperView): Record<RegionId, number> {
  const out: Record<RegionId, number> = {};
  for (const [id, st] of Object.entries(v.states)) {
    if (st !== 'pressed') continue;
    const n = start.clocks?.[id] ?? end.clocks?.[id];
    if (n !== undefined) out[id] = n;
  }
  return out;
}

/** The beats of one resolve (SEND ORDERS, or the phone's answer), last beat settled on the after state. */
export function weekBeats(input: BeatInput): Beat[] {
  const { before, after, headlines, idOf, holdable, startView, endView, steps, barMove } = input;
  const lines = newLines(before, after);
  // The engine's own facts when it kept them: the kind, the place, the step and the bar beside each line.
  const facts = newFacts(before, after);
  const isRegion = (name: string) => idOf(name) !== null;
  const matched = lines.map((text, i) => {
    const m = matchHeadline(headlines, text, isRegion);
    const f = facts?.[i];
    return { text, m: f ? { kind: f.kind, slots: m?.slots ?? {} } : m, fact: f ?? null };
  });
  /** A line that names the step it reached ("· now MASSING") says where the ladder is after it. */
  const saidStep = (m: { slots: Record<string, string> } | null): Step | null => {
    if (!m || !steps || !m.slots.step) return null;
    const i = steps.indexOf(m.slots.step);
    return i >= 0 ? clampStep(i + 1) : null;
  };

  // The ladder: the certain moves, then whatever is left attributed to a backed promise (or the last beat).
  let certain = before.fed.step as number;
  for (const { m } of matched) {
    if (!m) continue;
    const said = saidStep(m);
    if (said !== null) certain = said;
    else if (STEP_UP.has(m.kind as HeadlineKind)) certain++;
    else if (STEP_DOWN.has(m.kind as HeadlineKind)) certain--;
  }
  let leftover = after.fed.step - clampStep(certain);
  const maybeAt = matched.findIndex(({ m }) => m && STEP_MAYBE_DOWN.has(m.kind as HeadlineKind));

  // The bar: each mover's own amount at its line; what they do not add up to lands on the last mover.
  const moves = matched.map(({ m }) => (m && BAR.has(m.kind as HeadlineKind) ? barMove?.(m.kind, m.slots) ?? null : null));
  const lastBar = matched.reduce((at, { m }, i) => (m && BAR.has(m.kind as HeadlineKind) ? i : at), -1);
  const accounted = moves.reduce<number>((sum, d) => sum + (d ?? 0), 0);
  const unaccounted = after.treaty - before.treaty - accounted;

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

  matched.forEach(({ text, m, fact }, i) => {
    view = cloneView(view);
    const kind = m?.kind ?? null;
    const region = fact ? fact.region : m?.slots.region ? idOf(m.slots.region) : null;
    switch (kind) {
      case 'pushed':
        if (region && view.states[region] !== 'fighting') set(region, 'pressed');
        break;
      case 'tested':
        if (region) view.tested = region;
        break;
      case 'fell':
      case 'fellOutOfReach':
      case 'waitedFell':
      case 'spread':
        if (region) {
          set(region, 'fighting');
          dropPromise(region);
        }
        break;
      case 'backedDown':
      case 'backedDownEased':
      case 'backFailed':
        // The ring goes and the place is pressed; the "has fallen" line, when it comes, does the wash.
        if (region) {
          dropPromise(region);
          if (view.states[region] !== 'fighting') set(region, afterState(region) === 'calm' ? 'calm' : 'pressed');
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
    if (kind && REDRAW.has(kind as HeadlineKind)) {
      view.promises = endView.promises.map((p) => ({ ...p }));
      view.pieces = endView.pieces.map((p) => ({ ...p }));
      if (view.tested && !view.promises.some((p) => p.region === view.tested)) view.tested = null;
    } else if (kind && (FALLS.has(kind as HeadlineKind) || kind === 'backedDown' || kind === 'backedDownEased' || kind === 'backFailed')) resolid();
    view.clocks = clocksFor(view, startView, endView);

    if (fact) {
      // The engine's numbers right after this line: the stamp and the bar move exactly where the rules moved them.
      step = fact.step;
      treaty = fact.treaty;
    } else {
      const said = saidStep(m);
      if (said !== null) step = said;
      else if (kind && STEP_UP.has(kind as HeadlineKind)) step++;
      else if (kind && STEP_DOWN.has(kind as HeadlineKind)) step--;
      if (i === maybeAt && leftover) {
        step += leftover;
        leftover = 0;
      }
      if (kind && BAR.has(kind as HeadlineKind)) {
        // With no amounts to go by, the whole reading lands on the first mover, as before.
        if (!barMove) treaty = after.treaty;
        else treaty = clamp100(treaty + (moves[i] ?? 0) + (i === lastBar ? unaccounted : 0));
      }
    }

    const last = i === matched.length - 1;
    if (last) {
      view = cloneView(endView);
      step = after.fed.step;
      treaty = after.treaty;
    }
    out.push({ text, kind, view, step: clampStep(step), war: countFighting(view), treaty });
  });

  if (!out.length) out.push({ text: '', kind: null, view: cloneView(endView), step: after.fed.step, war: countFighting(endView), treaty: after.treaty });
  return out;
}
