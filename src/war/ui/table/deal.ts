/**
 * The deal light-up (SPEC 5, DEAL 1.2 s): the crisis and its lit regions come on one by one, each
 * with a soft tick a step higher than the last. A new game's first deal waits, dark, until the title
 * has lifted off the table, so the player sees every region light.
 */
import { audio } from '../../../audio';
import type { MapController, RegionId } from '../art';
import { curtain, whenTableShown } from '../app/curtain';
import { reduced, speed } from '../app/store';
import { getMap } from './mapRef';

/** 11 regions in about 1.2 s. */
export const DEAL_GAP_MS = 110;
/** Longer than the curtain can ever stay up: the regions wait dark until it lifts. */
const CURTAIN_HOLD_MS = 10_000;

export function dealIn(map: MapController, ids: RegionId[]): void {
  if (reduced.value) {
    audio.play('tick', { intensity: 0.2 });
    return;
  }
  if (curtain.value !== null) {
    map.lightUp(ids, 0, CURTAIN_HOLD_MS);
    void whenTableShown().then(() => {
      if (getMap() === map) dealIn(map, ids);
    });
    return;
  }
  map.lightUp(ids, DEAL_GAP_MS);
  const gap = DEAL_GAP_MS / speed.value;
  ids.forEach((_, i) => window.setTimeout(() => audio.play('tick', { intensity: Math.min(0.6, 0.15 + 0.04 * i) }), i * gap));
}
