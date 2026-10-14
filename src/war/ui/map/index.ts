/**
 * The war-room map: one canvas, 390 x 520 map points at devicePixelRatio (spec section 1).
 *
 *   const map = createMap(canvas, { reducedMotion, speed: 1 });
 *   map.update(view);                       // MapView from the engine's views; cheap, call freely
 *   map.hit(x, y);                          // map points -> RegionId | null
 *   map.fx.dimExcept(scoringSet); ...       // spec 9 effects; promises resolve when they finish
 *
 * The map draws state and plays effects; it never runs rules. Optional extras (sweep-order badges
 * while choosing, loose pins, the Surround ring, the LAY CABLE drag line, a custom thread pop) are
 * in extensions.ts: pass a MapViewPlus to update() and they appear.
 */
import type { CreateMap } from './contract';
import { createMapController } from './controller';

export const createMap: CreateMap = (canvas, opts) => createMapController(canvas, opts);

export { createMapController, realClock, type Clock, type ControllerDeps, type MapDevHooks } from './controller';
export type { MapControllerPlus, MapViewExtras, MapViewPlus } from './extensions';
export { RING_COOLED, ringRadius } from './layers/overlays';
