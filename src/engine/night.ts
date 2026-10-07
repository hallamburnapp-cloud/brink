/**
 * The night: what the simple ruleset shows instead of days, acts and numbers.
 * 3:00am to 6:00am, seven minutes of the clock per card, dawn at the end.
 */
import type { Content, EndingKind, MeterKey, RunState } from './types';

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

// ------------------------------------------------------------------ the hotel

export const BAR_LABEL: Record<MeterKey, string> = { public: 'GUESTS', military: 'STAFF', allies: 'THE BUILDING', economy: 'MONEY', escalation: '' };
export const BARS: readonly Exclude<MeterKey, 'escalation'>[] = ['public', 'military', 'economy', 'allies'] as const;

/** Minutes of the clock the night has used: the sum of the played cards' `minutes` (default rules.night.minutes). */
export function elapsedMinutes(content: Content, state: Pick<RunState, 'history'>): number {
  let m = 0;
  for (const h of state.history) m += content.cards[h.card]?.minutes ?? content.night.minutes;
  return m;
}

/** The hotel's clock: 3:00 plus the minutes used; never pinned, 6:00 exactly when the last card is answered. */
export function shiftClock(content: Content, state: Pick<RunState, 'history'>): string {
  return formatClock(NIGHT_START_MIN + elapsedMinutes(content, state));
}

/**
 * Stars out of five for a night, from the four bars: a review band, not a score the player
 * sees as a number. Any bar on the floor is one star (a fall); otherwise the mean of the four.
 */
export function starsFor(state: Pick<RunState, 'meters'>): number {
  const m = state.meters;
  if (BARS.some((k) => m[k] <= 0)) return 1;
  const mean = BARS.reduce((n, k) => n + m[k], 0) / BARS.length;
  if (mean >= 78) return 5;
  if (mean >= 62) return 4;
  if (mean >= 46) return 3;
  if (mean >= 30) return 2;
  return 1;
}

/** "★★★★☆" for a review. */
export function starString(stars: number): string {
  const n = Math.max(0, Math.min(5, Math.round(stars)));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}


/** The bar that emptied, if one did. */
export function fallenBar(state: Pick<RunState, 'meters'>): Exclude<MeterKey, 'escalation'> | null {
  for (const k of BARS) if (state.meters[k] <= 0) return k;
  return null;
}

/** What the review is stamped with when a bar empties. */
export const FALL_STAMP: Record<Exclude<MeterKey, 'escalation'>, string> = {
  public: 'WALKOUT',
  military: 'STAFF WALKED',
  economy: 'CLOSED BY THE OWNER',
  allies: 'CLOSED BY THE FIRE BRIGADE',
};
