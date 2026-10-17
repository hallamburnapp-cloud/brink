/** The sheet's map controller, for hit testing, centres and the call's shift (the screens' pointer handlers read it). */
import type { PaperMap } from '../paper';

let current: PaperMap | null = null;

export function setMap(m: PaperMap | null): void {
  current = m;
}

export function getMap(): PaperMap | null {
  return current;
}
