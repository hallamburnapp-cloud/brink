/** Runtime content access with hot reload in dev (the run in progress keeps going). */
import raw, { issues as rawIssues } from 'virtual:thirty-content';
import type { ContentIssue, ThirtyContent } from './types.ts';

export type * from './types.ts';

export let content: ThirtyContent = raw;
export let contentIssues: ContentIssue[] = rawIssues;
const listeners = new Set<(c: ThirtyContent) => void>();

/** Called with the new pack after a YAML edit in dev; the unsubscribe is returned. */
export function onThirtyContentChange(fn: (c: ThirtyContent) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    // A reload whose compile failed (a YAML file mid-edit) carries no content; keep the last good one.
    if (!mod || !mod.default) return;
    content = mod.default as ThirtyContent;
    contentIssues = mod.issues as ContentIssue[];
    for (const fn of listeners) fn(content);
  });
}
