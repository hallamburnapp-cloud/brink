/**
 * The phone's back button (and the browser's back, and the edge swipe). While a game is on the
 * table, or a sheet is open, the game keeps one history entry of its own, so back never drops a
 * game on the floor: it closes what is open (a sheet, a chip's rule) and otherwise opens the menu,
 * from which QUIT TO TITLE goes home. During the explanation it skips the explanation. On the bare
 * title back leaves as usual.
 *
 * The game never navigates the history itself: it only ever pushes its one entry. When nothing of
 * ours is open any more the entry is released, not popped (a history.back() of our own would race
 * the next push), and taken up again the next time it is wanted.
 */
import { effect } from '@preact/signals';
import { explainSkip } from './actions';
import { backStep, guardStep } from './back';
import { chipOpen, explain, screen, sheet } from './store';

export { backStep, guardStep, type BackStep } from './back';

let guarded = false;

function wanted(): boolean {
  return screen.value === 'game' || sheet.value !== null;
}

function onOurEntry(): boolean {
  try {
    return (history.state as { thirty?: string } | null)?.thirty === 'game';
  } catch {
    return false;
  }
}

function guard(): void {
  switch (guardStep({ want: wanted(), guarded, onOurEntry: onOurEntry() })) {
    case 'push':
      try {
        history.pushState({ thirty: 'game' }, '');
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
  if (!guarded) return;
  if (onOurEntry()) return;
  guarded = false;
  switch (backStep({ screen: screen.value, sheetOpen: sheet.value !== null, explaining: explain.value !== null, chipOpen: chipOpen.value !== null })) {
    case 'close-sheet':
      sheet.value = null;
      break;
    case 'skip-explain':
      explainSkip();
      break;
    case 'close-chip':
      chipOpen.value = null;
      break;
    case 'menu':
      sheet.value = 'menu';
      break;
    case 'leave':
      return;
  }
  guard();
}

/** Keeps the game's history entry in step with the screen; returns the uninstaller. */
export function installBackButton(): () => void {
  window.addEventListener('popstate', onPop);
  const stop = effect(() => guard());
  return () => {
    window.removeEventListener('popstate', onPop);
    stop();
  };
}
