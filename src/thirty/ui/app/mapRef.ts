/** The game screen's map controller, for the playback (it recolours the regions the day changed). */
import type { MapController } from '../map';

let current: MapController | null = null;

export function setMap(m: MapController | null): void {
  current = m;
}

export function getMap(): MapController | null {
  return current;
}
