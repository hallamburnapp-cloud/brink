/**
 * What the war-room build says about itself in the page head, the web manifest and link previews.
 * The product name is never written here: callers combine these lines with BRAND.name.
 * Imported by vite.config.ts at build time, so it must stay free of DOM and import.meta.env.
 */
export const WAR_META = {
  /** One line for the manifest and the search snippet's lead. */
  tagline: 'Hold the world together until 01:00.',
  /** The page's meta description and link-preview text. */
  description:
    'A war-room roguelike. Each crisis lights eight regions of the map: pin the shape that holds them, ' +
    'seat your staff, and hold until 01:00: three hours, nine crises.',
  /** The table colour: theme colour, manifest background and the letterbox. */
  themeColor: '#0B0F14',
} as const;
