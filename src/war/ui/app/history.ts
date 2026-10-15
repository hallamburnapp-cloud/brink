/**
 * The phone's back button (and the browser's back, and the edge swipe), SPEC section 11. While a
 * game is on the table, or a sheet is open, the war room keeps one history entry of its own, so
 * back never drops a game on the floor: it closes what is open (a sheet, a balloon) and otherwise
 * opens the menu, from which QUIT TO TITLE goes home. During the intro it skips the intro. On the
 * bare title back leaves as usual (the native shell exits). The shop and the end card are inside
 * the game: back opens the menu over them.
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

/** Our entry is on top of the history. */
let guarded = false;
/** A history.back() of our own is on its way: its popstate is not the player's. */
let ownBack = false;

function wanted(): boolean {
  return screen.value === 'game' || sheet.value !== null;
}

function push(): void {
  try {
    history.pushState({ war: 'game' }, '');
    guarded = true;
  } catch {
    /* a sandboxed frame without history: back behaves as the host decides */
  }
}

function onPop(): void {
  if (ownBack) {
    ownBack = false;
    return;
  }
  if (!guarded) return;
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
  if (!guarded && wanted()) push();
}

/** Keeps the war room's history entry in step with the screen; returns the uninstaller. */
export function installBackButton(): () => void {
  window.addEventListener('popstate', onPop);
  const stop = effect(() => {
    const want = wanted();
    if (want && !guarded) push();
    else if (!want && guarded) {
      guarded = false;
      ownBack = true;
      history.back();
    }
  });
  return () => {
    window.removeEventListener('popstate', onPop);
    stop();
  };
}
