/**
 * What the sheet draws, as one computed view: the playback's frame while a week resolves, else the
 * game on the desk (with the held place lifted and the picked-up counter), else the title's world.
 * The same object comes back while nothing on the sheet would change, so the map is not touched.
 */
import { computed } from '@preact/signals';
import { EMPTY_VIEW, sameView, viewFromState, type PaperView } from '../paper';
import { holdable } from './engine';
import { held, lifted, play, screen, shown, titleWorld } from './store';

let last: PaperView = EMPTY_VIEW;

export const mapView = computed<PaperView>(() => {
  const p = play.value;
  let next: PaperView;
  if (p) next = p.view;
  else {
    const s = screen.value === 'game' ? shown.value : titleWorld.value;
    next = s ? viewFromState(s, (r) => holdable(s, r).ok, { pressed: held.value, lifted: lifted.value }) : EMPTY_VIEW;
  }
  if (sameView(last, next)) return last;
  last = next;
  return next;
});
