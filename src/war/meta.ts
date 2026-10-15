/**
 * What the war-room build says about itself in the page head, the web manifest and link previews.
 * The product name is never written here: callers combine these lines with BRAND.name.
 * Imported by vite.config.ts at build time, so it must stay free of DOM and import.meta.env.
 */
export const WAR_META = {
  /** One line for the manifest, the search snippet's lead and the title screen. */
  tagline: 'Turn the whole world gold before war holds 10.',
  /** The page's meta description and link-preview text. */
  description:
    'Win the world: a short strategy game on a world map in a war room. Each turn a crisis flares; pin the regions ' +
    'around it, beat the target and the crisis turns gold for good. Miss, and war takes it. About 15 minutes a game.',
  /** The table colour: theme colour, manifest background and the letterbox. */
  themeColor: '#0B0F14',
} as const;
