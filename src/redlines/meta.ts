/**
 * What the Red Lines build says about itself in the page head, the web manifest and link previews.
 * The product name is never written here: callers combine these lines with BRAND.name. Imported by
 * vite.config.ts at build time (the integrator's step), so it must stay free of DOM and import.meta.env;
 * the length of a game is the rules' own (RULES.weeks), read from the engine's pure rules module.
 */
import { RULES } from './engine/rules.ts';

const NUMBER = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
/** "Ten weeks", from the rules. */
const WEEKS = `${NUMBER[RULES.weeks] ?? RULES.weeks} weeks`;

export const REDLINES_META = {
  /** The title line under the name. */
  title: 'RED LINES',
  /** One line for the manifest, the search snippet's lead and the store. */
  tagline: `${WEEKS}. Promise what you can hold. Keep your word.`,
  /** The page's meta description and link-preview text. */
  description:
    'Red Lines: the Federation is pushing. You lead the Republic. Each week, promise to defend what you can hold, ' +
    'move your fleet and your brigade, and keep your word when they test you. Give them a way to stop and they sign. ' +
    `${WEEKS}, about twelve minutes a game.`,
  /** The desk colour: theme colour, manifest background and the letterbox around the paper. */
  themeColor: '#1a1410',
} as const;
