/**
 * What the THIRTY DAYS build says about itself in the page head, the web manifest and link
 * previews. The product name is never written here: callers combine these lines with BRAND.name.
 * Imported by vite.config.ts at build time, so it must stay free of DOM and import.meta.env.
 */
export const THIRTY_META = {
  /** The title line under the name. */
  title: 'THIRTY DAYS',
  /** One line for the manifest, the search snippet's lead and the store. */
  tagline: 'Thirty days to stop a war. One decision a day.',
  /** The page's meta description and link-preview text. */
  description:
    'Thirty Days: you lead a great power as the world slides towards war. Each day one message, two choices, ' +
    'sometimes a tap on the map. Keep DANGER below 100 for thirty days, or calm the whole world and end it early. ' +
    'About fifteen minutes a game.',
  /** The table colour: theme colour, manifest background and the letterbox. */
  themeColor: '#0B1220',
} as const;
