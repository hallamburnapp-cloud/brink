/**
 * Small readings of a card the engine needs beyond the compiled types: the warning flag the
 * false-alarm arcs carry, and the odds a warning card's "wait" prints.
 */
import type { Card } from '../content/types.ts';

/**
 * A warning card: the early-warning screens show something that may not be real. Authored as
 * `alarm: true` on the card (an optional field the content schema is asked to carry; until it does,
 * KNOWN_ALARMS names the pack's warning). On a warning card the RISKY "wait" holds exactly when the
 * alarm is false.
 */
export function isAlarmCard(card: Card): boolean {
  return (card as Card & { alarm?: boolean }).alarm === true || KNOWN_ALARMS.has(card.id);
}

/**
 * Until the schema carries `alarm: true`, the pack's one warning card by id (CONTENT.md "What the engine
 * must know": alarm-02 is the false alarm). Goes away when the field lands.
 */
export const KNOWN_ALARMS: ReadonlySet<string> = new Set(['alarm-02']);

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
