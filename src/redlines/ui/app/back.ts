/** What the back button does, and how the history entry is kept: pure, so they have tests. */

/** What back does now. 'leave' means nothing of ours is open. */
export type BackStep = 'close-sheet' | 'skip-explain' | 'cancel-act' | 'skip-playback' | 'menu' | 'leave';

/** The step back takes from the current screen. The phone cannot be backed out of: it opens the menu. */
export function backStep(o: { screen: 'title' | 'game'; sheetOpen: boolean; explaining: boolean; acting: boolean; playing: boolean }): BackStep {
  if (o.sheetOpen) return 'close-sheet';
  if (o.screen !== 'game') return 'leave';
  if (o.explaining) return 'skip-explain';
  if (o.playing) return 'skip-playback';
  if (o.acting) return 'cancel-act';
  return 'menu';
}

/**
 * What the guard does when the screen changes: 'push' a new entry of ours, 'adopt' the entry of
 * ours already on top (released earlier, never popped), 'release' it, or nothing.
 */
export function guardStep(o: { want: boolean; guarded: boolean; onOurEntry: boolean }): 'push' | 'adopt' | 'release' | null {
  if (o.want && !o.guarded) return o.onOurEntry ? 'adopt' : 'push';
  if (!o.want && o.guarded) return 'release';
  return null;
}
