/**
 * The night: what the simple ruleset shows instead of days, acts and numbers.
 * 3:00am to 6:00am, seven minutes of the clock per card, dawn at the end.
 */
import type { EndingKind, MeterKey, RunState } from './types';

export const NIGHT_START_MIN = 3 * 60;
export const NIGHT_END_MIN = 6 * 60;
export const MINUTES_PER_CARD = 7;

export const DIAL_LABEL: Record<MeterKey, string> = { public: 'PEOPLE', military: 'ARMY', allies: 'ALLIES', economy: 'MONEY', escalation: 'DANGER' };
export const DIAL_WORD: Record<MeterKey, string> = { public: 'the people', military: 'the army', allies: 'the allies', economy: 'the money', escalation: 'danger' };

/** Minutes since midnight for a card count, never past 5:59 while the night is on. */
export function clockMinutes(cardsPlayed: number): number {
  return Math.min(NIGHT_END_MIN - 1, NIGHT_START_MIN + Math.max(0, cardsPlayed) * MINUTES_PER_CARD);
}

export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function isDawn(kind: EndingKind | string | null | undefined): boolean {
  return kind === 'standdown' || kind === 'survival';
}

/** "3:35" while playing; "6:00" at dawn; the time of the fall otherwise. */
export function nightClock(state: Pick<RunState, 'cardsPlayed' | 'phase' | 'ending'>, kind?: EndingKind | string | null): string {
  if (state.phase === 'ended' && isDawn(kind)) return formatClock(NIGHT_END_MIN);
  return formatClock(clockMinutes(state.cardsPlayed));
}

/** Headline for the result: "DAWN" or "FELL AT 4:35". */
export function resultLine(state: Pick<RunState, 'cardsPlayed' | 'phase' | 'ending'>, kind?: EndingKind | string | null): string {
  return isDawn(kind) ? 'DAWN' : `FELL AT ${formatClock(clockMinutes(state.cardsPlayed))}`;
}

/** Emoji for the share head: dawn, the fall, or the end of the world. */
export function resultEmoji(kind?: EndingKind | string | null): string {
  if (isDawn(kind)) return '🌅';
  if (kind === 'nuclear') return '☢️';
  return '🌑';
}

/** Which dial did it: the meter that hit an edge, from the trail's last row. */
export function fallenDial(state: Pick<RunState, 'meters'>): MeterKey | null {
  const m = state.meters;
  if (m.escalation >= 100) return 'escalation';
  for (const k of ['public', 'military', 'allies', 'economy'] as const) if (m[k] <= 0 || m[k] >= 100) return k;
  return null;
}
