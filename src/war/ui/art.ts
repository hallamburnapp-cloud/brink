/**
 * The one seam between the war-room HUD and the art modules built alongside it: the map renderer
 * and the icon set. Everything in the HUD imports drawing from here, so swapping either module is
 * a one-line change.
 */
export { createMap } from './map';
export type { MapControllerPlus, MapViewPlus, PinChipView } from './map';
export type { MapView, RegionId, Colour } from './map/contract';
export { StaffIcon, OrderIcon, PaperIcon, Coin, Glyph, BlocGlyph } from './icons';
export type { GlyphName } from './icons';
