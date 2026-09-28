/** Local best score (no names, no network). */
import type { RunState } from '../engine/types';
import { load, save } from './storage';

export interface BestScore {
  score: number;
  seat: string;
  seed: string;
  act: number;
  days: number;
  endless: boolean;
  at: number;
}

const KEY = 'brink.bestScore';

export function getBestScore(): BestScore | null {
  const b = load<BestScore | null>(KEY, null);
  return b && typeof b.score === 'number' ? b : null;
}

/** Records the run's score if it beats the best; returns true when it is a new record. */
export function recordScore(state: RunState): boolean {
  const best = getBestScore();
  if (best && best.score >= state.score) return false;
  save(KEY, { score: state.score, seat: state.seat, seed: state.seed, act: state.act, days: Math.floor(state.day), endless: state.endless, at: Date.now() } satisfies BestScore);
  return true;
}

export function formatScore(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
