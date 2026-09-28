/**
 * The endings compendium: every authored ending (fallbacks excluded), with how
 * often the player has reached it, drawn from lifetime stats.
 */
import type { Content, EndingDef, EndingKind } from '../engine/types';
import { getStats, saveStats, type Stats } from './stats';

export interface CompendiumEntry {
  id: string;
  ending: EndingDef;
  seen: number;
}

export interface Compendium {
  total: number;
  seen: number;
  percent: number;
  entries: CompendiumEntry[];
}

/** Display order of ending kinds (matches the EndingKind declaration order). */
export const KIND_ORDER: readonly EndingKind[] = ['nuclear', 'removed', 'standdown', 'survival', 'special'];

function kindRank(kind: EndingKind): number {
  const i = KIND_ORDER.indexOf(kind);
  return i < 0 ? KIND_ORDER.length : i;
}

export function compendium(content: Content, stats: Stats = getStats()): Compendium {
  const entries: CompendiumEntry[] = [];
  for (const id of content.endingOrder) {
    if (id.startsWith('fallback_')) continue;
    const ending = content.endings[id];
    if (!ending) continue;
    entries.push({ id, ending, seen: stats.endingsSeen[id] ?? 0 });
  }
  entries.sort((a, b) => {
    const k = kindRank(a.ending.kind) - kindRank(b.ending.kind);
    if (k !== 0) return k;
    return a.ending.name.localeCompare(b.ending.name) || a.id.localeCompare(b.id);
  });
  const total = entries.length;
  const seen = entries.filter((e) => e.seen > 0).length;
  const percent = total === 0 ? 0 : Math.round((seen / total) * 100);
  return { total, seen, percent, entries };
}

/**
 * Count an ending as seen without recording a whole run. `recordRun` already
 * does this for the run's ending, so only call this for out-of-run reveals.
 */
export function markSeen(endingId: string): Stats {
  const s = getStats();
  s.endingsSeen[endingId] = (s.endingsSeen[endingId] ?? 0) + 1;
  saveStats(s);
  return s;
}
