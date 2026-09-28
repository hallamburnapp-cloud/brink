/** Runtime content access with hot reload in dev (the run in progress keeps going). */
import raw, { issues as rawIssues } from 'virtual:brink-content';
import type { Content } from '../engine/types';

export let content: Content = raw;
export let contentIssues = rawIssues;
const listeners = new Set<(c: Content) => void>();

export function onContentChange(fn: (c: Content) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    if (!mod) return;
    content = mod.default as Content;
    contentIssues = mod.issues;
    for (const fn of listeners) fn(content);
  });
}
