/**
 * The phone's back button (and the browser's back, and the edge swipe), SPEC section 11. While a
 * game is on the table, or a sheet is open, the war room keeps one history entry of its own, so
 * back never drops a game on the floor: it closes what is open (a sheet, a balloon) and otherwise
 * opens the menu, from which QUIT TO TITLE goes home. During the intro it skips the intro. On the
 * bare title back leaves as usual (the native shell exits). The shop and the end card are inside
 * the game: back opens the menu over them.
 *
 * The war room never navigates the history itself: it only ever pushes its one entry. When nothing
 * of ours is open any more the entry is released, not popped (a history.back() of our own would race
 * the next push, and a lost race sent the browser off the site). A released entry is taken up again
 * the next time it is wanted, so the history never holds more than one entry of ours, and a back
 * press on the bare title lands on the page's own entry and does nothing.
 */
import { effect } from '@preact/signals';
import { skipIntro } from './actions';
import { introRunning } from './intro';
import { director } from './playback';
import { balloon, busy, screen, sheet } from './store';

/** What back does now. 'leave' means nothing of ours is open. */
export type BackStep = 'close-sheet' | 'skip-intro' | 'skip-and-menu' | 'close-balloon' | 'menu' | 'leave';

/** The step back takes from the current screen (pure, for tests). */
export function backStep(o: { screen: 'title' | 'game'; sheetOpen: boolean; intro: boolean; balloonOpen: boolean; busy: boolean }): BackStep {
  if (o.sheetOpen) return 'close-sheet';
  if (o.screen !== 'game') return 'leave';
  if (o.intro) return 'skip-intro';
  if (o.busy) return 'skip-and-menu';
  if (o.balloonOpen) return 'close-balloon';
  return 'menu';
}

/**
 * What the guard does when the screen changes (pure, for tests): 'push' a new entry of ours,
 * 'adopt' the entry of ours already on top (released earlier, never popped), 'release' it (nothing
 * of ours is open: no navigation), or nothing.
 */
export function guardStep(o: { want: boolean; guarded: boolean; onOurEntry: boolean }): 'push' | 'adopt' | 'release' | null {
  if (o.want && !o.guarded) return o.onOurEntry ? 'adopt' : 'push';
  if (!o.want && o.guarded) return 'release';
  return null;
}

/** Our entry is on top of the history and back is ours to handle. */
let guarded = false;

function wanted(): boolean {
  return screen.value === 'game' || sheet.value !== null;
}

function onOurEntry(): boolean {
  try {
    return (history.state as { war?: string } | null)?.war === 'game';
  } catch {
    return false;
  }
}

function guard(): void {
  switch (guardStep({ want: wanted(), guarded, onOurEntry: onOurEntry() })) {
    case 'push':
      try {
        history.pushState({ war: 'game' }, '');
        guarded = true;
      } catch {
        /* a sandboxed frame without history: back behaves as the host decides */
      }
      break;
    case 'adopt':
      guarded = true;
      break;
    case 'release':
      guarded = false;
      break;
  }
}

function onPop(): void {
  // Back (or forward) moved off our entry while it was released: the title, nothing to do.
  if (!guarded) return;
  // Forward onto an entry of ours, or a stray event that left us where we were: nothing was popped.
  if (onOurEntry()) return;
  guarded = false;
  const step = backStep({
    screen: screen.value,
    sheetOpen: sheet.value !== null,
    intro: introRunning(),
    balloonOpen: balloon.value !== null,
    busy: busy.value,
  });
  switch (step) {
    case 'close-sheet':
      sheet.value = null;
      break;
    case 'skip-intro':
      skipIntro();
      break;
    case 'skip-and-menu':
      director().skip();
      sheet.value = 'menu';
      break;
    case 'close-balloon':
      balloon.value = null;
      break;
    case 'menu':
      sheet.value = 'menu';
      break;
    case 'leave':
      return;
  }
  guard();
}

/** Keeps the war room's history entry in step with the screen; returns the uninstaller. */
export function installBackButton(): () => void {
  window.addEventListener('popstate', onPop);
  const stop = effect(() => guard());
  return () => {
    window.removeEventListener('popstate', onPop);
    stop();
  };
}
