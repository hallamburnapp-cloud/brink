/**
 * From the title into a game without a blank desk. The title's card and dim sit over the same
 * sheet the game is drawn on, so when PLAY is tapped the new game's marks go down under the title
 * and the title lifts off (fades) once the sheet has drawn a frame. Reduced motion: at once.
 */
import { curtain, reduced } from './store';

export const CURTAIN_MS = 360;
/** Never hold the title longer than this, whatever the sheet is doing. */
const CAP_MS = 1200;

let token = 0;

/** The title lifts once the sheet under it has drawn (two frames), then is gone. */
export function liftTitle(onLifted: () => void): void {
  const mine = ++token;
  if (reduced.value || typeof requestAnimationFrame !== 'function') {
    curtain.value = null;
    onLifted();
    return;
  }
  curtain.value = 'lifting';
  let done = false;
  const finish = () => {
    if (done || token !== mine) return;
    done = true;
    curtain.value = null;
    onLifted();
  };
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(finish, CURTAIN_MS)));
  setTimeout(finish, CAP_MS);
}

/** Leaving for the title: no curtain in progress. */
export function dropCurtain(): void {
  token++;
  curtain.value = null;
}
