/**
 * The phone's back button (and the browser's back, and the edge swipe). While a game is on the
 * desk, or a sheet is open, the game keeps one history entry of its own, so back never drops a
 * game on the floor: it closes what is open (a sheet, a slip on the map), skips the explanation or
 * a playback, and otherwise opens the menu, from which QUIT TO TITLE goes home. On the bare title
 * back leaves as usual.
 *
 * The game never navigates the history itself: it only ever pushes its one entry. When nothing of
 * ours is open any more the entry is released, not popped (a history.back() of our own would race
 * the next push), and taken up again the next time it is wanted.
 */
import { effect } from '@preact/signals';
import { cancelAct, explainSkip, skipPlayback } from './actions';
import { backStep, guardStep } from './back';
import { armed, explain, lifted, play, screen, sheet } from './store';

export { backStep, guardStep, type BackStep } from './back';

let guarded = false;

function wanted(): boolean {
  return screen.value === 'game' || sheet.value !== null;
}

function onOurEntry(): boolean {
  try {
    return (history.state as { redlines?: string } | null)?.redlines === 'game';
  } catch {
    return false;
  }
}

function guard(): void {
  switch (guardStep({ want: wanted(), guarded, onOurEntry: onOurEntry() })) {
    case 'push':
      try {
        history.pushState({ redlines: 'game' }, '');
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
  switch (
    backStep({
      screen: screen.value,
      sheetOpen: sheet.value !== null,
      explaining: explain.value !== null,
      acting: armed.value !== null || lifted.value !== null,
      playing: play.value !== null,
    })
  ) {
    case 'close-sheet':
      sheet.value = null;
      break;
    case 'skip-explain':
      explainSkip();
      break;
    case 'skip-playback':
      skipPlayback();
      break;
    case 'cancel-act':
      cancelAct();
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
