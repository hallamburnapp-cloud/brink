/**
 * The pattern ladder (spec section 3). Rungs run low to high; ties between candidates with the
 * same base product go to the higher rung. Values at level L are base + (L - 1) x gain.
 */

export type PatternId =
  | 'SINGLE'
  | 'LINK'
  | 'TWO_LINKS'
  | 'WORLDWIDE'
  | 'CHAIN'
  | 'FRONT'
  | 'SURROUND'
  | 'NETWORK'
  | 'BLOC'
  | 'WHOLE_BLOC'
  | 'AROUND_THE_WORLD';

export interface PatternDef {
  id: PatternId;
  /** Display name, as stamped on the readout. */
  name: string;
  /** Position on the ladder, 0 (SINGLE) to 10 (AROUND THE WORLD). */
  rung: number;
  baseInfluence: number;
  baseMomentum: number;
  influencePerLevel: number;
  momentumPerLevel: number;
  /** Shown as ??? in Run Info until made; its Playbook is offered only after that. */
  secret: boolean;
  /** The shape in a few plain words. */
  shape: string;
}

type Row = [PatternId, string, number, number, number, number, boolean, string];

const ROWS: Row[] = [
  ['SINGLE', 'SINGLE', 5, 1, 10, 1, false, 'No pins joined: your highest-numbered pin'],
  ['LINK', 'LINK', 10, 2, 15, 1, false, '2 joined pins'],
  ['TWO_LINKS', 'TWO LINKS', 20, 2, 20, 1, false, '2 separate joined pairs'],
  ['WORLDWIDE', 'WORLDWIDE', 30, 2, 25, 2, false, '5 pins, one of each colour'],
  ['CHAIN', 'CHAIN', 30, 3, 20, 2, false, '3 joined pins'],
  ['FRONT', 'FRONT', 45, 4, 25, 3, false, '4 joined pins'],
  ['SURROUND', 'SURROUND', 50, 5, 30, 3, false, 'Pins on every neighbour of one region'],
  ['NETWORK', 'NETWORK', 70, 6, 35, 3, false, '5 joined pins'],
  ['BLOC', 'BLOC', 90, 8, 40, 4, false, '5 pins of one colour'],
  ['WHOLE_BLOC', 'WHOLE BLOC', 140, 12, 50, 4, true, 'Every region left in one colour'],
  ['AROUND_THE_WORLD', 'AROUND THE WORLD', 180, 15, 50, 5, true, '5 joined pins, one of each colour'],
];

export const PATTERNS: readonly PatternDef[] = ROWS.map(([id, name, bI, bM, gI, gM, secret, shape], rung) => ({
  id,
  name,
  rung,
  baseInfluence: bI,
  baseMomentum: bM,
  influencePerLevel: gI,
  momentumPerLevel: gM,
  secret,
  shape,
}));

export const PATTERN: Readonly<Record<PatternId, PatternDef>> = Object.fromEntries(
  PATTERNS.map((p) => [p.id, p]),
) as Record<PatternId, PatternDef>;

export const PATTERN_IDS: readonly PatternId[] = PATTERNS.map((p) => p.id);
export const PUBLIC_PATTERNS: readonly PatternId[] = PATTERNS.filter((p) => !p.secret).map((p) => p.id);
export const SECRET_PATTERNS: readonly PatternId[] = PATTERNS.filter((p) => p.secret).map((p) => p.id);

/** Influence and Momentum (whole units) of a pattern at a level (1 = unlevelled). */
export function patternValues(id: PatternId, level: number): { influence: number; momentum: number } {
  const p = PATTERN[id];
  const up = Math.max(0, level - 1);
  return {
    influence: p.baseInfluence + up * p.influencePerLevel,
    momentum: p.baseMomentum + up * p.momentumPerLevel,
  };
}
