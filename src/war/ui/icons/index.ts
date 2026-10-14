/**
 * The war room's iconography: staff objects, Order stamps, paper goods, the Funds coin and HUD glyphs.
 * All hand-drawn inline SVG (STYLE.md section 6), no text inside any icon, safe to repeat on a page.
 */
export { StaffIcon, STAFF_DRAWINGS, type StaffIconProps, type StaffId } from './staff';
export { OrderIcon, drawOrder, type OrderIconProps, type OrderId } from './orders';
export { PaperIcon, drawPaper, type PaperIconProps, type PaperKind } from './papers';
export { Coin, drawCoin } from './coin';
export { Glyph, BlocGlyph, GLYPH_NAMES, drawGlyph, type GlyphName, type GlyphProps, type BlocGlyphProps } from './glyphs';
export type { FrameProps } from './kit';
