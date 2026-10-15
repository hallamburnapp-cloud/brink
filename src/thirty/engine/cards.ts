/**
 * Small readings of a card the engine needs beyond the compiled types: today's card with its dealt
 * places, the warning flag, which risky options are talks, and the odds a card prints.
 */
import type { Card, ThirtyContent } from '../content/types.ts';
import type { GameState } from './types.ts';

/**
 * Today's card as the table shows it, or null when none is on it. A map card comes with the places
 * chosen when it was dealt (`state.card.targets`), so the UI, the preview and the choice read one card.
 */
export function todayCard(content: ThirtyContent, state: GameState): Card | null {
  if (!state.card) return null;
  const card = content.cards[state.card.id];
  if (!card) return null;
  if (card.map && state.card.targets) return { ...card, targets: state.card.targets };
  return card;
}

/**
 * A warning card (`alarm: true` in the content): the early-warning screens show something that may not be
 * real. On a warning card the RISKY "wait" holds exactly when the alarm is false.
 */
export function isAlarmCard(card: Card): boolean {
  return card.alarm;
}

/**
 * Ruling (CONTENT.md): a RISKY option is "talks", which the Dove Foreign Minister makes certain, when the
 * card's adviser is the Foreign Minister or the Old Ambassador.
 */
export function isTalks(card: Card): boolean {
  return card.adviser === 'foreign' || card.adviser === 'ambassador';
}

/** The odds printed on the card's RISKY option (left before right; a map card's first RISKY target), or null. */
export function riskyOdds(card: Card): number | null {
  if (card.map) {
    const t = card.targets.find((x) => x.tag === 'RISKY' && x.odds !== undefined);
    return t?.odds ?? null;
  }
  for (const side of ['left', 'right'] as const) {
    const c = card[side];
    if (c.tag === 'RISKY' && c.odds !== undefined) return c.odds;
  }
  return null;
}

/** The options the player has today: the two sides, or the target regions. */
export function optionsOf(card: Card): Array<'left' | 'right' | string> {
  return card.map ? card.targets.map((t) => t.region) : ['left', 'right'];
}
