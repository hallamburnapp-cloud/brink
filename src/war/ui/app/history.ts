/**
 * The phone's back button (and the browser's back, and the edge swipe). While a night is on the
 * table, or a sheet is open, the war room keeps one history entry of its own, so back never drops
 * a run on the floor: it closes what is open (a sheet, a balloon, an armed Order) or asks whether to
 * quit the night. A finished night goes home. On the bare title, back leaves as usual. In the
 * native shells the hardware button walks the web view's history, so the same entry catches it.
 */
import { effect } from '@preact/signals';
import { skip } from '../director/play';
import { cancelOrder, quitToTitle } from './actions';
import { balloon, busy, run, screen, sheet } from './store';

/** What back does now. Returns false when it should leave (nothing of ours is open). */
export type BackStep = 'skip-and-ask' | 'close-sheet' | 'close-balloon' | 'cancel-order' | 'go-home' | 'ask-quit' | 'leave';

/** The step back takes from the current screen (pure, for tests). */
export function backStep(o: {
  screen: 'title' | 'game';
  sheetOpen: boolean;
  balloonOpen: boolean;
  armed: boolean;
  busy: boolean;
  over: boolean;
}): BackStep {
  if (o.sheetOpen) return 'close-sheet';
  if (o.screen !== 'game') return 'leave';
  if (o.busy) return 'skip-and-ask';
  if (o.balloonOpen) return 'close-balloon';
  if (o.armed) return 'cancel-order';
  if (o.over) return 'go-home';
  return 'ask-quit';
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
    history.pushState({ war: 'night' }, '');
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
  const s = run.value;
  const step = backStep({
    screen: screen.value,
    sheetOpen: sheet.value !== null,
    balloonOpen: balloon.value !== null,
    armed: !!s?.armed,
    busy: busy.value,
    over: !!s && (s.phase === 'missed' || s.phase === 'sliceEnd'),
  });
  switch (step) {
    case 'close-sheet':
      sheet.value = null;
      break;
    case 'skip-and-ask':
      skip();
      sheet.value = 'quit';
      break;
    case 'close-balloon':
      balloon.value = null;
      break;
    case 'cancel-order':
      cancelOrder();
      break;
    case 'go-home':
      quitToTitle();
      break;
    case 'ask-quit':
      sheet.value = 'quit';
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
