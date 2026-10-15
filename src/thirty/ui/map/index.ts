/**
 * The map: one canvas, 390 x 400 map points at devicePixelRatio.
 *
 *   const map = createMap(canvas, { reducedMotion });
 *   map.update(view);                 // MapView: heats, today's ring, the targets, the home flag
 *   map.recolour(steps, 600);         // the day's heat changes, in order; resolves when settled
 *   map.hit(x, y);                    // map points -> RegionId | null (prefers the targets)
 *
 * The map draws state and plays the recolouring; it never runs rules. contract.ts is the whole API.
 */
import type { CreateMap } from './contract';
import { createMapController } from './controller';

export const createMap: CreateMap = (canvas, opts) => createMapController(canvas, opts);

export { createMapController, realClock, RECOLOUR_MS, type Clock, type ControllerDeps, type MapDevHooks } from './controller';
export type { CreateMapOptions, Heat, HeatStep, MapController, MapView, RegionId, Target } from './contract';
export { MAP_H, MAP_W, REGION, REGIONS } from './data';
export { ringRadius } from './layers/marks';
