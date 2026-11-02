/**
 * What the sheet draws, as one computed view: the playback's frame while a week resolves, else the
 * game on the desk (with the held place lifted and the picked-up counter), else the title's world.
 * The same object comes back while nothing on the sheet would change, so the map is not touched.
 */
import { computed } from '@preact/signals';
import { EMPTY_VIEW, sameView, viewFromState, type PaperView } from '../paper';
import { fallOrder, holdable, movesFor, weeksLeft, type GameState, type RegionId } from './engine';
import { explain, held, lifted, moveAsk, play, screen, shown, titleWorld } from './store';

/**
 * The explanation points at what it names (the second review: line 1 named hatching, red and ticks over a week-1
 * sheet with none): while line 1 is up, a ghost of hatching with three ticks lies on the place their first arrow
 * points at, and a ghost of the red wash on the place their second arrow points at. Line 2 lifts the inherited
 * promise. The ghosts go at NEXT; they are never part of the game.
 */
export function explainMarks(s: GameState, step: number | null): { ghost: PaperView['ghost']; pressed: RegionId | null } {
  if (step === 1) {
    const [a, b] = s.fed.headings;
    const pressed = a?.to;
    const fighting = b && b.to !== pressed ? b.to : undefined;
    return { ghost: pressed ? { pressed, ticks: 3, fighting } : null, pressed: null };
  }
  if (step === 2) return { ghost: null, pressed: s.promises.find((p) => p.inherited)?.region ?? s.promises[0]?.region ?? null };
  return { ghost: null, pressed: null };
}

/** The WORLD WAR ending's chain: the places fighting, in the order they fell (SPEC-SMALL "The map draws the chain"). */
export function chainOf(s: GameState): RegionId[] {
  if (s.phase !== 'ended' || s.ending?.kind !== 'war') return [];
  const order = (r: RegionId) => fallOrder(s.regions[r]) ?? Infinity;
  return Object.keys(s.regions)
    .filter((r) => s.regions[r].state === 'fighting')
    .sort((a, b) => order(a) - order(b));
}

let last: PaperView = EMPTY_VIEW;

export const mapView = computed<PaperView>(() => {
  const p = play.value;
  let next: PaperView;
  if (p) next = p.view;
  else {
    const s = screen.value === 'game' ? shown.value : titleWorld.value;
    // A lifted counter marks the places it can reach this week; the place a MOVE HERE slip asks about is lifted.
    const kind = screen.value === 'game' ? lifted.value : null;
    const reach = s && kind && s.phase === 'act' ? movesFor(s, kind) : [];
    const ex = s && screen.value === 'game' ? explainMarks(s, explain.value) : { ghost: null, pressed: null };
    next = s ? viewFromState(s, (r) => holdable(s, r).ok, { pressed: held.value ?? moveAsk.value?.region ?? ex.pressed, lifted: lifted.value, weeksLeft: (r) => weeksLeft(s, r), reach }) : EMPTY_VIEW;
    if (s && ex.ghost) next = { ...next, ghost: ex.ghost };
    if (s && screen.value === 'game') {
      const chain = chainOf(s);
      if (chain.length) next = { ...next, chain };
    }
  }
  if (sameView(last, next)) return last;
  last = next;
  return next;
});
