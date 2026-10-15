/**
 * The war-room map: one canvas, 390 x 520 map points at devicePixelRatio.
 *
 *   const map = createMap(canvas, { reducedMotion, speed: 1 });
 *   map.update(view);                       // MapView from the engine's views; cheap, call freely
 *   map.hit(x, y);                          // map points -> RegionId | null
 *   map.fx.inkSpread(id, [id], 'gold');     // SPEC 8 effects; promises resolve when they finish
 *
 * The map draws state and plays effects; it never runs rules. contract.ts is the whole API; the
 * helpers below give the HUD the ring's geometry (a score flies into the ring) and the war tag's words.
 */
import type { CreateMap } from './contract';
import { createMapController } from './controller';

export const createMap: CreateMap = (canvas, opts) => createMapController(canvas, opts);

export { createMapController, realClock, type Clock, type ControllerDeps, type MapDevHooks } from './controller';
export { ringLayout, ringRadius, type RingLayout } from './layers/ring';
export { warTagText } from './layers/markers';
