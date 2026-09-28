/**
 * Lifetime statistics, persisted across runs. Feeds the compendium, the
 * "favourite advisor" line on the stats screen and several meta unlocks.
 */
import type { Content, RunState } from '../engine/types';
import { load, remove, save } from './storage';

const KEY = 'brink.stats';

export interface Stats {
  runs: number;
  bestDays: number;
  totalDays: number;
  endingsSeen: Record<string, number>;
  kinds: Record<string, number>;
  piecesPicked: Record<string, number>;
  piecesOffered: Record<string, number>;
  /** Pieces held at the end of runs that ended nuclear or removed. */
  lossesWithPiece: Record<string, number>;
  seats: Record<string, number>;
  standdowns: number;
  timeouts: number;
  nearMisses: number;
  falseAlarms: number;
  lastPlayedAt: number;
}

export function emptyStats(): Stats {
  return {
    runs: 0,
    bestDays: 0,
    totalDays: 0,
    endingsSeen: {},
    kinds: {},
    piecesPicked: {},
    piecesOffered: {},
    lossesWithPiece: {},
    seats: {},
    standdowns: 0,
    timeouts: 0,
    nearMisses: 0,
    falseAlarms: 0,
    lastPlayedAt: 0,
  };
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function counts(v: unknown): Record<string, number> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
    const c = num(n);
    if (c > 0) out[k] = c;
  }
  return out;
}

/** Coerce whatever is in storage (possibly an older shape) into a full Stats. */
function normalise(raw: unknown): Stats {
  const s = emptyStats();
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Record<string, unknown>;
  s.runs = num(r.runs);
  s.bestDays = num(r.bestDays);
  s.totalDays = num(r.totalDays);
  s.endingsSeen = counts(r.endingsSeen);
  s.kinds = counts(r.kinds);
  s.piecesPicked = counts(r.piecesPicked);
  s.piecesOffered = counts(r.piecesOffered);
  s.lossesWithPiece = counts(r.lossesWithPiece);
  s.seats = counts(r.seats);
  s.standdowns = num(r.standdowns);
  s.timeouts = num(r.timeouts);
  s.nearMisses = num(r.nearMisses);
  s.falseAlarms = num(r.falseAlarms);
  s.lastPlayedAt = num(r.lastPlayedAt);
  return s;
}

function bump(rec: Record<string, number>, key: string, by = 1): void {
  rec[key] = (rec[key] ?? 0) + by;
}

export function getStats(): Stats {
  return normalise(load<unknown>(KEY, null));
}

export function saveStats(stats: Stats): boolean {
  return save(KEY, stats);
}

/**
 * Record a finished run. The engine does not persist offers, so the UI passes
 * the piece ids it saw offered during the run (or calls recordOffer as it goes).
 */
export function recordRun(state: RunState, content: Content, offeredIds: string[] = []): Stats {
  const s = getStats();
  const ending = state.ending ? content.endings[state.ending] : undefined;
  const kind = ending?.kind ?? (state.ending ? 'special' : 'abandoned');
  const days = Math.max(0, Math.floor(state.day));
  const starting = content.seats[state.seat]?.starting_pieces ?? [];
  const picked = state.pieces.filter((p) => !starting.includes(p));
  const lost = kind === 'nuclear' || kind === 'removed';

  s.runs++;
  s.totalDays += days;
  s.bestDays = Math.max(s.bestDays, days);
  if (state.ending) bump(s.endingsSeen, state.ending);
  bump(s.kinds, kind);
  for (const p of picked) bump(s.piecesPicked, p);
  if (lost) for (const p of picked) bump(s.lossesWithPiece, p);
  for (const id of offeredIds) bump(s.piecesOffered, id);
  bump(s.seats, state.seat);
  if (kind === 'standdown') s.standdowns++;
  s.timeouts += num(state.stats?.timeouts);
  s.nearMisses += num(state.stats?.nearMisses);
  s.falseAlarms += num(state.stats?.falseAlarms);
  s.lastPlayedAt = Date.now();
  saveStats(s);
  return s;
}

/** Called by the UI whenever a between-acts offer is shown. */
export function recordOffer(offer: string[]): Stats {
  const s = getStats();
  for (const id of offer) bump(s.piecesOffered, id);
  saveStats(s);
  return s;
}

function best(content: Content, pool: 'advisor' | 'doctrine' | 'asset', score: (id: string) => number | null): string | null {
  let bestId: string | null = null;
  let bestScore = -Infinity;
  for (const id of content.pieceOrder) {
    const piece = content.pieces[id];
    if (!piece || piece.pool !== pool) continue;
    const v = score(id);
    if (v === null || v <= bestScore) continue;
    bestScore = v;
    bestId = id;
  }
  return bestId ? content.pieces[bestId].name : null;
}

/** Display name of the most-picked advisor, or null if none has been picked. */
export function favouriteAdvisor(stats: Stats, content: Content): string | null {
  return best(content, 'advisor', (id) => {
    const n = stats.piecesPicked[id] ?? 0;
    return n > 0 ? n : null;
  });
}

/**
 * The doctrine most often held in runs that ended nuclear or removed,
 * normalised by how often it was picked (min 3 picks so one bad night doesn't count).
 */
export function mostFatalDoctrine(stats: Stats, content: Content, minPicks = 3): string | null {
  return best(content, 'doctrine', (id) => {
    const picks = stats.piecesPicked[id] ?? 0;
    const losses = stats.lossesWithPiece[id] ?? 0;
    if (picks < minPicks || losses === 0) return null;
    return losses / picks;
  });
}

export function __resetStatsForTests(): void {
  remove(KEY);
}
