/**
 * From the title into the war room without a blank table. The war room's map bakes its glass on
 * its first frame, which takes a moment; until that frame is drawn the title stays up over it
 * (its own table still glowing), then fades away. The table is never a dark hole, and taps already
 * pass through to the war room underneath.
 */
import { signal } from '@preact/signals';
import { getMap } from '../table/mapRef';
import { reduced } from './store';

/** 'up': the title covers the war room while its table bakes; 'lifting': the title fades out. */
export type Curtain = 'up' | 'lifting' | null;
export const curtain = signal<Curtain>(null);

export const CURTAIN_FADE_MS = 260;
/** Lifting, the title's words go first; its table fades only once they are gone (war.css). */
export const TITLE_WORDS_MS = 110;

/** Leaving the war room: it fades to the table colour before the title comes up. */
export const veil = signal(false);
export const VEIL_MS = 200;
/** Never hold the title longer than this, whatever the map is doing. */
const CAP_MS = 1500;

let token = 0;
let waiting: Array<() => void> = [];

/** Keep the title over the war room until the table has drawn, then fade it away. */
export function raiseCurtain(): void {
  const mine = ++token;
  curtain.value = 'up';
  void tableDrawn().then(() => {
    if (token !== mine) return;
    // The CSS fade runs at its own pace (words, then the title's table), whatever the game speed.
    const fade = reduced.value ? 0 : TITLE_WORDS_MS + CURTAIN_FADE_MS;
    curtain.value = 'lifting';
    window.setTimeout(() => {
      if (token === mine) lift();
    }, fade);
  });
}

/** Leaving the war room: no curtain. */
export function dropCurtain(): void {
  token++;
  lift();
}

function lift(): void {
  curtain.value = null;
  const w = waiting;
  waiting = [];
  for (const f of w) f();
}

/** Resolves once the war room is in view (at once when no curtain is up). */
export function whenTableShown(): Promise<void> {
  if (curtain.value === null) return Promise.resolve();
  return new Promise((resolve) => waiting.push(resolve));
}

/** The table's map has drawn its first frame and the page has shown it (or the cap has passed). */
function tableDrawn(): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const done = () => requestAnimationFrame(() => resolve());
    const look = () => {
      // The map controller resolves ready() once its first full frame is drawn.
      const map = getMap();
      const left = CAP_MS - (performance.now() - t0);
      if (map || left <= 0) {
        const cap = window.setTimeout(done, Math.max(0, left));
        void map?.ready().then(() => {
          clearTimeout(cap);
          done();
        });
        return;
      }
      requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
}
