/** Runtime content access with hot reload in dev (the game in progress keeps going). */
import raw, { issues as rawIssues } from 'virtual:redlines-content';
import type { ContentIssue, RedlinesPack } from './types.ts';

export type * from './types.ts';
export { fill, isFilled, missingSlots, numberWord, pick, slotsOf } from './fill.ts';
export { BLOC_NAMES, BLOC_TITLES, CAP_BLOC, FED_CAPITAL, HOME_BLOC, HOME_CAPITAL, REGION_IDS, REGION_INFO, REGION_INFOS, blocOf, isRegionId, regionName, regionsOf } from './regions.ts';

export let content: RedlinesPack = raw;
export let contentIssues: ContentIssue[] = rawIssues;
const listeners = new Set<(c: RedlinesPack) => void>();

/** Called with the new pack after a YAML edit in dev; the unsubscribe is returned. */
export function onRedlinesContentChange(fn: (c: RedlinesPack) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    // A reload whose compile failed (a YAML file mid-edit) carries no content; keep the last good one.
    if (!mod || !mod.default) return;
    content = mod.default as RedlinesPack;
    contentIssues = mod.issues as ContentIssue[];
    for (const fn of listeners) fn(content);
  });
}
