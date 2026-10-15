/**
 * The war room's iconography: the staff objects, the coin and the HUD glyphs.
 * All hand-drawn inline SVG (STYLE.md section 6), no text inside any icon, safe to repeat on a page.
 */
export { StaffIcon, STAFF_DRAWINGS, type StaffIconProps, type StaffId } from './staff';
export { Coin, drawCoin } from './coin';
export { Glyph, BlocGlyph, GLYPH_NAMES, drawGlyph, type GlyphName, type GlyphProps, type BlocGlyphProps } from './glyphs';
export type { FrameProps } from './kit';
